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
import { ref, computed, onBeforeMount } from 'vue'
import { SuccessFilled, RemoveFilled, WarningFilled } from '@element-plus/icons-vue'
import { serverStatus } from './../obp'
import { runSseProbe, type SseProbeResult } from './../obp/sseProbe'

interface OIDCProviderHealth {
  name: string
  status: 'healthy' | 'unhealthy'
  error?: string
  details?: Record<string, string | number>
}

const status = ref<any>({})
// Browser → server SSE transport check: verifies probe events arrive spaced,
// not buffered by a proxy — the hop the server-side checks cannot see.
const sseProbe = ref<SseProbeResult | null>(null)
onBeforeMount(async () => {
  runSseProbe().then((result) => {
    sseProbe.value = result
  })
  status.value = await serverStatus()
})

// 'healthy' | 'partial' | 'unhealthy'; fall back to the legacy boolean
// for a server that doesn't send overallStatus yet.
const overallStatus = computed<string>(() => {
  if (status.value.overallStatus) return status.value.overallStatus
  return status.value.status === true ? 'healthy' : 'unhealthy'
})

// Core OBP checks are the boolean fields (apiVersions, resourceDocs, ...)
const coreChecks = computed<Record<string, boolean>>(() =>
  Object.fromEntries(
    Object.entries(status.value).filter(
      ([name, value]) => typeof value === 'boolean' && name !== 'status'
    )
  ) as Record<string, boolean>
)

const oauthProviders = computed<OIDCProviderHealth[]>(() => status.value.oauthProviders ?? [])
</script>

<template>
  <main>
    <div class="content">
      <div v-if="Object.keys(status).length > 0" class="status" data-testid="overall-status" :data-state="overallStatus">
        <el-icon
          v-if="overallStatus === 'healthy'"
          style="vertical-align: middle; color: green; width: auto"
          ><SuccessFilled
        /></el-icon>
        <el-icon
          v-else-if="overallStatus === 'partial'"
          style="vertical-align: middle; color: #e6a23c; width: auto"
          ><WarningFilled
        /></el-icon>
        <el-icon v-else style="vertical-align: middle; color: red"><RemoveFilled /></el-icon>
        <span class="main-status-label">{{ overallStatus }}</span>
      </div>

      <div v-for="(value, name) in coreChecks" :key="name" class="sub-status">
        <span class="status-label">{{ name }}</span>
        &nbsp;&nbsp;&nbsp;<el-divider />&nbsp;&nbsp;&nbsp;
        <el-icon
          v-if="value === true"
          style="vertical-align: middle; color: green; font-size: 16px"
          ><SuccessFilled
        /></el-icon>
        <el-icon v-else style="vertical-align: middle; color: red"><RemoveFilled /></el-icon>
      </div>

      <div
        v-if="sseProbe"
        data-testid="sse-streaming-browser"
        :data-state="sseProbe.ok ? 'healthy' : 'unhealthy'"
      >
        <div class="sub-status">
          <span class="status-label">sseStreaming (browser)</span>
          &nbsp;&nbsp;&nbsp;<el-divider />&nbsp;&nbsp;&nbsp;
          <el-icon
            v-if="sseProbe.ok"
            style="vertical-align: middle; color: green; font-size: 16px"
            ><SuccessFilled
          /></el-icon>
          <el-icon v-else style="vertical-align: middle; color: red"><RemoveFilled /></el-icon>
        </div>
        <div v-if="sseProbe.error" class="provider-error">{{ sseProbe.error }}</div>
        <div v-else class="provider-detail">
          first event: {{ sseProbe.timeToFirstEventMs }}ms, spread: {{ sseProbe.eventSpreadMs }}ms
        </div>
      </div>

      <div v-if="oauthProviders.length > 0" class="providers-section">
        <span class="providers-title">OAuth2 / OIDC Providers</span>
        <div
          v-for="provider in oauthProviders"
          :key="provider.name"
          class="provider-row"
          :data-testid="`provider-${provider.name}`"
          :data-state="provider.status"
        >
          <div class="sub-status">
            <span class="status-label">{{ provider.name }}</span>
            &nbsp;&nbsp;&nbsp;<el-divider />&nbsp;&nbsp;&nbsp;
            <el-icon
              v-if="provider.status === 'healthy'"
              style="vertical-align: middle; color: green; font-size: 16px"
              ><SuccessFilled
            /></el-icon>
            <el-icon v-else style="vertical-align: middle; color: red"><RemoveFilled /></el-icon>
          </div>
          <div v-if="provider.error" class="provider-error">{{ provider.error }}</div>
          <template v-else-if="provider.details?.token_test">
            <div class="provider-detail">token test: {{ provider.details.token_test }}</div>
            <div
              v-if="provider.details.consumer_id"
              class="provider-detail"
              :data-testid="`provider-${provider.name}-consumer`"
            >
              consumer: {{ provider.details.consumer_name }}
              (<a
                v-if="provider.details.consumer_id_url"
                :href="String(provider.details.consumer_id_url)"
                class="provider-link"
                >{{ provider.details.consumer_id }}</a
              ><span v-else>{{ provider.details.consumer_id }}</span>)
            </div>
            <div v-else-if="provider.details.consumer" class="provider-detail">
              consumer: {{ provider.details.consumer }}
            </div>
          </template>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
main {
  margin-top: -60px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #39455f;
  font-family: 'roboto';
  font-size: 30px;
}
span {
  font-size: 14px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.content {
  width: 30%;
}
.main-status-label {
  display: block;
  font-size: 28px;
  padding: 15px;
}
.main-status-label:first-letter {
  text-transform: uppercase;
}
.status-label {
  font-size: 16px;
}
.status {
  display: inline-grid;
  justify-content: center;
  align-items: center;
  width: 100%;
}
.sub-status {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}
.providers-section {
  margin-top: 30px;
}
.providers-title {
  font-size: 16px;
  font-weight: 500;
  display: flex;
  justify-content: center;
  margin-bottom: 5px;
}
.provider-error {
  font-size: 12px;
  color: #c45656;
  text-align: center;
  overflow-wrap: anywhere;
  margin: 2px 0 8px;
}
.provider-detail {
  font-size: 12px;
  color: #7a8499;
  text-align: center;
  margin: 2px 0 8px;
}
.provider-link {
  color: inherit;
  text-decoration: underline;
}
</style>
