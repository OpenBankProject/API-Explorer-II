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
import { reactive, ref, onBeforeMount, onMounted, inject, watch } from 'vue'
import { useRoute } from 'vue-router'
import SearchNav from '../components/MessageDocsSearchNav.vue'
import { connectors } from '../obp/message-docs'
import { obpGroupedMessageDocsKey } from '@/obp/keys';
import MessageDocsSearchNav from '../components/MessageDocsSearchNav.vue';
import CodeBlock from '../components/CodeBlock.vue';

let connector = connectors[0]
const route = useRoute()
const groupedMessageDocs = ref(inject(obpGroupedMessageDocsKey) || {})
const messageDocs = ref(null as any)

const activeNames = ref(['1', '2', '3', '4', '5', '6'])

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
  messageDocs.value = groupedMessageDocs.value[connector]
}
function showRequiredFieldInfo(value: any) {
  return (JSON.stringify(value, null) === '{}' || JSON.stringify(value, null) === '')
}
function showDependentEndpoints(value: any) {
  return value.lengtt > 0
}
</script>

<template>
  <el-container class="message-docs-container">
    <el-aside class="search-nav" width="20%">
      <el-scrollbar>
        <SearchNav />
      </el-scrollbar>
    </el-aside>
    <el-main class="message-docs-content">
      <el-scrollbar>
        <el-backtop :right="100" :bottom="100" />
        <div class="message-docs-header">
          <h1>{{ connector }}</h1>
          <p class="connector-subtitle">Message Docs</p>
        </div>
        <div v-for="(group, key) of messageDocs" :key="key">
          <div v-for="(value, key) of group" :key="value">
            <el-divider></el-divider>
            <a v-bind:href="`#${value.process}`" :id="value.process">
              <h2>{{ value.process }}</h2>
            </a>
            <p>{{ value.description }}</p>

            <section class="topics">
              <div>
                <strong>Outbound Topic: </strong>
                <el-tag v-if="value.outbound_topic" type="info" round>{{ value.outbound_topic }}</el-tag>
                <el-tag v-else type="error" round>None</el-tag>
              </div>
              <div>
                <strong>Inbound Topic: </strong>
                <el-tag v-if="value.inbound_topic" type="info" round>{{ value.inbound_topic }}</el-tag>
                <el-tag v-else type="error" round>None</el-tag>
              </div>
            </section>

            <section>
              <h3>Example Outbound Message</h3>
              <CodeBlock :code="value.example_outbound_message" copyable />
            </section>

            <section>
              <h3>Example Inbound Message</h3>
              <CodeBlock :code="value.example_inbound_message" copyable />
            </section>

            <section v-if="showRequiredFieldInfo(value.requiredFieldInfo)">
              <h3>Required Fields</h3>
              <CodeBlock :code="value.requiredFieldInfo" copyable />
            </section>

            <section v-if="showDependentEndpoints(value.dependent_endpoints)">
              <h3>Dependent Endpoints</h3>
              <ul>
                <li v-for="endpoint in value.dependent_endpoints" :key="endpoint.name">
                  {{ endpoint.version }} — {{ endpoint.name }}
                </li>
              </ul>
            </section>
          </div>
        </div>
      </el-scrollbar>
    </el-main>
  </el-container>

  <!-- <el-container>
    <el-aside class="search-nav" width="20%">
      <MessageDocsSearchNav />
    </el-aside>
    <el-main>
      <el-backtop :right="100" :bottom="100" target="main" />
      <div v-for="(group, key) of messageDocs" :key="key">
        <div v-for="(value, key) of group" :key="value">
          <el-divider content-position="left">{{ value.process }}</el-divider>
          <a v-bind:href="`#${value.process}`" :id="value.process">
            <h2>{{ value.description }}</h2>
          </a>
          <el-collapse v-model="activeNames" @change="handleChange">
            <el-collapse-item title="Outbound Topic" name="1">
              {{ value.outbound_topic }}
            </el-collapse-item>
            <el-collapse-item title="Inbound Topic" name="2">
              {{ value.inbound_topic }}
            </el-collapse-item>
            <el-collapse-item title="Outbound Message" name="3">
              <pre>{{ JSON.stringify(value.example_outbound_message, null, 4) }}</pre>
            </el-collapse-item>
            <el-collapse-item title="Inbound Message" name="4">
              <pre>{{ JSON.stringify(value.example_inbound_message, null, 4) }}</pre>
            </el-collapse-item>
            <el-collapse-item v-if="showRequiredFieldInfo(value.requiredFieldInfo)" title="Required Fields" name="5">
              <pre>{{ JSON.stringify(value.requiredFieldInfo, null, 4) }}</pre>
            </el-collapse-item>
            <el-collapse-item v-if="showDependentEndpoints(value.dependent_endpoints)" title="Dependent Endpoints"
              name="6">
              <ul>
                <li v-for="(endpoint, key) of value.dependent_endpoints">
                  {{ endpoint.version }}: {{ endpoint.name }}
                </li>
              </ul>
            </el-collapse-item>
          </el-collapse>
          <el-divider content-position="right">{{ value.process }}</el-divider>
          <br />
          <br />
          <br />
          <br />
        </div>
      </div>
    </el-main>
  </el-container> -->
</template>

<style scoped>
.message-docs-container {
  height: calc(100vh - 60px);
}
.search-nav :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
}
.search-nav :deep(.el-scrollbar__view) {
  padding: 10px;
}
.message-docs-content {
  color: #39455f;
  font-family: 'Roboto';
  padding: 0;
}
.message-docs-content :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
}
.message-docs-content :deep(.el-scrollbar__view) {
  padding: 25px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
  box-sizing: border-box;
}

h2 {
  word-wrap: break-word;
  overflow-wrap: break-word;
}

section {
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
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

/* .content :deep(a) {
  text-decoration: none;
  color: #ffffff;
  font-family: 'Roboto';
  font-size: 14px;
  border-radius: 3px;
  background-color: #52b165;
  padding: 1px;
} */

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
</style>
