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
import { useRouter } from 'vue-router'
import { obpGroupedMessageDocsKey } from '@/obp/keys'

const router = useRouter()
const groupedMessageDocs = ref(inject(obpGroupedMessageDocsKey) || {})

const connectorList = computed(() => {
  return Object.keys(groupedMessageDocs.value || {}).sort()
})

function navigateToConnector(connectorId: string) {
  router.push(`/message-docs/${connectorId}`)
}
</script>

<template>
  <el-container class="message-docs-list-container">
    <el-main>
      <h1>Message Documentation</h1>

      <div class="message-docs-list">
        <div v-if="connectorList.length === 0" class="empty-message">
          No message documentation available
        </div>
        <div v-else>
          <a
            v-for="connector in connectorList"
            :key="connector"
            @click="navigateToConnector(connector)"
            class="message-doc-link"
          >
            {{ connector }}
          </a>
        </div>
      </div>
    </el-main>
  </el-container>
</template>

<style scoped>
.message-docs-list-container {
  min-height: calc(100vh - 60px);
  padding: 2rem;
}

h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #303133;
  margin-bottom: 1.5rem;
}

.message-docs-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.message-doc-link {
  padding: 12px 16px;
  color: #409eff;
  text-decoration: none;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
  display: block;
}

.message-doc-link:hover {
  background-color: #ecf5ff;
  color: #337ecc;
}

.empty-message {
  color: #909399;
  font-style: italic;
}
</style>
