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
  <div class="providers-status-view">
    <h1>OAuth2 Provider Configuration Status</h1>

    <el-alert type="info" :closable="false" style="margin-bottom: 20px">
      <p>This page shows which OAuth2/OIDC identity providers are configured and available for login.</p>
      <p><strong>Note:</strong> Client secrets are masked for security.</p>
      <p>
        <strong>Need more details?</strong> Visit the
        <router-link to="/debug/oidc" style="color: #409eff; text-decoration: underline;">
          OIDC Debug Page
        </router-link>
        for detailed discovery process information.
      </p>
    </el-alert>

    <div v-if="loading" v-loading="loading" class="loading-container">
      <p>Loading provider status...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <el-alert type="error" :closable="false">
        <p><strong>Error loading provider status:</strong></p>
        <p>{{ error }}</p>
      </el-alert>
    </div>

    <div v-else-if="status" class="status-container">
      <!-- Summary Card -->
      <el-card class="summary-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>Summary</span>
            <el-button size="small" @click="refreshStatus">
              <el-icon><Refresh /></el-icon>
              Refresh
            </el-button>
          </div>
        </template>
        <div class="summary-content">
          <div class="summary-item">
            <label>Total Configured Providers:</label>
            <span class="value">{{ status.summary.totalConfigured }}</span>
          </div>
          <div class="summary-item">
            <label>Available Providers:</label>
            <span class="value">{{ status.summary.availableProviders.join(', ') || 'None' }}</span>
          </div>
          <div class="summary-item">
            <label>OBP API Host:</label>
            <span class="value">{{ status.summary.obpApiHost }}</span>
          </div>
        </div>
      </el-card>

      <!-- Provider Status Cards -->
      <h2>Active Providers</h2>
      <div v-if="status.providerStatus.length === 0" class="no-providers">
        <el-empty description="No providers configured">
          <el-button type="primary" @click="openDocs">View Setup Guide</el-button>
        </el-empty>
      </div>
      <div v-else class="provider-cards">
        <el-card
          v-for="provider in status.providerStatus"
          :key="provider.name"
          class="provider-card"
          :class="{ 'provider-healthy': provider.available, 'provider-unhealthy': !provider.available }"
          shadow="hover"
        >
          <template #header>
            <div class="provider-header">
              <span class="provider-name">{{ getProviderDisplayName(provider.name) }}</span>
              <el-tag :type="provider.available ? 'success' : 'danger'" size="small">
                {{ provider.status }}
              </el-tag>
            </div>
          </template>
          <div class="provider-content">
            <div class="provider-detail">
              <label>Provider ID:</label>
              <span>{{ provider.name }}</span>
            </div>
            <div class="provider-detail">
              <label>Status:</label>
              <span :class="provider.available ? 'status-ok' : 'status-error'">
                {{ provider.available ? 'Available' : 'Unavailable' }}
              </span>
            </div>
            <div class="provider-detail">
              <label>Last Checked:</label>
              <span>{{ formatDate(provider.lastChecked) }}</span>
            </div>

            <!-- Enhanced Error Display -->
            <div v-if="provider.error" class="error-section">
              <div class="error-header">
                <el-icon class="error-icon"><WarningFilled /></el-icon>
                <span class="error-category">{{ getErrorCategory(provider.error) }}</span>
              </div>
              <div class="error-message">
                <strong>Error:</strong> {{ getFormattedError(provider.error) }}
              </div>

              <!-- Troubleshooting Hints -->
              <div class="troubleshooting-hints">
                <div class="hint-title">
                  <el-icon><InfoFilled /></el-icon>
                  <strong>Troubleshooting:</strong>
                </div>
                <ul class="hint-list">
                  <li v-for="(hint, index) in getTroubleshootingHints(provider.error)" :key="index">
                    {{ hint }}
                  </li>
                </ul>
              </div>

              <!-- Retry Button -->
              <div class="retry-section">
                <el-button
                  type="primary"
                  size="small"
                  :loading="retryingProviders.has(provider.name)"
                  @click="retryProvider(provider.name)"
                >
                  <el-icon><Refresh /></el-icon>
                  {{ retryingProviders.has(provider.name) ? 'Retrying...' : 'Retry Now' }}
                </el-button>
                <span class="retry-hint">Manual retry to reinitialize this provider</span>
              </div>
            </div>
          </div>
        </el-card>
      </div>

      <!-- Environment Configuration -->
      <h2>Environment Configuration</h2>
      <el-collapse v-model="activeCollapse">
        <el-collapse-item
          v-for="(config, providerKey) in status.environmentConfig"
          :key="providerKey"
          :name="providerKey"
        >
          <template #title>
            <div class="collapse-title">
              <span class="provider-label">{{ getProviderDisplayName(providerKey) }}</span>
              <el-tag v-if="isProviderConfigured(config)" type="success" size="small">
                Configured
              </el-tag>
              <el-tag v-else type="info" size="small">
                Not Configured
              </el-tag>
            </div>
          </template>
          <div class="env-config-content">
            <div v-for="(value, key) in config" :key="key" class="config-item">
              <label>{{ formatConfigKey(key) }}:</label>
              <code>{{ value }}</code>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>

      <div class="note">
        <el-icon><InfoFilled /></el-icon>
        <span>{{ status.note }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, InfoFilled, WarningFilled } from '@element-plus/icons-vue'

