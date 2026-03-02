<!--
  Open Bank Project -  API Explorer II
  Copyright (C) 2023-2025, TESOBE GmbH

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.

  Email: contact@tesobe.com
  TESOBE GmbH
  Osloerstrasse 16/17
  Berlin 13359, Germany

    This product includes software developed at
    TESOBE (http://www.tesobe.com/)
-->

<template>
  <div class="oidc-debug-view">
    <div class="header">
      <h1>OIDC Provider Discovery</h1>
      <el-button type="primary" @click="refreshDebugInfo" :loading="loading">
        <el-icon><Refresh /></el-icon>
        Refresh
      </el-button>
    </div>

    <el-alert type="info" :closable="false" style="margin-bottom: 20px">
      <p><strong>Step 1:</strong> API Explorer discovers providers from OBP API: <code>{{ obpWellKnownUrl }}</code></p>
      <p><strong>Step 2:</strong> For each provider, fetch their OIDC configuration from their .well-known URL</p>
    </el-alert>

    <div v-if="loading" v-loading="loading" class="loading-container">
      <p>Loading provider information...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <el-alert type="error" :closable="false">
        <p><strong>Error:</strong> {{ error }}</p>
      </el-alert>
    </div>

    <div v-else-if="debugInfo">
      <!-- OBP API Discovery Status -->
      <el-card class="section-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>Step 1: OBP API Provider Discovery</span>
            <el-tag :type="debugInfo.discoveryProcess.step1_obpApiDiscovery.success ? 'success' : 'danger'">
              {{ debugInfo.discoveryProcess.step1_obpApiDiscovery.success ? 'Success' : 'Failed' }}
            </el-tag>
          </div>
        </template>
        <div class="section-content">
          <div class="info-row">
            <label>OBP API Endpoint:</label>
            <code>{{ debugInfo.discoveryProcess.step1_obpApiDiscovery.endpoint }}</code>
          </div>
          <div class="info-row">
            <label>Providers Discovered:</label>
            <span>{{ debugInfo.discoveryProcess.step1_obpApiDiscovery.providers.length }}</span>
          </div>
          <div v-if="debugInfo.discoveryProcess.step1_obpApiDiscovery.error" class="error-message">
            <strong>Error:</strong> {{ debugInfo.discoveryProcess.step1_obpApiDiscovery.error }}
          </div>
        </div>
      </el-card>

      <!-- Provider List -->
      <el-card class="section-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>Step 2: Provider OIDC Configurations</span>
            <el-tag type="info">{{ debugInfo.discoveryProcess.step2_providerConfigurations.length }} Provider(s)</el-tag>
          </div>
        </template>
        <div class="section-content">
          <div v-if="debugInfo.discoveryProcess.step2_providerConfigurations.length === 0" class="no-data">
            <el-empty description="No providers found" />
          </div>

          <div v-else class="provider-list">
            <div
              v-for="provider in debugInfo.discoveryProcess.step2_providerConfigurations"
              :key="provider.providerName"
              class="provider-item"
              :class="{ 'provider-success': provider.success, 'provider-error': !provider.success }"
            >
              <div class="provider-header">
                <h3>{{ provider.providerName }}</h3>
                <el-tag :type="provider.success ? 'success' : 'danger'" size="small">
                  {{ provider.success ? 'Success' : 'Failed' }}
                </el-tag>
              </div>

              <div class="provider-details">
                <div class="detail-row">
                  <label>Well-Known URL:</label>
                  <div class="url-display">
                    <code>{{ provider.wellKnownUrl }}</code>
                    <el-button size="small" @click="copyToClipboard(provider.wellKnownUrl)" text>
                      <el-icon><CopyDocument /></el-icon>
                      Copy
                    </el-button>
                    <el-button size="small" @click="testEndpoint(provider.wellKnownUrl)" text>
                      <el-icon><Link /></el-icon>
                      Test
                    </el-button>
                  </div>
                </div>

                <div v-if="provider.error" class="error-message">
                  <strong>Error:</strong> {{ provider.error }}
                </div>

                <div v-if="provider.success" class="endpoints-section">
                  <label>OIDC Endpoints:</label>
                  <div class="endpoints-list">
                    <div class="endpoint-row">
                      <span class="endpoint-label">Issuer:</span>
                      <code>{{ provider.issuer }}</code>
                    </div>
                    <div class="endpoint-row">
                      <span class="endpoint-label">Authorization:</span>
                      <code>{{ provider.endpoints.authorization }}</code>
                    </div>
                    <div class="endpoint-row">
                      <span class="endpoint-label">Token:</span>
                      <code>{{ provider.endpoints.token }}</code>
                    </div>
                    <div class="endpoint-row">
                      <span class="endpoint-label">UserInfo:</span>
                      <code>{{ provider.endpoints.userinfo }}</code>
                    </div>
                    <div class="endpoint-row">
                      <span class="endpoint-label">JWKS:</span>
                      <code>{{ provider.endpoints.jwks }}</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, CopyDocument, Link } from '@element-plus/icons-vue'

