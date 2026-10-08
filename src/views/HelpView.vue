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
import { ref, onBeforeMount, inject, computed } from 'vue'
import { obpGlossaryKey } from '@/obp/keys'
import { getGlossaryItemByTitle } from '@/obp/glossary'
import { safeHtml } from '@/obp/safe-html'

const glossary = ref(inject(obpGlossaryKey)!)
const helpContent = ref<any>(null)
const notFound = ref(false)

onBeforeMount(() => {
  const helpItem = getGlossaryItemByTitle(glossary.value, 'API-Explorer-II-Help')
  if (helpItem) {
    helpContent.value = helpItem
  } else {
    notFound.value = true
  }
})

const hasContent = computed(() => helpContent.value !== null)
</script>

<template>
  <el-container class="help-container">
    <el-main class="help-content">
      <el-scrollbar>
        <el-backtop :right="100" :bottom="100" />
        <div v-if="hasContent">
          <h1 class="help-title">{{ helpContent.title }}</h1>
          <div v-html="safeHtml(helpContent.description.html)" class="content"></div>
        </div>
        <div v-else-if="notFound" class="not-found">
          <h1>Help Content Not Available</h1>
          <p>
            The help content for API Explorer II could not be found. Please ensure that a glossary
            item with the title "API-Explorer-II-Help" exists in the system.
          </p>
        </div>
      </el-scrollbar>
    </el-main>
  </el-container>
</template>

<style scoped>
.help-container {
  height: calc(100vh - 60px);
}

.help-content {
  color: var(--obp-text-strong);
  font-family: 'Roboto';
  padding: 0;
}

.help-content :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
}

.help-content :deep(.el-scrollbar__view) {
  padding: 40px 60px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
  box-sizing: border-box;
}

.help-title {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 20px;
  color: var(--obp-text-strong);
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.content {
  font-size: 14px;
  line-height: 1.6;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
}

.content :deep(*) {
  max-width: 100%;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.content :deep(h1),
.content :deep(h2),
.content :deep(h3),
.content :deep(h4),
.content :deep(h5),
.content :deep(h6) {
  font-family: 'Roboto';
  font-weight: 700;
  margin-top: 24px;
  margin-bottom: 16px;
  color: var(--obp-text-strong);
}

.content :deep(h1) {
  font-size: 28px;
}

.content :deep(h2) {
  font-size: 24px;
}

.content :deep(h3) {
  font-size: 20px;
}

.content :deep(p) {
  margin-bottom: 16px;
}

.content :deep(ul),
.content :deep(ol) {
  margin-bottom: 16px;
  padding-left: 24px;
}

.content :deep(li) {
  margin-bottom: 8px;
}

.content :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 16px 0;
}

.content :deep(table) {
  max-width: 100%;
  table-layout: auto;
  word-wrap: break-word;
  border-collapse: collapse;
  margin: 16px 0;
}

.content :deep(table th),
.content :deep(table td) {
  border: 1px solid var(--el-border-color);
  padding: 8px 12px;
}

.content :deep(table th) {
  background-color: var(--el-fill-color-light);
  font-weight: 700;
}

.content :deep(pre) {
  max-width: 100%;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: var(--el-fill-color-light);
  padding: 16px;
  border-radius: 4px;
  margin: 16px 0;
}

.content :deep(code) {
  word-wrap: break-word;
  overflow-wrap: break-word;
  background-color: var(--el-fill-color-light);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.content :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.content :deep(strong) {
  font-family: 'Roboto';
  font-weight: 700;
}

.content :deep(a) {
  text-decoration: underline;
  font-family: 'Roboto';
  font-size: 14px;
  color: var(--el-color-primary);
  border-radius: 3px;
  padding: 1px;
}

.content :deep(a):hover {
  background-color: var(--el-color-primary-light-9);
  color: #66b1ff;
}

.content :deep(blockquote) {
  border-left: 4px solid var(--el-border-color);
  padding-left: 16px;
  margin: 16px 0;
  color: var(--el-text-color-regular);
  font-style: italic;
}

.not-found {
  text-align: center;
  padding: 40px 20px;
}

.not-found h1 {
  font-size: 24px;
  color: var(--el-color-danger);
  margin-bottom: 16px;
}

.not-found p {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}
</style>
