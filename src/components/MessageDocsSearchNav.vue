<script setup lang="ts">
import { reactive, ref, onBeforeMount, inject } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeKeys = ref([])
const glossaryKeys = ref([])
const alphabet = ref([])
const form = reactive({
  search: ''
})

const alphabetCharCodes = Array.from(Array(26)).map((e, i) => i + 65)
alphabet.value = alphabetCharCodes.map((x) => String.fromCharCode(x))

onBeforeMount(() => {
  const glossary = inject('OBP-Glossary')!
  for (const item of glossary.glossary_items) {
    if (!activeKeys.value.includes(item.title)) {
      activeKeys.value.push(item.title)
    }
  }
  glossaryKeys.value = activeKeys.value
})

const filterKeys = (keys, key) => {
  return keys.filter((title) => {
    return title.toLowerCase().includes(key.toLowerCase())
  })
}

const searchEvent = (event) => {
  if (event) {
    glossaryKeys.value = filterKeys(activeKeys.value, event).sort()
  } else {
    glossaryKeys.value = activeKeys.value
  }
}
</script>

<template>
  <el-input
    v-model="form.search"
    class="w-50 m-1"
    placeholder="Search"
    :prefix-icon="Search"
    @input="searchEvent"
  />
  <div class="tabs"></div>
</template>

<style>
.tabs {
  display: flex;
  max-height: 90vh;
}
.alphabet {
  padding: 10px 5px 5px 5px;
  min-width: 25px;
}
.alphabet-link {
  padding: 5px 0px 5px 0px;
  width: 100%;
  text-align: center;
  cursor: pointer;
}
.alphabet-router-link {
  font-size: 13px;
  font-family: 'Roboto';
  color: #39455f;
  text-decoration: none;
}
.search-nav {
  background-color: #f8f9fb;
  padding: 8px;
  border-right: solid 1px var(--el-menu-border-color);
}

.glossary-router-link {
  margin-left: 15px;
  font-size: 13px;
  font-family: 'Roboto';
  text-decoration: none;
  color: #39455f;
  display: inline-block;
}

.glossary-router-tab {
  border-left: 2px solid var(--el-menu-border-color);
  line-height: 30px;
}

.glossary-router-tab:hover,
.active-glossary-router-tab {
  border-left: 2px solid #52b165;
}

.glossary-router-tab:hover .glossary-router-link,
.active-glossary-router-link,
.alphabet-router-link:hover,
.alphabet-link:hover .alphabet-router-link {
  color: #52b165;
}
.tab-items {
  overflow: auto;
  max-height: 100vh;
  margin-top: 10px;
  margin-right: -8px;
}
</style>
