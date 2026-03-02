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
import { obpGlossaryKey } from '@/obp/keys';
import { Search } from '@element-plus/icons-vue';
import { inject, onBeforeMount, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { SEARCH_LINKS_COLOR as searchLinksColorSetting } from '../obp/style-setting';

const route = useRoute()
const activeKeys = ref<string[]>([])
const glossaryKeys = ref<string[]>([])
const searchLinksColor = ref(searchLinksColorSetting)
const form = reactive({
  search: ''
})

// Helper function to check if a glossary item should be displayed
const shouldDisplayItem = (item: any): boolean => {
  const html = item.description?.html || ''

  // Check if description contains "no-description-provided"
  if (html.includes('no-description-provided')) {
    return false
  }

  // Check if Example value is empty
  // Matches: "Example value:</p>", "Example value: </p>", "Example value:&nbsp;</p>", etc.
  if (html.match(/Example value:\s*(&nbsp;|\s)*<\/p>/i)) {
    return false
  }

  // Also check for "Example value:" followed by empty tags or whitespace before closing
  if (html.match(/Example value:\s*(<[^>]*>)*\s*<\/p>/i)) {
    return false
  }

  return true
}

onBeforeMount(() => {
  const glossary = inject(obpGlossaryKey)!
  for (const item of glossary.glossary_items) {
    // Only include items that pass the filter
    if (!activeKeys.value.includes(item.title) && shouldDisplayItem(item)) {
      activeKeys.value.push(item.title)
    }
  }
  glossaryKeys.value = activeKeys.value
})



onMounted(() => {
  let hash = route.hash;
  let elements = document.querySelectorAll(`a[href="${hash}"][class="glossary-router-link"]`)
  if (elements.length == 1) {
    (elements[0] as HTMLElement).click()
  }
})

const filterKeys = (keys: string[], key: string) => {
  return keys.filter((title: string) => {
    return title.toLowerCase().includes(key.toLowerCase())
  })
}

const searchEvent = (event: string) => {
  if (event) {
    glossaryKeys.value = filterKeys(activeKeys.value, event).sort()
  } else {
    glossaryKeys.value = activeKeys.value
  }
}
</script>

<template>
  <el-input v-model="form.search" class="w-50 m-1" placeholder="Search" :prefix-icon="Search" @input="searchEvent" />
  <div class="tab-items">
    <div class="el-tabs--right">
      <div v-for="value of glossaryKeys" :key="value" class="glossary-router-tab">
        <a class="glossary-router-link" :id="`${value.charAt(0).toLowerCase()}-quick-nav`" v-bind:href="`#${value}`">
          {{ value }}
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glossary-router-link {
  margin-left: 15px;
  font-size: 13px;
  font-family: 'Roboto';
  text-decoration: none;
  color: #39455f;
  display: inline-block;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  max-width: 100%;
}

.glossary-router-tab {
  border-left: 2px solid var(--el-menu-border-color);
  line-height: 30px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
}

.glossary-router-tab:hover,
.active-glossary-router-tab {
  border-left: 2px solid v-bind(searchLinksColor);
}

.glossary-router-tab:hover .glossary-router-link,
.active-glossary-router-link {
  color: v-bind(searchLinksColor);
}

.tab-items {
  margin-top: 10px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  max-width: 100%;
}
</style>
