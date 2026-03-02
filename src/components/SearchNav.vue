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

<script lang="ts">
import { nextTick } from 'vue'
import { obpResourceDocsKey } from '@/obp/keys'
import { Search } from '@element-plus/icons-vue'
import { inject, onBeforeMount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { OBP_API_DEFAULT_RESOURCE_DOC_VERSION, getMyAPICollections, getMyAPICollectionsEndpoint } from '../obp'
import { getGroupedResourceDocs, getFilteredGroupedResourceDocs } from '../obp/resource-docs'
import { SEARCH_LINKS_COLOR as searchLinksColorSetting } from '../obp/style-setting'
const operationIdTitle = {}
const resourceDocs = ref({})
const docs = ref({})
const groups = ref({})
const sortedKeys = ref([])
const activeKeys = ref([])
const showMyCollections = ref(false)
const form = reactive({
  search: ''
})
const apiCollections = ref({})
const apiCollectionsEndpointMapping = ref({})
const apiCollectionsEndpoint = ref({})
const searchLinksColor = ref(searchLinksColorSetting)

const clearActiveTab = () => {
  const activeTabs = document.querySelectorAll('.active-api-router-tab')
  activeTabs.forEach((tab) => {
    tab.classList.remove('active-api-router-tab')
  })
}

export const setTabActive = (id) => {
  const tabs = document.querySelectorAll('.api-router-link')
  clearActiveTab()
  tabs.forEach((tab) => {
    if (tab.id === id) {
      tab.parentElement.classList.add('active-api-router-tab')
    }
  })
}

export const initializeAPICollections = async () => {
  apiCollections.value = (await getMyAPICollections()).api_collections
  if (apiCollections.value) {
    showMyCollections.value = true
    for (const { api_collection_name } of apiCollections.value) {
      apiCollectionsEndpoint.value[api_collection_name] = (
        await getMyAPICollectionsEndpoint(api_collection_name)
      ).api_collection_endpoints.map((api) => api.operation_id)
    }
  }
}
</script>

<script setup lang="ts">
const route = useRoute()
let selectedVersion = route.params.version ? route.params.version : `${OBP_API_DEFAULT_RESOURCE_DOC_VERSION}`
let selectedTags = route.query.tags ? route.query.tags : 'NONE'
onBeforeMount(async () => {
  resourceDocs.value = inject(obpResourceDocsKey)!
  if(selectedTags === 'NONE') {
    docs.value = getGroupedResourceDocs(selectedVersion, resourceDocs.value)
  } else {
    docs.value = getFilteredGroupedResourceDocs(selectedVersion, selectedTags, resourceDocs.value)
  }
  groups.value = JSON.parse(JSON.stringify(docs.value))
  activeKeys.value = Object.keys(groups.value)
  sortedKeys.value = activeKeys.value.sort()
  await initializeAPICollections()
  setTabActive(route.query.operationid)
  let element = document.getElementById("selected-api-version")
  if (element !== null) {
    const totalRows = Object.values(groups.value).reduce((acc, currentValue) => acc + currentValue.length, 0)
    if(selectedTags === 'NONE') {
      element.textContent = `${selectedVersion} ( ${totalRows} APIs )`;
    } else {
      element.innerHTML = `${selectedVersion} ( ${totalRows} APIs filtered by tags: <a href="#" class="filter-tag-link" style="color: #409eff; text-decoration: none; cursor: pointer; transition: color 0.2s ease;">${selectedTags}</a>)`;

      // Add hover effect
      const tagLinkEl = element.querySelector('.filter-tag-link') as HTMLElement
      if (tagLinkEl) {
        tagLinkEl.addEventListener('mouseenter', () => {
          tagLinkEl.style.color = '#66b1ff'
          tagLinkEl.style.textDecoration = 'underline'
        })
        tagLinkEl.addEventListener('mouseleave', () => {
          tagLinkEl.style.color = '#409eff'
          tagLinkEl.style.textDecoration = 'none'
        })
      }


    }
  }
})

onMounted(async () => {
  // Only auto-route if there's already an operationid in the URL
  if (route.query.operationid) {
    await nextTick()
    routeToFirstAPI()
  }
})

watch(
  () => route.params.version,
  async (version) => {
    console.log('SearchNav: version changed to:', version)
    selectedVersion = version
    selectedTags = route.query.tags ? route.query.tags : 'NONE'
    if(selectedTags === 'NONE') {
      docs.value = getGroupedResourceDocs(version, resourceDocs.value)
    } else {
      docs.value = getFilteredGroupedResourceDocs(version, selectedTags, resourceDocs.value)
    }
    groups.value = JSON.parse(JSON.stringify(docs.value))
    activeKeys.value = Object.keys(groups.value)
    sortedKeys.value = activeKeys.value.sort()
    console.log('SearchNav: groups loaded, total groups:', activeKeys.value.length)
    await initializeAPICollections()
    await nextTick()
    // Only auto-route if there's an operationid in the URL (user navigated directly to an endpoint)
    if (route.query.operationid) {
      console.log('SearchNav: calling routeToFirstAPI')
      routeToFirstAPI()
    } else {
      console.log('SearchNav: no operationid, not auto-routing')
    }
    countApis()
  }
)

watch(
  () => route.query.tags,
  async (tags) => {
    console.log('SearchNav: tags changed to:', tags)
    selectedTags = tags ? tags : 'NONE'
    if(selectedTags === 'NONE') {
      docs.value = getGroupedResourceDocs(selectedVersion, resourceDocs.value)
    } else {
      docs.value = getFilteredGroupedResourceDocs(selectedVersion, selectedTags, resourceDocs.value)
    }
    groups.value = JSON.parse(JSON.stringify(docs.value))
    activeKeys.value = Object.keys(groups.value)
    sortedKeys.value = activeKeys.value.sort()
    await initializeAPICollections()
    await nextTick()
    countApis()
    // Update the version display text
    let element = document.getElementById("selected-api-version")
    if (element !== null) {
      const totalRows = Object.values(groups.value).reduce((acc, currentValue) => acc + currentValue.length, 0)
      if(selectedTags === 'NONE') {
        element.textContent = `${selectedVersion} ( ${totalRows} APIs )`;
      } else {
        element.innerHTML = `${selectedVersion} ( ${totalRows} APIs filtered by tags: <a href="#" class="filter-tag-link" style="color: #409eff; text-decoration: none; cursor: pointer; transition: color 0.2s ease;">${selectedTags}</a>)`;

        // Add hover effect
        const tagLinkEl = element.querySelector('.filter-tag-link') as HTMLElement
        if (tagLinkEl) {
          tagLinkEl.addEventListener('mouseenter', () => {
            tagLinkEl.style.color = '#66b1ff'
            tagLinkEl.style.textDecoration = 'underline'
          })
          tagLinkEl.addEventListener('mouseleave', () => {
            tagLinkEl.style.color = '#409eff'
            tagLinkEl.style.textDecoration = 'none'
          })
        }


      }
    }
  }
)



const countApis = () => {
  let element = document.getElementById("selected-api-version")
  if (element !== null) {
    const totalRows = Object.values(groups.value).reduce((acc, currentValue) => acc + currentValue.length, 0)
    element.textContent = `${selectedVersion} ( ${totalRows} APIs )`;
  }
}

const routeToFirstAPI = () => {
  let element
  const elements = document.getElementsByClassName('api-router-link')
  console.log('routeToFirstAPI: found', elements.length, 'api links')
  const id = route.query.operationid
  console.log('routeToFirstAPI: looking for operationid:', id)
  for (const el of elements) {
    if (el.id === id) {
      element = el
      break
    }
  }
  if (element) {
    console.log('routeToFirstAPI: clicking matching element:', id)
    element.click()
  } else {
    console.log('routeToFirstAPI: no match, clicking first element')
    if (elements.item(0)) {
      console.log('routeToFirstAPI: first element id:', elements.item(0).id)
      elements.item(0).click()
    } else {
      console.log('routeToFirstAPI: NO ELEMENTS FOUND!')
    }
  }
}

const sortLinks = (items: any) => {
  const uniqueLinks = {}
  for (const { summary, operation_id } of items) {
    if (!Object.keys(uniqueLinks).includes(summary.trim()))
      uniqueLinks[summary.trim()] = operation_id
    operationIdTitle[operation_id] = summary.trim()
  }
  const sortResult = Object.fromEntries(
    Object.entries(uniqueLinks).sort((a, b) => {
      if (a[0] < b[0]) {
        return -1
      }
      if (a[0] > b[0]) {
        return 1
      }
      return 0
    })
  )
  return sortResult
}

const setActive = (event) => {
  const target = event.target
  if (target.tagName.toLowerCase() === 'a') {
    setTabActive(target.id)
  }
}

const isKeyFound = (keys, item) => keys.every((k) => item.toLowerCase().includes(k))

const filterKeys = (keys, key) => {
  const splitKey = key.split(' ').map((k) => k.toLowerCase())
  return keys.filter((title) => {
    const isGroupFound = isKeyFound(splitKey, title)
    const items = docs.value[title].filter(
      (item) => isGroupFound || isKeyFound(splitKey, item.summary)
    )
    groups.value[title] = items
    return isGroupFound || items.length > 0
  })
}

const searchEvent = (value) => {
  if (value) {
    if (activeKeys.value && Array.isArray(activeKeys.value)) {
      sortedKeys.value = filterKeys(activeKeys.value, value)
    } else {
      sortedKeys.value = []
    }
  } else {
    groups.value = JSON.parse(JSON.stringify(docs.value))
    sortedKeys.value = Object.keys(groups.value).sort()
  }
}
</script>

<template>
  <el-container class="search-nav-container">
    <el-header class="search-nav-search-bar">
      <el-col :span="24">
        <el-input v-model="form.search" placeholder="Search" :prefix-icon="Search" @input="searchEvent" />
      </el-col>
    </el-header>
    <el-main>
      <el-collapse v-model="activeKeys" class="search-nav-collapse">
        <el-collapse-item title="My Collections" v-show="showMyCollections" name="my-collections">
          <el-collapse-item v-for="(api, key) of apiCollections" :key="key" :title="api.api_collection_name"
            :name="api.api_collection_name" class="child-collapse">
            <div class="el-tabs--right">
              <div v-for="(value, key) of apiCollectionsEndpoint[api.api_collection_name]" :key="key" class="api-router-tab"
                @click="setActive">
                <RouterLink :to="{ name: 'api', params: { version: selectedVersion }, query: { operationid: value } }" :id="value"
                  active-class="active-api-router-link" class="api-router-link">{{ operationIdTitle[value] }}</RouterLink>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse-item>
        <el-collapse-item v-for="key in sortedKeys" :title="key" :key="key" :name="key">
          <div class="el-tabs--right">
            <div v-for="(value, key) of sortLinks(groups[key])" :key="value" class="api-router-tab" @click="setActive">
              <RouterLink active-class="active-api-router-link" class="api-router-link" :id="value"
                :to="{ name: 'api', params: { version: selectedVersion }, query: { operationid: value } }">{{ key }}</RouterLink>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </el-main>
  </el-container>

</template>

<style scoped>
.search-nav-container {
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  padding: 0;
}
.search-nav {
  background-color: #f8f9fb;
  max-height: 100%;
  padding-right: 0;
  border-right: solid 1px var(--el-menu-border-color);

}
.search-nav-collapse {
  height: 100%;
  max-height: 99%;
  margin-right: -10px;
  width: 100%;
  overflow-x: hidden;
  min-height: unset;
}
.search-nav-search-bar {
  box-shadow: rgba(0, 0, 0, 0.40) 0px 25px 50px -20px;
  height: auto;
}
.api-router-link {
  width: 100%;
  margin-left: 15px;
  font-family: 'Roboto';
  text-decoration: none;
  color: #39455f;
  display: inline-block;
}

.api-router-tab {
  border-left: 2px solid var(--el-menu-border-color);
}

.api-router-tab:hover,
.active-api-router-tab {
  border-left: 2px solid v-bind(searchLinksColor);
}

.api-router-tab:hover .api-router-link,
.active-api-router-link {
  color: v-bind(searchLinksColor);
}

.favorite {
  cursor: pointer;
  line-height: 2;
  font-size: 18px;
  vertical-align: middle;
  text-align: center;
  padding: 12px;
  color: #39455f;
}

.child-collapse {
  margin-left: 15px;
}
</style>