interface ProviderStatus {
  name: string
  available: boolean
  status: string
  lastChecked: Date
  error?: string
}

interface EnvConfig {
  [key: string]: {
    [key: string]: string
  }
}

interface StatusResponse {
  summary: {
    totalConfigured: number
    availableProviders: string[]
    obpApiHost: string
  }
  providerStatus: ProviderStatus[]
  environmentConfig: EnvConfig
  note: string
}

const loading = ref(true)
const error = ref<string | null>(null)
const status = ref<StatusResponse | null>(null)
const activeCollapse = ref<string[]>(['obpOidc', 'keycloak', 'google', 'github', 'custom'])
const retryingProviders = ref<Set<string>>(new Set())

const fetchStatus = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await fetch('/api/status/providers')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    status.value = await response.json()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error'
    ElMessage.error('Failed to load provider status')
  } finally {
    loading.value = false
  }
}

const refreshStatus = async () => {
  ElMessage.info('Refreshing provider status...')
  await fetchStatus()
  ElMessage.success('Provider status refreshed')
}

const retryProvider = async (providerName: string) => {
  retryingProviders.value.add(providerName)

  try {
    const response = await fetch(`/api/status/providers/${providerName}/retry`, {
      method: 'POST'
    })

    const result = await response.json()

    if (response.ok && result.success) {
      ElMessage.success(`Provider ${providerName} successfully initialized!`)
      await fetchStatus() // Refresh the status
    } else {
      ElMessage.error(result.message || `Failed to retry provider ${providerName}`)
    }
  } catch (err) {
    ElMessage.error(`Error retrying provider: ${err instanceof Error ? err.message : 'Unknown error'}`)
  } finally {
    retryingProviders.value.delete(providerName)
  }
}

const getErrorCategory = (errorMsg: string): string => {
  if (!errorMsg) return 'Unknown Error'

  const msg = errorMsg.toLowerCase()

  if (msg.includes('http 4') || msg.includes('http 5')) {
    return 'HTTP Error'
  } else if (msg.includes('timeout') || msg.includes('network') || msg.includes('fetch')) {
    return 'Network Error'
  } else if (msg.includes('not configured') || msg.includes('no well-known')) {
    return 'Configuration Error'
  } else if (msg.includes('failed to initialize')) {
    return 'Initialization Error'
  } else if (msg.includes('invalid') || msg.includes('parse')) {
    return 'Validation Error'
  }

  return 'General Error'
}

const getFormattedError = (errorMsg: string): string => {
  if (!errorMsg) return 'Unknown error occurred'

  // Make common errors more user-friendly
  const msg = errorMsg.toLowerCase()

  if (msg.includes('http 404')) {
    return 'Provider endpoint not found (HTTP 404). The OIDC configuration endpoint is not accessible.'
  } else if (msg.includes('http 401') || msg.includes('http 403')) {
    return 'Access denied (HTTP 401/403). Authentication or authorization required.'
  } else if (msg.includes('http 500') || msg.includes('http 502') || msg.includes('http 503')) {
    return 'Provider server error (HTTP 5xx). The identity provider is experiencing issues.'
  } else if (msg.includes('timeout')) {
    return 'Connection timeout. The provider is not responding in a timely manner.'
  } else if (msg.includes('network')) {
    return 'Network connectivity issue. Cannot reach the provider server.'
  } else if (msg.includes('no well-known url configured')) {
    return 'Missing well-known URL. The provider configuration is incomplete.'
  } else if (msg.includes('failed to initialize')) {
    return 'Initialization failed. Could not create OAuth2 client for this provider.'
  }

  return errorMsg
}

const getTroubleshootingHints = (errorMsg: string): string[] => {
  if (!errorMsg) return ['Check server logs for more details']

  const msg = errorMsg.toLowerCase()
  const hints: string[] = []

  if (msg.includes('http 404')) {
    hints.push('Verify the provider\'s well-known URL is correct in the OBP API configuration')
    hints.push('Check that the identity provider is properly deployed and accessible')
    hints.push('Ensure the OIDC discovery endpoint exists at /.well-known/openid-configuration')
  } else if (msg.includes('http 401') || msg.includes('http 403')) {
    hints.push('Check if the provider requires authentication for the discovery endpoint')
    hints.push('Verify API credentials and permissions')
  } else if (msg.includes('http 5')) {
    hints.push('The identity provider may be down or restarting')
    hints.push('Check the provider\'s status page or logs')
    hints.push('Try again in a few minutes')
  } else if (msg.includes('timeout') || msg.includes('network')) {
    hints.push('Verify network connectivity between API Explorer and the identity provider')
    hints.push('Check firewall rules and DNS resolution')
    hints.push('Ensure the provider URL is accessible from the server')
    hints.push('Try accessing the well-known URL manually from the server')
  } else if (msg.includes('no well-known') || msg.includes('not configured')) {
    hints.push('Check environment variables for this provider')
    hints.push('Verify the provider is configured in the OBP API')
    hints.push('Review the SETUP_MULTI_PROVIDER.md documentation')
  } else if (msg.includes('failed to initialize')) {
    hints.push('Check the provider\'s OIDC configuration is valid')
    hints.push('Verify client ID and client secret are correct')
    hints.push('Review server logs for detailed error messages')
  } else {
    hints.push('Check server logs for detailed error information')
    hints.push('Verify the provider configuration in environment variables')
    hints.push('Visit the OIDC Debug page for more details')
  }

  return hints
}

