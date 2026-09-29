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
import { ArrowDown } from '@element-plus/icons-vue'
import { SEARCH_LINKS_COLOR as searchLinksColorSetting } from '../obp/style-setting'
import {
  HEADER_LINKS_HOVER_COLOR as headerLinksHoverColorSetting,
  HEADER_LINKS_BACKGROUND_COLOR as headerLinksBackgroundColorSetting
} from '../obp/style-setting'
import { inject, ref, computed, onMounted } from 'vue'

const obpApiHost = ref(import.meta.env.VITE_OBP_API_HOST)
import { getOBPBanks } from '../obp'
import SvelteDropdown from './SvelteDropdown.vue'

const i18n = inject('i18n')
const searchLinksColor = ref(searchLinksColorSetting)
const headerLinksHoverColor = ref(headerLinksHoverColorSetting)
const headerLinksBackgroundColor = ref(headerLinksBackgroundColorSetting)

// Banks state
const banks = ref<Array<{ bank_id: string; bank_code: string; full_name: string }>>([])
const bankItems = computed(() =>
  [...banks.value]
    .sort((a, b) => (a.full_name || a.bank_id || '').localeCompare(b.full_name || b.bank_id || ''))
    .map(b => {
      const name = b.full_name || b.bank_id || ''
      const id = b.bank_id || ''
      return name !== id ? `${name} | ${id}` : id
    })
)
const selectedBankId = ref(localStorage.getItem('obp-selected-bank-id') || '')
const banksDropdownLabel = computed(() => {
  if (selectedBankId.value) {
    const bank = banks.value.find(b => b.bank_id === selectedBankId.value)
    return bank ? (bank.full_name || bank.bank_id) : 'Banks'
  }
  return 'Banks'
})

const handleBankSelect = (item: string) => {
  const parts = item.split(' | ')
  const bankId = parts[parts.length - 1]
  const bank = banks.value.find(b => b.bank_id === bankId)
  if (bank) {
    selectedBankId.value = bank.bank_id
    localStorage.setItem('obp-selected-bank-id', bank.bank_id)
    window.dispatchEvent(new CustomEvent('obp-bank-selected', { detail: bank.bank_id }))
  }
}

onMounted(() => {
  getOBPBanks().then((data) => {
    if (data && data.banks && Array.isArray(data.banks)) {
      banks.value = data.banks
    }
  }).catch((error) => {
    console.error('Failed to fetch banks:', error)
  })
})

const handleLocale = (command: string) => {
  i18n.global.locale.value = command
}
</script>

<template>
  <el-row>
    <el-col :span="10" class="menu-left">
      &nbsp;&nbsp;
      <span id="selected-api-version" class="host"></span>
      <span id="selected-endpoint-tags" class="endpoint-tags"></span>
    </el-col>
    <el-col :span="14" class="menu-right">
      <a :href="obpApiHost" class="api-host-label" target="_blank">{{ obpApiHost }}</a>
      <SvelteDropdown
        class="menu-right bank-selector"
        id="menu-nav-banks"
        :label="banksDropdownLabel"
        :items="bankItems"
        :hover-color="headerLinksHoverColor"
        :background-color="headerLinksBackgroundColor"
        @select="handleBankSelect"
      />
      &nbsp;&nbsp;
      <el-dropdown class="menu-right" @command="handleLocale">
        <span class="el-dropdown-link">
          {{ $i18n.locale }}
          <el-icon class="el-icon--right">
            <arrow-down />
          </el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="locale in $i18n.availableLocales" :key="`locale-${locale}`" :command="locale">{{
              locale }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </el-col>
  </el-row>
</template>

<style scoped>
a {
  font-size: 14px;
  font-family: 'Roboto';
  color: #7787a6;
  text-decoration: none;
}

a:hover {
  color: v-bind(searchLinksColor);
}

.host {
  font-size: 14px;
  font-family: 'Roboto';
}

.menu-left,
.menu-right,
.el-dropdown-menu {
  color: #7787a6;
}

.server-is-online {
  color: v-bind(searchLinksColor);
}

.server-is-offline {
  color: red;
}

.text-is-red {
  color: red;
}

.endpoint-tags {
  margin-left: 10px;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.endpoint-tags :deep(.tag-link) {
  color: var(--el-color-primary);
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.endpoint-tags :deep(.tag-link:hover) {
  color: #66b1ff;
  text-decoration: underline;
}

.api-host-label {
  font-size: 14px;
  font-family: 'Roboto';
  color: #7787a6;
  margin-right: 10px;
  vertical-align: middle;
}

.bank-selector {
  display: inline-block;
  vertical-align: middle;
  margin-right: 10px;
}
</style>
