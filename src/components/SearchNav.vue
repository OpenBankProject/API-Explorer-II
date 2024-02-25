<script lang="ts">
import { reactive, ref, watch, onBeforeMount, onMounted, inject } from 'vue'
import { Search, Star } from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'
import { OBP_API_VERSION, getMyAPICollections, getMyAPICollectionsEndpoint } from '../obp'
import { getGroupedResourceDocs } from '../obp/resource-docs'
import { SEARCH_LINKS_COLOR as searchLinksColorSetting } from '../obp/style-setting'
import { obpResourceDocsKey } from '@/obp/keys'
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
let selectedVersion = 'OBP' + OBP_API_VERSION
onBeforeMount(async () => {
  resourceDocs.value = inject(obpResourceDocsKey)!
  docs.value = getGroupedResourceDocs(selectedVersion, resourceDocs.value)
  groups.value = JSON.parse(JSON.stringify(docs.value))
  activeKeys.value = Object.keys(groups.value)
  sortedKeys.value = activeKeys.value.sort()
  await initializeAPICollections()
  setTabActive(route.params.id)
})

onMounted(() => {
  routeToFirstAPI()
})

watch(
  () => route.query.version,
  async (version) => {
    selectedVersion = version
    docs.value = getGroupedResourceDocs(version, resourceDocs.value)
    groups.value = JSON.parse(JSON.stringify(docs.value))
    activeKeys.value = Object.keys(groups.value)
    sortedKeys.value = activeKeys.value.sort()
    await initializeAPICollections()
    routeToFirstAPI()
  }
)

const routeToFirstAPI = () => {
  let element
  const elements = document.getElementsByClassName('api-router-link')
  const id = route.params.id
  for (const el of elements) {
    if (el.id === id) {
      element = el
      break
    }
  }
  if (element) {
    element.click()
  } else {
    if (elements.item(0)) elements.item(0).click()
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
    sortedKeys.value = filterKeys(activeKeys.value, value)
  } else {
    groups.value = JSON.parse(JSON.stringify(docs.value))
    sortedKeys.value = Object.keys(groups.value).sort()
  }
}
</script>

<template>
  <el-row>
    <el-col :span="24">
      <el-input
        v-model="form.search"
        placeholder="Search"
        :prefix-icon="Search"
        @input="searchEvent"
      />
    </el-col>
  </el-row>
  <el-collapse v-model="activeKeys">
    <el-collapse-item title="My Collections" v-show="showMyCollections" name="my-collections">
      <el-collapse-item
        v-for="(api, key) of apiCollections"
        :key="key"
        :title="api.api_collection_name"
        :name="api.api_collection_name"
        class="child-collapse"
      >
        <div class="el-tabs--right">
          <div
            v-for="(value, key) of apiCollectionsEndpoint[api.api_collection_name]"
            :key="key"
            class="api-router-tab"
            @click="setActive"
          >
            <RouterLink
              :to="{ name: 'api', params: { id: value }, query: { version: selectedVersion } }"
              :id="value"
              active-class="active-api-router-link"
              class="api-router-link"
              >{{ operationIdTitle[value] }}</RouterLink
            >
          </div>
        </div>
      </el-collapse-item>
    </el-collapse-item>
    <el-collapse-item v-for="key in sortedKeys" :title="key" :key="key" :name="key">
      <div class="el-tabs--right">
        <div
          v-for="(value, key) of sortLinks(groups[key])"
          :key="value"
          class="api-router-tab"
          @click="setActive"
        >
          <RouterLink
            active-class="active-api-router-link"
            class="api-router-link"
            :id="value"
            :to="{ name: 'api', params: { id: value }, query: { version: selectedVersion } }"
            >{{ key }}</RouterLink
          >
        </div>
      </div>
    </el-collapse-item>
  </el-collapse>
</template>

<style scoped>
.search-nav {
  background-color: #f8f9fb;
  padding: 8px;
  border-right: solid 1px var(--el-menu-border-color);
  overflow: unset !important;
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