const getProviderDisplayName = (key: string): string => {
  const names: { [key: string]: string } = {
    'obp-oidc': 'OBP-OIDC',
    'obpOidc': 'OBP-OIDC',
    'keycloak': 'Keycloak',
    'google': 'Google',
    'github': 'GitHub',
    'custom': 'Custom Provider'
  }
  return names[key] || key.toUpperCase()
}

const formatConfigKey = (key: string): string => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}

const formatDate = (date: Date | string): string => {
  if (!date) return 'Never'
  const d = new Date(date)
  return d.toLocaleString()
}

const isProviderConfigured = (config: { [key: string]: string }): boolean => {
  return Object.values(config).some(
    (value) => value && value !== 'not configured' && value !== '***masked***'
  )
}

const openDocs = () => {
  window.open('https://github.com/OpenBankProject/OBP-API/wiki/OAuth2', '_blank')
}

onMounted(() => {
  fetchStatus()
})
</script>

<style scoped>
.providers-status-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  font-size: 28px;
  margin-bottom: 20px;
  color: #303133;
}

h2 {
  font-size: 20px;
  margin: 30px 0 15px 0;
  color: #606266;
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

/* Summary Card */
.summary-card {
  margin-bottom: 30px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.summary-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.summary-item:last-child {
  border-bottom: none;
}

.summary-item label {
  font-weight: 500;
  color: #606266;
}

.summary-item .value {
  font-family: 'Courier New', monospace;
  color: #303133;
}

/* Provider Cards */
.no-providers {
  padding: 40px;
  text-align: center;
}

.provider-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.provider-card {
  transition: transform 0.2s;
}

.provider-card:hover {
  transform: translateY(-2px);
}

.provider-healthy {
  border-left: 4px solid #67c23a;
}

.provider-unhealthy {
  border-left: 4px solid #f56c6c;
}

.provider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.provider-name {
  font-size: 16px;
  font-weight: 600;
}

.provider-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.provider-detail {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
}

.provider-detail label {
  font-weight: 500;
  color: #909399;
  margin-right: 10px;
}

.provider-detail span {
  color: #303133;
}

.status-ok {
  color: #67c23a;
  font-weight: 600;
}

.status-error {
  color: #f56c6c;
  font-weight: 600;
}

.error-detail {
  background: #fef0f0;
  padding: 8px;
  border-radius: 4px;
  flex-direction: column;
  align-items: flex-start;
}

/* Enhanced Error Section */
.error-section {
  background: #fef0f0;
  padding: 16px;
  border-radius: 6px;
  border-left: 4px solid #f56c6c;
  margin-top: 12px;
}

.error-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.error-icon {
  color: #f56c6c;
  font-size: 18px;
}

.error-category {
  font-weight: 600;
  color: #f56c6c;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.error-message {
  background: #fff;
  padding: 10px 12px;
  border-radius: 4px;
  border: 1px solid #fbc4c4;
  margin-bottom: 12px;
  font-size: 13px;
  line-height: 1.6;
  color: #303133;
}

.error-message strong {
  color: #f56c6c;
}

.troubleshooting-hints {
  background: #fff;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  margin-bottom: 12px;
}

.hint-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  color: #409eff;
  font-size: 13px;
}

.hint-list {
  margin: 0;
  padding-left: 20px;
  color: #606266;
  font-size: 13px;
  line-height: 1.8;
}

.hint-list li {
  margin-bottom: 4px;
}

.retry-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid #fbc4c4;
}

.retry-hint {
  font-size: 12px;
  color: #909399;
  font-style: italic;
}

/* Environment Config */
.collapse-title {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.provider-label {
  font-weight: 500;
}

.env-config-content {
  padding: 10px 20px;
  background: #fafafa;
  border-radius: 4px;
}

.config-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e4e7ed;
}

.config-item:last-child {
  border-bottom: none;
}

.config-item label {
  font-weight: 500;
  color: #606266;
  min-width: 150px;
}

.config-item code {
  background: #fff;
  padding: 4px 8px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #303133;
  border: 1px solid #dcdfe6;
}

/* Note */
.note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 30px;
  padding: 12px;
  background: #f4f4f5;
  border-radius: 4px;
  font-size: 14px;
  color: #606266;
}

.note .el-icon {
  color: #909399;
}
</style>