interface DebugInfo {
  discoveryProcess: {
    step1_obpApiDiscovery: {
      endpoint: string
      success: boolean
      error: string | null
      providers: Array<{ provider: string; url: string }>
    }
    step2_providerConfigurations: Array<{
      providerName: string
      wellKnownUrl: string
      success: boolean
      error: string | null
      endpoints: {
        authorization: string | null
        token: string | null
        userinfo: string | null
        jwks: string | null
      }
      issuer: string | null
    }>
  }
}

const loading = ref(true)
const error = ref<string | null>(null)
const debugInfo = ref<DebugInfo | null>(null)

const obpWellKnownUrl = computed(() => {
  return debugInfo.value?.discoveryProcess.step1_obpApiDiscovery.endpoint || 'Loading...'
})

const fetchDebugInfo = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await fetch('/api/status/oidc-debug')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    debugInfo.value = await response.json()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error'
    ElMessage.error('Failed to load provider information')
  } finally {
    loading.value = false
  }
}

const refreshDebugInfo = async () => {
  ElMessage.info('Refreshing provider information...')
  await fetchDebugInfo()
  ElMessage.success('Provider information refreshed')
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('Copied to clipboard')
  } catch (err) {
    ElMessage.error('Failed to copy to clipboard')
  }
}

const testEndpoint = (url: string) => {
  window.open(url, '_blank')
}

onMounted(() => {
  fetchDebugInfo()
})
</script>

<style scoped>
.oidc-debug-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

h1 {
  font-size: 28px;
  color: #303133;
  margin: 0;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  font-size: 16px;
  color: #909399;
}

.error-container {
  margin: 20px 0;
}

.section-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 16px;
}

.section-content {
  padding: 10px 0;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.info-row label {
  font-weight: 500;
  color: #606266;
  min-width: 180px;
}

.info-row code {
  background: #f4f4f5;
  padding: 4px 8px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.no-data {
  padding: 40px;
  text-align: center;
}

.provider-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.provider-item {
  padding: 20px;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  background: #fafafa;
}

.provider-success {
  border-color: #67c23a;
  background: #f0f9ff;
}

.provider-error {
  border-color: #f56c6c;
  background: #fef0f0;
}

.provider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e4e7ed;
}

.provider-header h3 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.provider-details {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row label {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.url-display {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.url-display code {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  word-break: break-all;
}

.error-message {
  padding: 10px;
  background: #fef0f0;
  border-left: 4px solid #f56c6c;
  border-radius: 4px;
  color: #f56c6c;
  font-size: 14px;
}

.endpoints-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.endpoints-section label {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.endpoints-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 15px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.endpoint-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 10px;
  align-items: start;
}

.endpoint-label {
  font-weight: 500;
  color: #909399;
  font-size: 13px;
}

.endpoint-row code {
  background: #f4f4f5;
  padding: 4px 8px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  word-break: break-all;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }

  .info-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .endpoint-row {
    grid-template-columns: 1fr;
  }
}
</style>
