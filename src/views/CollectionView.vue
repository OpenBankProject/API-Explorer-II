<script setup lang="ts">
import Menu from '../components/Menu.vue'
import AutoLogout from '../components/AutoLogout.vue'
import ChatWidget from '../components/ChatWidget.vue'
import { Search } from '@element-plus/icons-vue'
import { onMounted, ref, computed, inject, reactive, nextTick } from 'vue'
import { getCurrentUser, getAPICollectionEndpoints, OBP_API_DEFAULT_RESOURCE_DOC_VERSION } from '../obp'
import { obpResourceDocsKey } from '@/obp/keys'
import { useRoute, useRouter } from 'vue-router'
import { SEARCH_LINKS_COLOR as searchLinksColorSetting } from '../obp/style-setting'

const route = useRoute()
const router = useRouter()
const isLoggedIn = ref(false)
const loading = ref(true)
const errorMessage = ref('')
const collectionId = ref('')
const groups = ref<Record<string, any[]>>({})
const sortedKeys = ref<string[]>([])
const activeKeys = ref<string[]>([])
const searchLinksColor = ref(searchLinksColorSetting)
const form = reactive({ search: '' })
const allDocs = ref<Record<string, any[]>>({})

const resourceDocs = inject(obpResourceDocsKey)
const version = OBP_API_DEFAULT_RESOURCE_DOC_VERSION

const hasOperationId = computed(() => {
  return !!route.query.operationid
})

const endpointCount = computed(() => {
  return Object.values(groups.value).reduce((acc: number, items: any[]) => acc + items.length, 0)
})

const isChatbotEnabled = import.meta.env.VITE_CHATBOT_ENABLED === 'true'

const sortLinks = (items: any[]) => {
  const uniqueLinks: Record<string, string> = {}
  for (const { summary, operation_id } of items) {
    if (!Object.keys(uniqueLinks).includes(summary.trim()))
      uniqueLinks[summary.trim()] = operation_id
  }
  return Object.fromEntries(
    Object.entries(uniqueLinks).sort((a, b) => a[0].localeCompare(b[0]))
  )
}

const clearActiveTab = () => {
  const activeTabs = document.querySelectorAll('.active-api-router-tab')
  activeTabs.forEach((tab) => {
    tab.classList.remove('active-api-router-tab')
  })
}

const setTabActive = (id: string) => {
  const tabs = document.querySelectorAll('.api-router-link')
  clearActiveTab()
  tabs.forEach((tab) => {
    if (tab.id === id) {
      tab.parentElement?.classList.add('active-api-router-tab')
    }
  })
}

const setActive = (event: Event) => {
  const target = event.target as HTMLElement
  if (target.tagName.toLowerCase() === 'a') {
    setTabActive(target.id)
  }
}

const isKeyFound = (keys: string[], item: string) => keys.every((k) => item.toLowerCase().includes(k))

const searchEvent = (value: string) => {
  if (value) {
    const splitKey = value.split(' ').map((k) => k.toLowerCase())
    sortedKeys.value = Object.keys(allDocs.value).filter((title) => {
      const isGroupFound = isKeyFound(splitKey, title)
      const items = allDocs.value[title].filter(
        (item: any) => isGroupFound || isKeyFound(splitKey, item.summary)
      )
      groups.value[title] = items
      return isGroupFound || items.length > 0
    })
  } else {
    groups.value = JSON.parse(JSON.stringify(allDocs.value))
    sortedKeys.value = Object.keys(groups.value).sort()
  }
}

onMounted(async () => {
  const currentUser = await getCurrentUser()
  const currentResponseKeys = Object.keys(currentUser)
  isLoggedIn.value = currentResponseKeys.includes('username')

  collectionId.value = route.params.id as string
  if (!collectionId.value) {
    errorMessage.value = 'No collection ID provided.'
    loading.value = false
    return
  }

  const response = await getAPICollectionEndpoints(collectionId.value)

  if (response.error) {
    errorMessage.value = typeof response.error === 'string'
      ? response.error
      : response.error.message || JSON.stringify(response.error)
    loading.value = false
    return
  }

  const endpoints = response.api_collection_endpoints
  if (!endpoints || endpoints.length === 0) {
    errorMessage.value = 'This collection has no endpoints.'
    loading.value = false
    return
  }

  const operationIds = new Set(endpoints.map((ep: any) => ep.operation_id))

  const versionDocs = resourceDocs?.[version]?.resource_docs || []
  const matchedDocs = versionDocs.filter((doc: any) => operationIds.has(doc.operation_id))

  if (matchedDocs.length === 0) {
    errorMessage.value = 'No matching endpoints found in the resource documentation.'
    loading.value = false
    return
  }

  const grouped = matchedDocs.reduce((acc: Record<string, any[]>, doc: any) => {
    const tag = doc.tags[0]
    ;(acc[tag] = acc[tag] || []).push(doc)
    return acc
  }, {})

  allDocs.value = JSON.parse(JSON.stringify(grouped))
  groups.value = JSON.parse(JSON.stringify(grouped))
  activeKeys.value = Object.keys(groups.value)
  sortedKeys.value = activeKeys.value.sort()
  loading.value = false

  await nextTick()
  if (route.query.operationid) {
    setTabActive(route.query.operationid as string)
  }
})
</script>

