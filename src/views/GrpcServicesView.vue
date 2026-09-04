<!--
  - Open Bank Project -  API Explorer II
  - Copyright (C) 2023-2026, TESOBE GmbH
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
import { ref, onMounted, computed } from 'vue'

interface FieldInfo {
  name: string
  type: string
  rule?: string
  id: number
}

interface MethodInfo {
  name: string
  requestType: string
  responseType: string
  requestStream: boolean
  responseStream: boolean
  requestFields: FieldInfo[]
  responseFields: FieldInfo[]
}

interface ServiceInfo {
  name: string
  methods: MethodInfo[]
  error?: string
}

const loading = ref(true)
const errorMessage = ref<string | null>(null)
const host = ref<string>('')
const services = ref<ServiceInfo[]>([])
const search = ref('')

const filteredServices = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return services.value
  return services.value
    .map((s) => {
      const serviceMatches = s.name.toLowerCase().includes(q)
      const methods = s.methods.filter((m) => m.name.toLowerCase().includes(q))
      if (serviceMatches) return s
      if (methods.length > 0) return { ...s, methods }
      return null
    })
    .filter((s): s is ServiceInfo => s !== null)
})

function shortType(fqn: string): string {
  if (!fqn) return ''
  const trimmed = fqn.startsWith('.') ? fqn.slice(1) : fqn
  const parts = trimmed.split('.')
  return parts[parts.length - 1]
}

function methodSignature(m: MethodInfo): string {
  const req = `${m.requestStream ? 'stream ' : ''}${shortType(m.requestType)}`
  const res = `${m.responseStream ? 'stream ' : ''}${shortType(m.responseType)}`
  return `rpc ${m.name}(${req}) returns (${res})`
}

async function load() {
  loading.value = true
  errorMessage.value = null
  try {
    const response = await fetch('/api/grpc/services')
    const data = await response.json()
    if (!response.ok) {
      errorMessage.value = data?.error || `Request failed with status ${response.status}`
      host.value = data?.host || ''
      services.value = []
      return
    }
    host.value = data.host || ''
    services.value = data.services || []
  } catch (err: any) {
    errorMessage.value = err?.message || 'Failed to load gRPC services'
    services.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <el-container class="grpc-services-container">
    <el-main>
      <div class="header-row">
        <h1>gRPC Services</h1>
        <el-button :loading="loading" @click="load" size="small">Refresh</el-button>
      </div>

      <p v-if="host" class="host-info">
        Reflecting against <code>{{ host }}</code>
      </p>

      <el-input
        v-model="search"
        placeholder="Filter by service or method name"
        clearable
        class="search-input"
      />

      <div v-if="loading" class="state-message">Loading services…</div>

      <div v-else-if="errorMessage" class="error-message">
        <strong>Could not reach gRPC server.</strong>
        <div class="error-detail">{{ errorMessage }}</div>
        <div class="hint">
          Check that a gRPC server with reflection enabled is running at
          <template v-if="host"><code>{{ host }}</code></template>
          <template v-else>the default host, <code>grpc.&lt;API host&gt;:50051</code></template>.
          Override with the <code>VITE_OBP_GRPC_HOST</code> environment variable.
        </div>
      </div>

      <div v-else-if="filteredServices.length === 0" class="state-message">
        No services found.
      </div>

      <el-collapse v-else class="services-list">
        <el-collapse-item
          v-for="service in filteredServices"
          :key="service.name"
          :name="service.name"
        >
          <template #title>
            <span class="service-name">{{ service.name }}</span>
            <span class="method-count">{{ service.methods.length }} method<span v-if="service.methods.length !== 1">s</span></span>
          </template>

          <div v-if="service.error" class="error-detail">
            Failed to load service definition: {{ service.error }}
          </div>

          <div v-else-if="service.methods.length === 0" class="state-message">
            No methods exposed.
          </div>

          <div v-else class="methods">
            <div v-for="method in service.methods" :key="method.name" class="method-card">
              <div class="method-signature">
                <code>{{ methodSignature(method) }}</code>
              </div>

              <div class="message-section">
                <div class="message-heading">
                  Request: <code>{{ shortType(method.requestType) }}</code>
                  <span v-if="method.requestStream" class="streaming-tag">streaming</span>
                </div>
                <table v-if="method.requestFields.length > 0" class="fields-table">
                  <thead>
                    <tr><th>#</th><th>Field</th><th>Type</th><th>Rule</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="field in method.requestFields" :key="field.name">
                      <td>{{ field.id }}</td>
                      <td>{{ field.name }}</td>
                      <td><code>{{ field.type }}</code></td>
                      <td>{{ field.rule || '' }}</td>
                    </tr>
                  </tbody>
                </table>
                <div v-else class="empty-fields">No fields.</div>
              </div>

              <div class="message-section">
                <div class="message-heading">
                  Response: <code>{{ shortType(method.responseType) }}</code>
                  <span v-if="method.responseStream" class="streaming-tag">streaming</span>
                </div>
                <table v-if="method.responseFields.length > 0" class="fields-table">
                  <thead>
                    <tr><th>#</th><th>Field</th><th>Type</th><th>Rule</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="field in method.responseFields" :key="field.name">
                      <td>{{ field.id }}</td>
                      <td>{{ field.name }}</td>
                      <td><code>{{ field.type }}</code></td>
                      <td>{{ field.rule || '' }}</td>
                    </tr>
                  </tbody>
                </table>
                <div v-else class="empty-fields">No fields.</div>
              </div>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </el-main>
  </el-container>
</template>

<style scoped>
.grpc-services-container {
  min-height: calc(100vh - 60px);
  padding: 2rem;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.host-info {
  color: #606266;
  font-size: 0.9rem;
  margin: 0 0 1rem 0;
}

.search-input {
  max-width: 400px;
  margin-bottom: 1.5rem;
}

.state-message {
  color: #909399;
  font-style: italic;
  padding: 1rem 0;
}

.error-message {
  border: 1px solid #f56c6c;
  background-color: #fef0f0;
  color: #f56c6c;
  padding: 1rem;
  border-radius: 4px;
}

.error-detail {
  margin-top: 0.5rem;
  color: #606266;
  font-size: 0.9rem;
}

.hint {
  margin-top: 0.5rem;
  color: #909399;
  font-size: 0.85rem;
}

.services-list {
  border: none;
}

.service-name {
  font-weight: 600;
  color: #303133;
  margin-right: 1rem;
}

.method-count {
  color: #909399;
  font-size: 0.85rem;
}

.methods {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.method-card {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 1rem;
  background-color: #fafafa;
}

.method-signature {
  font-family: 'Roboto Mono', monospace;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 0.75rem;
}

.message-section {
  margin-top: 0.75rem;
}

.message-heading {
  font-size: 0.9rem;
  color: #606266;
  margin-bottom: 0.5rem;
}

.streaming-tag {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 1px 6px;
  background-color: #409eff;
  color: white;
  border-radius: 3px;
  font-size: 0.75rem;
}

.fields-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.fields-table th,
.fields-table td {
  text-align: left;
  padding: 6px 10px;
  border-bottom: 1px solid #ebeef5;
}

.fields-table th {
  font-weight: 500;
  color: #909399;
  background-color: #f5f7fa;
}

.empty-fields {
  color: #909399;
  font-style: italic;
  font-size: 0.9rem;
}

code {
  font-family: 'Roboto Mono', monospace;
  background-color: #f5f7fa;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 0.85em;
}
</style>
