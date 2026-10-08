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
import { ref, inject, computed } from 'vue'
import { obpGlossaryKey, obpGroupedMessageDocsJsonSchemaKey, obpGroupedMessageDocsKey } from '@/obp/keys'

const groupedMessageDocs = ref(inject(obpGroupedMessageDocsKey) || {})
const groupedMessageDocsJsonSchema = ref(inject(obpGroupedMessageDocsJsonSchemaKey) || {})
const glossary = inject(obpGlossaryKey, undefined)

// The introduction is OBP-API's own glossary entry, so it stays in step with the server.
const introHtml = computed(
  () =>
    glossary?.glossary_items?.find((item: any) => item.title === 'Message Doc')?.description?.html || ''
)

const connectorList = computed(() => {
  return Object.keys(groupedMessageDocs.value || {}).sort()
})

const jsonSchemaConnectorList = computed(() => {
  return Object.keys(groupedMessageDocsJsonSchema.value || {}).sort()
})

// Releasing the mouse after selecting text on a card (to copy it) is not a click, so it does not
// open the connector.
const ignoreClickAfterSelection = (event: MouseEvent) => {
  if (window.getSelection()?.toString()) {
    event.stopPropagation()
    event.preventDefault()
  }
}

// A connector's message docs are grouped; this counts the messages in all its groups.
const messageCount = (connector: string): number =>
  Object.values(groupedMessageDocs.value[connector] || {}).reduce(
    (count: number, group: any) => count + (Array.isArray(group) ? group.length : 0),
    0
  )
</script>

<template>
  <el-container class="message-docs-list-container">
    <el-main class="message-docs-page">
      <header class="page-header">
        <h1>Message Docs</h1>
        <p class="page-subtitle">
          The messages OBP-API's connectors send to adapters in front of core banking systems, and the
          replies they expect.
        </p>
      </header>

      <section>
        <h2>Connectors</h2>
        <p class="section-hint">Pick a connector to see its message docs.</p>
        <p v-if="connectorList.length === 0" class="empty-message">No message documentation available</p>
        <div v-else class="connector-grid" @click.capture="ignoreClickAfterSelection">
          <RouterLink
            v-for="connector in connectorList"
            :key="connector"
            :to="{ name: 'message-docs', params: { id: connector } }"
            class="connector-card"
            draggable="false"
          >
            <span class="connector-name">{{ connector }}</span>
            <span class="connector-meta">{{ messageCount(connector) }} messages</span>
          </RouterLink>
        </div>
      </section>

      <section>
        <h2>JSON Schema</h2>
        <p class="section-hint">The same messages described as JSON Schema.</p>
        <p v-if="jsonSchemaConnectorList.length === 0" class="empty-message">
          No JSON schema message documentation available
        </p>
        <div v-else class="connector-grid" @click.capture="ignoreClickAfterSelection">
          <RouterLink
            v-for="connector in jsonSchemaConnectorList"
            :key="connector"
            :to="{ name: 'message-docs-json-schema', params: { id: connector } }"
            class="connector-card"
            draggable="false"
          >
            <span class="connector-name">{{ connector }}</span>
            <span class="connector-meta">JSON Schema</span>
          </RouterLink>
        </div>
      </section>

      <section v-if="introHtml">
        <h2>About Message Docs</h2>
        <div v-html="introHtml" class="message-docs-intro"></div>
      </section>
    </el-main>
  </el-container>
</template>

<style scoped>
.message-docs-list-container {
  min-height: calc(100vh - 60px);
}

.message-docs-page {
  padding: 24px 32px 48px;
  font-family: 'Roboto', var(--el-font-family);
  color: var(--el-text-color-regular);
}

.page-header {
  padding: 8px 0 20px;
  border-bottom: 2px solid var(--el-border-color-light);
  margin-bottom: 8px;
}

h1 {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 0.5rem;
}

.page-subtitle {
  font-size: 1rem;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  margin: 0;
}

h2 {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 28px 0 4px;
}

.section-hint {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin: 0 0 12px;
}

.connector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.connector-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background-color: var(--el-bg-color);
  text-decoration: none;
  -webkit-user-drag: none;
}

.connector-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  overflow-wrap: anywhere;
}

.connector-meta {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.message-docs-intro {
  font-size: 15px;
  line-height: 1.7;
}

.message-docs-intro :deep(p) {
  margin: 0 0 0.9em;
}

.message-docs-intro :deep(a) {
  color: var(--el-color-primary);
}

.message-docs-intro :deep(code) {
  font-family: 'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
  padding: 1px 4px;
  border-radius: 4px;
  background-color: var(--el-fill-color-light);
}

.empty-message {
  color: var(--el-text-color-secondary);
  font-style: italic;
}

@media (max-width: 640px) {
  .message-docs-page {
    padding: 16px;
  }
}
</style>
