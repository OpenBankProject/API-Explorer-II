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
import { ref, inject, onBeforeMount } from 'vue'
import { obpApiHostKey } from '@/obp/keys'
import { clearCacheByName } from '@/obp/common-functions'
import { serverStatus } from '@/obp'

const APP_VERSION = ref(__APP_VERSION__)
const OBP_API_HOST = inject(obpApiHostKey)
const cacheCleared = ref(false)
const commitId = ref('')

onBeforeMount(async () => {
  try {
    commitId.value = (await serverStatus()).commitId ?? ''
  } catch {
    commitId.value = ''
  }
})

const clearCacheStorage = () => {
  clearCacheByName('obp-message-docs-cache')
  clearCacheByName('obp-resource-docs-cache')
  cacheCleared.value = true
  setTimeout(() => { cacheCleared.value = false }, 3000)
}
</script>

<template>
  <el-container class="about-container">
    <el-main class="about-content">
      <el-scrollbar>
        <div class="about-body">
          <h1 class="about-title">About API Explorer II</h1>
          <table class="about-table">
            <tbody>
              <tr>
                <td class="label">App Version</td>
                <td>{{ APP_VERSION }}</td>
              </tr>
              <tr>
                <td class="label">Commit ID</td>
                <td>{{ commitId || '-' }}</td>
              </tr>
              <tr>
                <td class="label">API Host</td>
                <td>
                  <a :href="OBP_API_HOST">{{ OBP_API_HOST }}</a>
                </td>
              </tr>
              <tr>
                <td class="label">Status</td>
                <td>
                  <RouterLink to="/status">Status</RouterLink>
                </td>
              </tr>
              <tr>
                <td class="label">GitHub</td>
                <td>
                  <a href="https://github.com/OpenBankProject/API-Explorer-II" target="_blank" rel="noopener">OpenBankProject/API-Explorer-II</a>
                </td>
              </tr>
              <tr>
                <td class="label">Copyright</td>
                <td>&copy; TESOBE 2010-2026</td>
              </tr>
              <tr>
                <td class="label">Cache</td>
                <td>
                  <button class="clear-cache-button" @click="clearCacheStorage" :disabled="cacheCleared">
                    {{ cacheCleared ? 'Cache cleared' : 'Clear cache' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </el-scrollbar>
    </el-main>
  </el-container>
</template>

<style scoped>
.about-container {
  height: calc(100vh - 60px);
}

.about-content {
  color: var(--obp-text-strong);
  font-family: 'Roboto';
  padding: 0;
}

.about-content :deep(.el-scrollbar__view) {
  padding: 40px 60px;
}

.about-title {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 30px;
  color: var(--obp-text-strong);
}

.about-body {
  max-width: 600px;
}

.about-table {
  width: 100%;
  border-collapse: collapse;
}

.about-table td {
  padding: 12px 16px;
  font-size: 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.about-table .label {
  font-weight: 700;
  width: 140px;
  color: var(--el-text-color-regular);
}

.about-table a {
  color: var(--el-color-primary);
  text-decoration: none;
}

.about-table a:hover {
  color: #66b1ff;
  text-decoration: underline;
}

.clear-cache-button {
  padding: 6px 16px;
  background-color: #32b9ce;
  color: white;
  border: none;
  border-radius: 6px;
  font-family: 'Roboto', sans-serif;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.clear-cache-button:hover:not(:disabled) {
  background-color: #2a9fb0;
}

.clear-cache-button:disabled {
  background-color: #a0d8e0;
  cursor: default;
}
</style>
