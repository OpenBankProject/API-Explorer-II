<script setup lang="ts">
import { reactive, ref, onBeforeMount, inject } from 'vue'
import { Search } from '@element-plus/icons-vue'

const groups = ref({})
const sortedKeys = ref([])
const activeKeys = ref([])
const form = reactive({
  search: ''
})

onBeforeMount(() => {
  groups.value = inject('OBP-GroupedResourceDocs')!
  activeKeys.value = Object.keys(groups.value)
  sortedKeys.value = activeKeys.value.sort()
})

const clearActiveTab = () => {
  const active = document.querySelector('.active-api-router-tab')
  if (active) {
    const child = active.firstChild
    if (child.style) {
      child.style.color = '#39455f'
    }
    active.classList.remove('active-api-router-tab')
  }
}

const setActive = (event) => {
  clearActiveTab()
  const target = event.target
  if (target.tagName === 'A') {
    target.classList.add('active-api-router-link')
    target.style.color = '#52b165'
    target.parentElement.classList.add('active-api-router-tab')
  }
}
</script>

<template>
  <el-form :model="form" label-width="120px">
    <el-input v-model="form.search" class="w-50 m-1" placeholder="Search" :prefix-icon="Search" />
  </el-form>
  <el-collapse v-model="activeKeys">
    <el-collapse-item title="My Collections" name="1"> </el-collapse-item>
    <el-collapse-item v-for="key in sortedKeys" :title="key" :key="key" :name="key">
      <div class="el-tabs--right">
        <div v-for="item in groups[key]" :key="item" class="api-router-tab" @click="setActive">
          <RouterLink
            class="api-router-link"
            :to="{ name: 'api', params: { id: item.operation_id } }"
            >{{ item.summary }}</RouterLink
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
