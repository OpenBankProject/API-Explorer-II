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
import { reactive, ref, onBeforeMount, onMounted, inject, computed } from 'vue'
import SearchNav from '../components/GlossarySearchNav.vue'
import { obpGlossaryKey } from '@/obp/keys';

const allGlossaryItems = ref(inject(obpGlossaryKey)!.glossary_items)

// Filter out items with empty example values or "no-description-provided"
const glossary = computed(() => {
  return allGlossaryItems.value.filter((item: any) => {
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
  })
})
</script>

<template>
  <el-container class="glossary-container">
    <el-aside class="search-nav" width="20%">
      <el-scrollbar>
        <SearchNav />
      </el-scrollbar>
    </el-aside>
    <el-main class="glossary-content">
      <el-scrollbar>
        <el-backtop :right="100" :bottom="100" />
        <div v-for="(value, key) of glossary" :key="value">
          <span>
            <a v-bind:href="`#${value.title}`" :id="value.title">
              {{ value.title }}
            </a>
          </span>
          <div v-html="value.description.html" class="content"></div>
        </div>
      </el-scrollbar>
    </el-main>
  </el-container>
</template>

<style scoped>
.glossary-container {
  height: calc(100vh - 60px);
}
.search-nav :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
}
.search-nav :deep(.el-scrollbar__view) {
  padding: 10px;
}
.glossary-content {
  color: #39455f;
  font-family: 'Roboto';
  padding: 0;
}
.glossary-content :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
}
.glossary-content :deep(.el-scrollbar__view) {
  padding: 25px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
  box-sizing: border-box;
}
span {
  font-size: 28px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
div {
  font-size: 14px;
}
.content {
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
}
.content :deep(*) {
  max-width: 100%;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
.content :deep(img) {
  max-width: 100%;
  height: auto;
}
.content :deep(table) {
  max-width: 100%;
  table-layout: fixed;
  word-wrap: break-word;
}
.content :deep(pre) {
  max-width: 100%;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}
.content :deep(code) {
  word-wrap: break-word;
  overflow-wrap: break-word;
}
.content :deep(strong) {
  font-family: 'Roboto';
}
span > a {
  text-decoration: none;
  color: #39455f;
  display: block;
  margin-top: 30px;
  padding-top: 10px;
}
span:first-child > a {
  margin-top: 0;
}
.content :deep(a) {
  text-decoration: underline;
  font-family: 'Roboto';
  font-size: 14px;
  border-radius: 3px;
  padding: 1px;
}
.content :deep(a):hover {
  background-color: #a4b2ce;
}

/* Make Scala code blocks readable */
.content :deep(pre.language-scala) {
  background-color: #f5f5f5 !important;
  color: #333 !important;
  font-family: 'Courier New', Courier, monospace !important;
  padding: 1em !important;
}

.content :deep(pre.language-scala code) {
  background-color: transparent !important;
  color: #333 !important;
  font-family: 'Courier New', Courier, monospace !important;
}

.content :deep(pre.language-scala .token) {
  color: #333 !important;
}
</style>
