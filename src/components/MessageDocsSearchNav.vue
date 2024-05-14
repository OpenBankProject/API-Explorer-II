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
import { reactive, ref, onBeforeMount, inject, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'
import { SEARCH_LINKS_COLOR as searchLinksColorSetting } from '../obp/style-setting'
import { connectors } from '../obp/message-docs'
import { obpGroupedMessageDocsKey } from '@/obp/keys'

let connector = connectors[0]
const route = useRoute()
const groupedMessageDocs = ref(inject(obpGroupedMessageDocsKey)!)
const docs = ref({})
const groups = ref({})
const sortedKeys = ref([])
const activeKeys = ref([])
const messageDocKeys = ref([])
const searchLinksColor = ref(searchLinksColorSetting)
const form = reactive({
  search: ''
})

onBeforeMount(() => {
  setDocs()
})

watch(
  () => route.params.id,
  async (id) => {
    setDocs()
  }
)

const isKeyFound = (keys, item) => keys.every((k) => item.toLowerCase().includes(k))

const filterKeys = (keys, key) => {
  const splitKey = key.split(' ').map((k) => k.toLowerCase())
  return keys.filter((title) => {
    const isGroupFound = isKeyFound(splitKey, title)
    const items = docs.value[title].filter((item) => isGroupFound || isKeyFound(splitKey, item))
    groups.value[title] = items
    return isGroupFound || items.length > 0
  })
}

const searchEvent = (value) => {
  if (value) {
    messageDocKeys.value = filterKeys(activeKeys.value, value)
  } else {
    groups.value = JSON.parse(JSON.stringify(docs.value))
    messageDocKeys.value = Object.keys(groups.value)
  }
}

const setDocs = () => {
  const paramConnector = route.params.id
  if (connectors.includes(paramConnector)) {
    connector = paramConnector
  }
  const messageDocs = groupedMessageDocs.value[connector]

  docs.value = Object.keys(messageDocs).reduce((doc, key) => {
    doc[key] = messageDocs[key].map((group) => group.process)
    return doc
  }, {})
  groups.value = JSON.parse(JSON.stringify(docs.value))
  messageDocKeys.value = Object.keys(groups.value)
  activeKeys.value = Object.keys(groups.value)
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
    <el-collapse-item v-for="key in messageDocKeys" :title="key" :key="key" :name="key">
      <div class="el-tabs--right">
        <div v-for="(value, key) of groups[key]" :key="value" class="message-docs-router-tab">
          <a class="message-docs-router-link" :id="`${value}-quick-nav`" v-bind:href="`#${value}`">
            {{ value }}
          </a>
        </div>
      </div>
    </el-collapse-item>
  </el-collapse>
</template>

<style scoped>
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

.message-docs-router-link {
  margin-left: 15px;
  font-size: 13px;
  font-family: 'Roboto';
  text-decoration: none;
  color: #39455f;
  display: inline-block;
}

.message-docs-router-tab {
  border-left: 2px solid var(--el-menu-border-color);
  line-height: 30px;
}

.message-docs-router-tab:hover,
.active-message-docs-router-tab {
  border-left: 2px solid v-bind(searchLinksColor);
}

.message-docs-router-tab:hover .message-docs-router-link {
  color: v-bind(searchLinksColor);
}
</style>
