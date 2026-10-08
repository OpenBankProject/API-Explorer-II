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
import { computed, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { obpGroupedMessageDocsJsonSchemaKey, obpGroupedMessageDocsKey } from '@/obp/keys'

// Picks the connector whose message docs (or their JSON Schema) the message docs pages show.
const route = useRoute()
const router = useRouter()
const connectors = Object.keys(inject(obpGroupedMessageDocsKey, {}) || {}).sort()
const jsonSchemaConnectors = Object.keys(inject(obpGroupedMessageDocsJsonSchemaKey, {}) || {}).sort()

const routeNames = { docs: 'message-docs', jsonSchema: 'message-docs-json-schema' } as const
type Kind = keyof typeof routeNames

// An option's value is "<kind>:<connector>", so a connector can appear in both groups.
const selected = computed(() => {
  const id = typeof route.params.id === 'string' ? route.params.id : ''
  if (route.name === routeNames.docs && id) return `docs:${id}`
  if (route.name === routeNames.jsonSchema && id) return `jsonSchema:${id}`
  return ''
})

const selectConnector = (value: string) => {
  const separator = value.indexOf(':')
  const kind = value.slice(0, separator) as Kind
  router.push({ name: routeNames[kind], params: { id: value.slice(separator + 1) } })
}
</script>

<template>
  <div class="connector-select">
    <label for="message-docs-connector-select">Connector</label>
    <el-select
      id="message-docs-connector-select"
      :model-value="selected"
      placeholder="Select a connector"
      filterable
      @change="selectConnector"
    >
      <el-option-group v-if="connectors.length > 0" label="Message Docs">
        <el-option v-for="connector in connectors" :key="`docs:${connector}`" :label="connector" :value="`docs:${connector}`" />
      </el-option-group>
      <el-option-group v-if="jsonSchemaConnectors.length > 0" label="JSON Schema">
        <el-option
          v-for="connector in jsonSchemaConnectors"
          :key="`jsonSchema:${connector}`"
          :label="`${connector} (JSON Schema)`"
          :value="`jsonSchema:${connector}`"
        />
      </el-option-group>
    </el-select>
  </div>
</template>

<style scoped>
.connector-select {
  display: flex;
  align-items: center;
  gap: 10px;
}

.connector-select label {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.connector-select .el-select {
  width: 320px;
  max-width: 100%;
}
</style>
