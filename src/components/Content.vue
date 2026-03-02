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
import { onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import {
OBP_API_DEFAULT_RESOURCE_DOC_VERSION,
createMyAPICollection,
createMyAPICollectionEndpoint,
deleteMyAPICollectionEndpoint,
getCurrentUser
} from '../obp'
import { getOperationDetails } from '../obp/resource-docs'
import { SUMMARY_PAGER_LINKS_COLOR as summaryPagerLinksColorSetting } from '../obp/style-setting'
import { initializeAPICollections, setTabActive } from './SearchNav.vue'

const route = useRoute()
const router = useRouter()
const obpVersion = OBP_API_DEFAULT_RESOURCE_DOC_VERSION
const description = ref('')
const summary = ref('')
const tags = ref<string[]>([])
const allTags = ref<string[]>([])
const resourceDocs = inject(obpResourceDocsKey)
const displayPrev = ref(false)
const displayNext = ref(false)
const prev = ref({ id: 'prev' })
const next = ref({ id: 'next' })
const favoriteButtonStyle = ref('favorite favoriteButton')
const summaryPagerLinksColor = ref(summaryPagerLinksColorSetting)
const showPlaceholder = ref(false)
const placeholderVersion = ref('')
const totalEndpoints = ref(0)
let routeId = ''
let version = obpVersion
let isFavorite = false
let apiCollectionsEndpoint = inject(obpMyCollectionsEndpointKey)!

const setOperationDetails = (id: string, version: string): void => {
  const operation = getOperationDetails(version, id, resourceDocs)
  console.log('Operation details:', operation)
  console.log('Tags from operation:', operation?.tags)
  description.value = operation?.description
  summary.value = operation?.summary
  tags.value = operation?.tags || []
  console.log('Tags ref value:', tags.value)
  updateHeaderTags(tags.value)
}

const updateHeaderTags = (tagsList: string[]) => {
  const element = document.getElementById('selected-endpoint-tags')
  if (element) {
    if (tagsList.length > 0) {
      const tagsHTML = tagsList.map(tag =>
        `<a class="tag-link" data-tag="${tag}" href="#">${tag}</a>`
      ).join(', ')
      element.innerHTML = `Tags: ${tagsHTML}`

      // Add click handlers to the tags
      element.querySelectorAll('.tag-link').forEach((tagElement) => {
        tagElement.addEventListener('click', (e) => {
          e.preventDefault()
          const tag = (e.target as HTMLElement).getAttribute('data-tag')
          if (tag) {
            filterByTag(tag)
          }
        })
      })
    } else {
      element.innerHTML = ''
    }
  }
}

const clearHeaderTags = () => {
  const element = document.getElementById('selected-endpoint-tags')
  if (element) {
    element.innerHTML = ''
  }
}

const filterByTag = (tag: string) => {
  router.push({
    name: 'api',
    params: { version: version },
    query: { tags: tag }
  })
}

const clearTagFilter = () => {
  router.push({
    name: 'api',
    params: { version: version }
  })
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

const getAllTags = (version: string) => {
  const docs = resourceDocs[version]?.resource_docs || []
  const tagSet = new Set<string>()
  docs.forEach((doc: any) => {
    if (doc.tags && Array.isArray(doc.tags)) {
      doc.tags.forEach((tag: string) => tagSet.add(tag))
    }
  })
  return Array.from(tagSet).sort()
}

onMounted(async () => {
  routeId = route.query.operationid
  version = route.params.version ? route.params.version : obpVersion

  if (!routeId) {
    // No operation selected, show placeholder
    showPlaceholder.value = true
    placeholderVersion.value = version
    totalEndpoints.value = resourceDocs[version]?.resource_docs?.length || 0
    allTags.value = getAllTags(version)
    clearHeaderTags()
  } else {
    showPlaceholder.value = false
    setOperationDetails(routeId, version)
    setPager(routeId)
    await tagFavoriteButton(routeId)
  }
})
onBeforeRouteUpdate(async (to) => {
  routeId = to.query.operationid
  version = to.params.version ? to.params.version : obpVersion

  if (!routeId) {
    // Version changed but no endpoint selected
    showPlaceholder.value = true
    placeholderVersion.value = version
    totalEndpoints.value = resourceDocs[version]?.resource_docs?.length || 0
    allTags.value = getAllTags(version)
    clearHeaderTags()
  } else {
    showPlaceholder.value = false
    setOperationDetails(routeId, version)
    setPager(routeId)
    await tagFavoriteButton(routeId)
  }
})
</script>

<template>
  <main>
    <el-container>
      <el-main>
        <div v-if="showPlaceholder" class="placeholder-message">
          <div class="version-header">
            <h1>{{ placeholderVersion }}</h1>
            <p class="version-subtitle">API Documentation</p>
          </div>
          <p class="version-info">There are {{ totalEndpoints }} endpoints available in this version.</p>
          <p class="version-instructions">Please click an endpoint on the left or browse by tags below.</p>

          <div v-if="allTags.length > 0" class="placeholder-tags">
            <h3>Filter by Tag:</h3>
            <div class="tags-grid">
              <a
                class="tag-link tag-link-all"
                :class="{ 'tag-link-active': route.query.tags === undefined || route.query.tags === 'NONE' }"
                @click.prevent="clearTagFilter()"
              >
                All
              </a>
              <a
                v-for="tag in allTags"
                :key="tag"
                class="tag-link"
                :class="{ 'tag-link-active': route.query.tags === tag }"
                @click.prevent="filterByTag(tag)"
              >
                {{ tag }}
              </a>
            </div>
          </div>
        </div>
        <div v-else>
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
          <div class="tags-section">
            <span class="tags-label">Tags:</span>
            <a
              v-if="route.query.tags"
              class="tag-link tag-link-all"
              @click.prevent="clearTagFilter()"
            >
              All
            </a>
            <a
              v-for="tag in tags"
              :key="tag"
              class="tag-link"
              :class="{ 'tag-link-active': route.query.tags === tag }"
              @click.prevent="filterByTag(tag)"
            >
              {{ tag }}
            </a>
            <span v-if="tags.length === 0" style="color: #909399; font-size: 12px;">No tags available</span>
          </div>
        </div>
      </el-main>
      <el-footer class="footer" v-if="!showPlaceholder">
        <el-divider class="divider" />
        <el-row>
          <el-col :span="12" class="pager-left">
            <el-icon v-if="displayPrev">
              <ArrowLeftBold />
            </el-icon>
            <RouterLink v-if="displayPrev" class="pager-router-link"
              :to="{ name: 'api', params: { version: prev.version }, query: { operationid: prev.id } }">{{ prev.title }}
            </RouterLink>
          </el-col>
          <el-col :span="12" class="pager-right">
            <RouterLink v-if="displayNext" class="pager-router-link"
              :to="{ name: 'api', params: { version: next.version }, query: { operationid: next.id } }">{{ next.title }}
            </RouterLink>
            <el-icon v-if="displayNext">
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

.tags-section {
  margin: 15px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tags-label {
  font-size: 14px !important;
  font-weight: 600;
  color: #606266;
}

.tag-link {
  display: inline-block;
  padding: 4px 12px;
  font-size: 12px !important;
  color: #409eff;
  background-color: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.tag-link:hover {
  background-color: #409eff;
  color: white;
  border-color: #409eff;
}

.tag-link-all {
  background-color: #67c23a;
  border-color: #b3e19d;
  color: white;
  font-weight: 600;
}

.tag-link-all:hover {
  background-color: #85ce61;
  border-color: #85ce61;
}

.tag-link-active {
  background-color: #409eff;
  color: white;
  border-color: #409eff;
  font-weight: 600;
}

.tag-link-all.tag-link-active {
  background-color: #67c23a;
  border-color: #67c23a;
}

.placeholder-message {
  padding: 0;
  color: #606266;
}

.version-header {
  padding: 20px 0;
  border-bottom: 2px solid #e4e7ed;
  margin-bottom: 20px;
}

.version-header h1 {
  font-size: 1.75rem;
  font-weight: 600;
  color: #303133;
  margin: 0 0 0.5rem 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.version-subtitle {
  font-size: 1rem;
  color: #909399;
  margin: 0;
}

.version-info {
  font-size: 16px;
  margin: 20px 0 10px 0;
  line-height: 1.6;
  color: #606266;
}

.version-instructions {
  font-size: 16px;
  margin: 10px 0 20px 0;
  line-height: 1.6;
  color: #606266;
}

.placeholder-tags {
  margin-top: 30px;
  text-align: left;
}

.placeholder-tags h3 {
  font-size: 18px;
  margin-bottom: 20px;
  color: #39455f;
}

.tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-start;
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
