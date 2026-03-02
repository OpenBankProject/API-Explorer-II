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
import { ref, onBeforeMount, inject, watch, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import SearchNav from '../components/MessageDocsJsonSchemaSearchNav.vue'
import { connectors } from '../obp/message-docs'
import { obpGroupedMessageDocsJsonSchemaKey } from '@/obp/keys'
import JsonSchemaViewer from '../components/JsonSchemaViewer.vue'

let connector = connectors[0]
const route = useRoute()
const groupedMessageDocsJsonSchema = ref(inject(obpGroupedMessageDocsJsonSchemaKey) || {})
const messageDocsJsonSchema = ref(null as any)
const definitions = ref(null as any)
const definitionsPanelScrollbar = ref(null as any)

onBeforeMount(() => {
  setDoc()
})

watch(
  () => route.params.id,
  async (id) => {
    setDoc()
  }
)

const setDoc = () => {
  const paramConnector = route.params.id
  if (connectors.includes(paramConnector)) {
    connector = paramConnector
  }
  const data = groupedMessageDocsJsonSchema.value[connector]
  // Handle both old and new data structures
  if (data?.grouped) {
    messageDocsJsonSchema.value = data.grouped
    definitions.value = data.definitions
  } else {
    messageDocsJsonSchema.value = data
    definitions.value = null
  }
}

function hasSchema(value: any) {
  return value && (value.outbound_schema || value.inbound_schema)
}

// Handle $ref link clicks from JsonSchemaViewer components
function handleRefClick(href: string) {
  console.log('handleRefClick called with href:', href)
  if (!href) {
    console.log('No href provided')
    return
  }

  // Extract the definition ID from the href (e.g., #def-BasicGeneralContext)
  const targetId = href.substring(1) // Remove the #
  console.log('Target ID:', targetId)
  const targetElement = document.getElementById(targetId)
  console.log('Target element:', targetElement)
  console.log('Definitions panel scrollbar:', definitionsPanelScrollbar.value)

  if (targetElement && definitionsPanelScrollbar.value) {
    // Get the scrollbar's wrap element
    const scrollWrap = definitionsPanelScrollbar.value.$refs.wrap as HTMLElement
    console.log('Scroll wrap:', scrollWrap)
    if (scrollWrap) {
      // Calculate the position of the target element relative to the scrollable container
      const containerTop = scrollWrap.getBoundingClientRect().top
      const targetTop = targetElement.getBoundingClientRect().top
      const currentScroll = scrollWrap.scrollTop
      const offset = targetTop - containerTop + currentScroll - 20 // 20px padding from top
      console.log('Scrolling to offset:', offset)

      // Smooth scroll to the target
      scrollWrap.scrollTo({
        top: offset,
        behavior: 'smooth'
      })

      // Add a highlight effect
      targetElement.classList.add('highlight-definition')
      setTimeout(() => {
        targetElement.classList.remove('highlight-definition')
      }, 2000)
    } else {
      console.log('No scroll wrap found')
    }
  } else {
    console.log('Target element or scrollbar not found')
  }
}
</script>

<template>
  <el-container class="message-docs-container">
    <el-aside class="search-nav" width="18%">
      <el-scrollbar>
        <SearchNav />
      </el-scrollbar>
    </el-aside>
    <el-main class="message-docs-content">
      <el-scrollbar>
        <el-backtop :right="100" :bottom="100" />
        <div class="message-docs-header">
          <h1>{{ connector }}</h1>
          <p class="connector-subtitle">Message Docs - JSON Schema</p>
          <p class="version-indicator">v1.2.4 - Debug Click Events</p>
        </div>
        <div v-for="(group, key) of messageDocsJsonSchema" :key="key">
          <div v-for="(value, key) of group" :key="value">
            <el-divider></el-divider>
            <a v-bind:href="`#${value.method_name}`" :id="value.method_name">
              <h2>{{ value.method_name }}</h2>
            </a>
            <p v-if="value.description">{{ value.description }}</p>

            <section class="topics">
              <div>
                <strong>Category: </strong>
                <el-tag type="info" round>{{ value.category || 'Uncategorized' }}</el-tag>
              </div>
              <div v-if="value.message_format">
                <strong>Message Format: </strong>
                <el-tag type="success" round>{{ value.message_format }}</el-tag>
              </div>
            </section>

            <section v-if="value.outbound_schema">
              <h3>Outbound Schema</h3>
              <JsonSchemaViewer :schema="value.outbound_schema" copyable @refClick="handleRefClick" />
            </section>

            <section v-if="value.inbound_schema">
              <h3>Inbound Schema</h3>
              <JsonSchemaViewer :schema="value.inbound_schema" copyable @refClick="handleRefClick" />
            </section>

            <section v-if="!hasSchema(value)">
              <p class="no-schema-message">No schema information available for this method.</p>
            </section>
          </div>
        </div>
      </el-scrollbar>
    </el-main>
    <el-aside class="definitions-panel" width="28%">
      <el-scrollbar ref="definitionsPanelScrollbar">
        <div class="definitions-panel-content">
          <div class="definitions-header">
            <h2>Schema Definitions</h2>
            <p class="definitions-subtitle">
              Reference schemas used in messages
            </p>
          </div>

          <!-- Debug info -->
          <div v-if="false">
            {{ console.log('Definitions:', definitions) }}
            {{ console.log('Definitions keys:', definitions ? Object.keys(definitions) : 'null') }}
            {{ console.log('Message docs:', messageDocsJsonSchema) }}
          </div>

          <div v-if="definitions && Object.keys(definitions).length > 0">
            <div v-for="(defSchema, defName) in definitions" :key="defName" class="definition-item">
              <a v-bind:href="`#def-${defName}`" :id="`def-${defName}`">
                <h3>{{ defName }}</h3>
              </a>
              <JsonSchemaViewer :schema="defSchema" copyable @refClick="handleRefClick" />
            </div>
          </div>

          <div v-else class="no-definitions">
            <p>No schema definitions available</p>
            <p style="font-size: 0.8rem; margin-top: 10px;">
              Debug: definitions = {{ definitions ? 'exists' : 'null' }},
              keys = {{ definitions ? Object.keys(definitions).length : 0 }}
            </p>
          </div>
        </div>
      </el-scrollbar>
    </el-aside>
  </el-container>
</template>

<style scoped>
.message-docs-container {
  height: calc(100vh - 60px);
}

/* Left Sidebar - Search Navigation */
.search-nav {
  border-right: 1px solid #e4e7ed;
}

.search-nav :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
}