<template>
  <AutoLogout v-if="isLoggedIn" />
  <el-container class="root">
    <el-aside class="search-nav" width="20%">
      <el-container class="search-nav-container">
        <el-header class="collection-header">
          <div class="collection-title">Collection</div>
          <div class="collection-id">{{ collectionId }}</div>
          <div v-if="!loading && !errorMessage" class="collection-count">{{ endpointCount }} endpoints</div>
        </el-header>
        <el-header class="search-nav-search-bar" v-if="!loading && !errorMessage">
          <el-col :span="24">
            <el-input v-model="form.search" placeholder="Search" :prefix-icon="Search" @input="searchEvent" />
          </el-col>
        </el-header>
        <el-main>
          <div v-if="loading" class="loading-state">
            <el-icon class="is-loading"><i class="el-icon-loading"></i></el-icon>
            Loading collection...
          </div>
          <div v-else-if="errorMessage" class="error-state">
            <p>{{ errorMessage }}</p>
          </div>
          <el-collapse v-else v-model="activeKeys" class="search-nav-collapse">
            <el-collapse-item v-for="key in sortedKeys" :title="key" :key="key" :name="key">
              <div class="el-tabs--right">
                <div v-for="(value, k) of sortLinks(groups[key])" :key="value" class="api-router-tab" @click="setActive">
                  <RouterLink active-class="active-api-router-link" class="api-router-link" :id="value"
                    :to="{ name: 'collection-api', params: { id: collectionId }, query: { operationid: value } }">{{ k }}</RouterLink>
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </el-main>
      </el-container>
    </el-aside>
    <el-main>
      <el-container class="main">
        <el-header class="menu">
          <Menu />
        </el-header>
        <el-container class="middle">
          <el-aside class="summary" :width="hasOperationId ? '50%' : '100%'">
            <RouterView name="body" />
          </el-aside>
          <el-main v-if="hasOperationId" class="preview">
            <RouterView class="preview" name="preview" />
          </el-main>
        </el-container>
      </el-container>
      <ChatWidget v-if="isChatbotEnabled" />
    </el-main>
  </el-container>
</template>

<style scoped>
.root {
  height: 100%;
}
.summary {
  max-height: 100%;
}
.main {
  height: 100%;
  overflow: hidden;
}
.search-nav {
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  background-color: #f8f9fb;
  border-right: solid 1px var(--el-menu-border-color);
}
.middle {
  height: 100%;
  overflow: hidden;
}
.preview {
  color: white;
  background-color: #151d30;
  max-height: 100%;
}
.search-nav-container {
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  padding: 0;
}
.collection-header {
  padding: 15px 20px;
  height: auto;
  border-bottom: 1px solid var(--el-menu-border-color);
}
.collection-title {
  font-family: 'Roboto';
  font-size: 12px;
  color: #909399;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.collection-id {
  font-family: 'Roboto';
  font-size: 13px;
  color: #39455f;
  font-weight: 500;
  margin-top: 4px;
  word-break: break-all;
}
.collection-count {
  font-family: 'Roboto';
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
.search-nav-search-bar {
  box-shadow: rgba(0, 0, 0, 0.40) 0px 25px 50px -20px;
  height: auto;
}
.search-nav-collapse {
  height: 100%;
  max-height: 99%;
  margin-right: -10px;
  width: 100%;
  overflow-x: hidden;
  min-height: unset;
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
.loading-state {
  padding: 20px;
  text-align: center;
  color: #909399;
  font-family: 'Roboto';
}
.error-state {
  padding: 20px;
  color: #f56c6c;
  font-family: 'Roboto';
  font-size: 14px;
}
.menu {
  /* match BodyView menu styling */
}
</style>
