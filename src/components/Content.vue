<!--
  - Open Bank Project -  API Explorer II
  - Copyright (C) 2023-2024, TESOBE GmbH
  -
  - This program is free software: you can redistribute it and/or modify
  - it under the terms of the GNU Affero General Public License as published by
  - the Free Software Foundation, either version 3 of the License, or
  - (at your option) any later version.
  -
  - This program is distributed in the hope that it will be useful,
  - but WITHOUT ANY WARRANTY; without even the implied warranty of
  - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  - GNU Affero General Public License for more details.
  -
  - You should have received a copy of the GNU Affero General Public License
  - along with this program.  If not, see <http://www.gnu.org/licenses/>.
  -
  - Email: contact@tesobe.com
  - TESOBE GmbH
  - Osloerstrasse 16/17
  - Berlin 13359, Germany
  -
  -   This product includes software developed at
  -   TESOBE (http://www.tesobe.com/)
  -
  -->

<script setup lang="ts">
import { obpMyCollectionsEndpointKey, obpResourceDocsKey } from '@/obp/keys'
import { ArrowLeftBold, ArrowRightBold } from '@element-plus/icons-vue'
import { ElNotification } from 'element-plus'
import { inject, onMounted, provide, ref } from 'vue'
import { onBeforeRouteUpdate, useRoute } from 'vue-router'
import {
OBP_API_VERSION,
createMyAPICollection,
createMyAPICollectionEndpoint,
deleteMyAPICollectionEndpoint,
getCurrentUser
} from '../obp'
import { getOperationDetails } from '../obp/resource-docs'
import { SUMMARY_PAGER_LINKS_COLOR as summaryPagerLinksColorSetting } from '../obp/style-setting'
import { initializeAPICollections, setTabActive } from './SearchNav.vue'

const route = useRoute()
const obpVersion = 'OBP' + OBP_API_VERSION
const description = ref('')
const summary = ref('')
const resourceDocs = inject(obpResourceDocsKey)
const displayPrev = ref(true)
const displayNext = ref(true)
const prev = ref({ id: 'prev' })
const next = ref({ id: 'next' })
const favoriteButtonStyle = ref('favorite favoriteButton')
const summaryPagerLinksColor = ref(summaryPagerLinksColorSetting)
let routeId = ''
let version = obpVersion
let isFavorite = false
let apiCollectionsEndpoint = inject(obpMyCollectionsEndpointKey)!

const setOperationDetails = (id: string, version: string): void => {
  const operation = getOperationDetails(version, id, resourceDocs)
  description.value = operation?.description
  summary.value = operation?.summary
}

const setPager = (id: string): void => {
  const target = document.getElementById(id)?.parentElement
  if (target) {
    const prevElement = target.previousSibling
    const nextElement = target.nextSibling
    const active = document.querySelector('.active-api-router-tab')
    if (active) active.classList.remove('active-api-router-tab')
    target.classList.add('active-api-router-tab')
    if (prevElement.className && prevElement.className.startsWith('api-router-tab')) {
      const prevItem = prevElement.children.item(0)
      prev.value['title'] = prevItem.text
      prev.value['id'] = prevItem.id
      prev.value['version'] = version
      displayPrev.value = true
    } else {
      displayPrev.value = false
    }
    if (nextElement.className && nextElement.className.startsWith('api-router-tab')) {
      const nextItem = nextElement.children.item(0)
      next.value['title'] = nextItem.text
      next.value['id'] = nextItem.id
      next.value['version'] = version
      displayNext.value = true
    } else {
      displayNext.value = false
    }
  }
}

const tagFavoriteButton = async (routeId: string): void => {
  favoriteButtonStyle.value = 'favorite favoriteButton'
  if (apiCollectionsEndpoint) {
    isFavorite = apiCollectionsEndpoint.includes(routeId)
    if (isFavorite) {
      favoriteButtonStyle.value = 'favorite activeFavoriteButton'
      isFavorite = true
    }
  }
}

const createDeleteFavorite = async (): void => {
  const currentUser = await getCurrentUser()
  if (!Object.keys(currentUser).includes('username')) {
    showNotification('User not logged in.', 'error')
    return
  }
  if (!apiCollectionsEndpoint) {
    createMyAPICollection()
    apiCollectionsEndpoint = []
  }
  if (isFavorite) { // Add the API endpoint to favorite
    const response = await deleteMyAPICollectionEndpoint(routeId)
    favoriteButtonStyle.value = 'favorite favoriteButton'
    if (response) { // Success response returns <empty string>
      showNotification(response, 'error')
    }
    isFavorite = false
    apiCollectionsEndpoint = apiCollectionsEndpoint.filter((api) => api != routeId)
  } else { // Remove the API endpoint from favorite
    const response = await createMyAPICollectionEndpoint(routeId)
    favoriteButtonStyle.value = 'favorite activeFavoriteButton'
    isFavorite = true
    apiCollectionsEndpoint.push(routeId)
  }
  provide(obpMyCollectionsEndpointKey, apiCollectionsEndpoint)
  await initializeAPICollections()
  setTabActive(routeId)
}

const showNotification = (message: string, type: string): void => {
  ElNotification({
    duration: 5500,
    message,
    type
  })
}

onMounted(async () => {
  routeId = route.params.id
  version = route.query.version ? route.query.version : obpVersion
  setOperationDetails(routeId, version)
  setPager(routeId)
  await tagFavoriteButton(routeId)
})
onBeforeRouteUpdate(async (to) => {
  routeId = to.params.id
  version = route.query.version ? route.query.version : obpVersion
  setOperationDetails(routeId, version)
  setPager(routeId)
  await tagFavoriteButton(routeId)
})
</script>

<template>
  <main>
    <el-container>
      <el-main>
        <el-row>
          <el-col :span="22">
            <span>{{ summary }}</span>
          </el-col>
          <el-col :span="2">
            <span :class="favoriteButtonStyle" @click="createDeleteFavorite()">★</span>
            <!--<el-button text>★</el-button>-->
          </el-col>
        </el-row>
        <div v-html="description" class="content"></div>
      </el-main>
      <el-footer class="footer">
        <el-divider class="divider" />
        <el-row>
          <el-col :span="12" class="pager-left">
            <el-icon v-show="displayPrev">
              <ArrowLeftBold />
            </el-icon>
            <RouterLink v-show="displayPrev" class="pager-router-link"
              :to="{ name: 'api', params: { id: prev.id }, query: { version: prev.version } }">{{ prev.title }}
            </RouterLink>
          </el-col>
          <el-col :span="12" class="pager-right">
            <RouterLink v-show="displayNext" class="pager-router-link"
              :to="{ name: 'api', params: { id: next.id }, query: { version: next.version } }">{{ next.title }}
            </RouterLink>
            <el-icon v-show="displayNext">
              <ArrowRightBold />
            </el-icon>
          </el-col>
        </el-row>
      </el-footer>
    </el-container>
  </main>
</template>

<style scoped>
main {
  margin: 25px;
  color: #39455f;
  font-family: 'Roboto';
}

span {
  font-size: 28px;
}

div {
  font-size: 14px;
}

.content :deep(strong) {
  font-family: 'Roboto';
}

.content :deep(p a) {
  line-height: 28px;
  padding: 5px;
  margin: 3px;
  color: #39455f;
  font-family: 'Roboto';
  font-size: 14px;
  text-decoration: none;
  border-radius: 5px;
  background-color: #eef0f4;
}

.pager {
  position: absolute;
  bottom: 0;
}

.pager-left {
  display: flex;
  justify-content: left;
  align-items: center;
}

.pager-right {
  display: flex;
  justify-content: right;
  align-items: center;
}

.footer {
  max-height: 30px;
}

.divider {
  margin-top: -15px;
}

.pager-router-link {
  font-family: 'Roboto';
  text-decoration: none;
  color: #39455f;
}

.pager-router-link:hover,
.pager-left:hover,
.pager-right:hover {
  color: v-bind(summaryPagerLinksColor);
}

.favorite {
  cursor: pointer;
  line-height: 1;
}</style>
