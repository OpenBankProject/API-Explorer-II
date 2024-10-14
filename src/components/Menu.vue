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
import { inject, ref } from 'vue'
import { updateServerStatus, clearCacheByName } from '@/obp/common-functions';
import { obpApiHostKey } from '@/obp/keys';

const APP_VERSION = ref(__APP_VERSION__)
const i18n = inject('i18n')
const OBP_API_HOST = inject(obpApiHostKey)
const searchLinksColor = ref(searchLinksColorSetting)
const handleLocale = (command: string) => {
  i18n.global.locale.value = command
}
const updateStatus = (event: any) => {
  updateServerStatus()
}
const clearCacheStorage = (event: any) => {
  clearCacheByName('obp-message-docs-cache')
  clearCacheByName('obp-resource-docs-cache')
}
</script>

<template>
  <el-row>
    <el-col :span="10" class="menu-left">
      &nbsp;&nbsp;
      <span id="selected-api-version" class="host">OBPv5.1.0</span>
    </el-col>
    <el-col :span="14" class="menu-right">
      <span class="host" id="cache-storage-status" @click="clearCacheStorage">App Version: {{ APP_VERSION }}</span>
      &nbsp;&nbsp;
      <span class="host"><span id="backend-status" @click="updateStatus">API Host: </span>
        <a :href="OBP_API_HOST">
          {{ OBP_API_HOST }}
        </a>
      </span>
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
</style>
