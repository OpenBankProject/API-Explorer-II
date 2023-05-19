<script setup lang="ts">
import { reactive, ref, onBeforeMount, onMounted, inject } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const docs = ref({})
const groups = ref({})
const sortedKeys = ref([])
const activeKeys = ref([])
const form = reactive({
  search: ''
})

onBeforeMount(() => {
  docs.value = inject('OBP-GroupedResourceDocs')!
  groups.value = JSON.parse(JSON.stringify(docs.value))
  activeKeys.value = Object.keys(groups.value)
  sortedKeys.value = activeKeys.value.sort()
})

onMounted(() => {
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
    elements.item(0).click()
  }
})

const sortLinks = (items: any) => {
  const uniqueLinks = {}
  for (const { summary, operation_id } of items) {
    if (!Object.keys(uniqueLinks).includes(summary)) uniqueLinks[summary.trim()] = operation_id
  }
  return Object.fromEntries(
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
}

const clearActiveTab = () => {
  const active = document.querySelector('.active-api-router-tab')
  if (active) {
    active.classList.remove('active-api-router-tab')
  }
}

const setActive = (event) => {
  clearActiveTab()
  const target = event.target
  if (target.tagName.toLowerCase() === 'a') {
    target.parentElement.classList.add('active-api-router-tab')
  }
}

const filterKeys = (keys, key) => {
  return keys.filter((title) => {
    const isGroupFound = title.toLowerCase().includes(key.toLowerCase())
    const items = docs.value[title].filter((item) =>
      item.summary.toLowerCase().includes(key.toLowerCase())
    )
    groups.value[title] = items
    return isGroupFound || items.length > 0
  })
}

const searchEvent = (event) => {
  if (event) {
    sortedKeys.value = filterKeys(activeKeys.value, event)
  } else {
    groups.value = JSON.parse(JSON.stringify(docs.value))
    sortedKeys.value = Object.keys(groups.value).sort()
  }
}
</script>

<template>
  <el-form :model="form" label-width="120px">
    <el-input
      v-model="form.search"
      class="w-50 m-1"
      placeholder="Search"
      :prefix-icon="Search"
      @input="searchEvent"
    />
  </el-form>
  <el-collapse v-model="activeKeys">
    <el-collapse-item title="My Collections" name="1"> </el-collapse-item>
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
            :to="{ name: 'api', params: { id: value } }"
            >{{ key }}</RouterLink
          >
        </div>
      </div>
    </el-collapse-item>
  </el-collapse>
</template>

<style>
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
  border-left: 2px solid #52b165;
}

.api-router-tab:hover .api-router-link,
.active-api-router-link {
  color: #52b165;
}
</style>