.search-nav :deep(.el-scrollbar__view) {
  padding: 10px;
}

/* Main Content Area */
.message-docs-content {
  color: #39455f;
  font-family: 'Roboto';
  padding: 0;
}

.message-docs-content :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
}

.message-docs-content :deep(.el-scrollbar__view) {
  padding: 25px 30px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
  box-sizing: border-box;
}

/* Right Sidebar - Definitions Panel */
.definitions-panel {
  border-left: 2px solid #e4e7ed;
  background-color: #f9fafb;
}

.definitions-panel :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
}

.definitions-panel :deep(.el-scrollbar__view) {
  padding: 0;
}

.definitions-panel-content {
  padding: 20px;
}

.definitions-header {
  position: sticky;
  top: 0;
  background-color: #f9fafb;
  padding: 10px 0 20px 0;
  margin-bottom: 10px;
  border-bottom: 2px solid #e4e7ed;
  z-index: 10;
}

.definitions-header h2 {
  color: #303133;
  margin: 0 0 8px 0;
  font-size: 1.3rem;
  font-family: 'Roboto';
  font-weight: 600;
}

.definitions-subtitle {
  color: #909399;
  margin: 0;
  font-size: 0.85rem;
  font-family: 'Roboto';
}

h2 {
  word-wrap: break-word;
  overflow-wrap: break-word;
}

section {
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
  margin-bottom: 20px;
}

pre {
  font-family: 'Roboto';
  max-width: 100%;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

a {
  text-decoration: none;
  color: #39455f;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

div {
  font-size: 14px;
}

.content :deep(strong) {
  font-family: 'Roboto';
}

.content :deep(a):hover {
  background-color: #39455f;
}

.message-docs-header {
  padding: 20px 0;
  border-bottom: 2px solid #e4e7ed;
  margin-bottom: 20px;
}

.message-docs-header h1 {
  font-size: 1.75rem;
  font-weight: 600;
  color: #303133;
  margin: 0 0 0.5rem 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.connector-subtitle {
  font-size: 1rem;
  color: #909399;
  margin: 0;
}

.version-indicator {
  font-size: 0.75rem;
  color: #67c23a;
  margin: 0.25rem 0 0 0;
  font-weight: 600;
}

.topics {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 15px 0;
}

.topics > div {
  display: flex;
  align-items: center;
  gap: 10px;
}

.no-schema-message {
  color: #909399;
  font-style: italic;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.definition-item {
  margin-bottom: 25px;
  padding: 15px;
  background-color: #ffffff;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.definition-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-color: #409eff;
}

.definition-item h3 {
  color: #409eff;
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 1rem;
  word-wrap: break-word;
  overflow-wrap: break-word;
  font-weight: 600;
  font-family: 'Roboto';
}

.definition-item a {
  text-decoration: none;
}

.definition-item a:hover h3 {
  text-decoration: underline;
}

.no-definitions {
  text-align: center;
  padding: 40px 20px;
  color: #909399;
  font-style: italic;
  font-family: 'Roboto';
}

/* Highlight animation for scrolled-to definitions */
@keyframes highlight-pulse {
  0% {
    background-color: rgba(64, 158, 255, 0.15);
  }
  50% {
    background-color: rgba(64, 158, 255, 0.25);
  }
  100% {
    background-color: rgba(64, 158, 255, 0.15);
  }
}

.definition-item.highlight-definition {
  animation: highlight-pulse 0.6s ease-in-out 3;
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.3);
}
</style>
