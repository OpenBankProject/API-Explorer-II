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
import { ref, inject, watchEffect, onMounted } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { OBP_API_VERSION, getCurrentUser } from '../obp'
import { getOBPAPIVersions } from '../obp/api-version'
import {
  LOGO_URL as logoSource,
  HEADER_LINKS_COLOR,
  HEADER_LINKS_HOVER_COLOR as headerLinksHoverColorSetting,
  HEADER_LINKS_BACKGROUND_COLOR as headerLinksBackgroundColorSetting
} from '../obp/style-setting'
import { obpApiActiveVersionsKey, obpGroupedMessageDocsKey, obpMyCollectionsEndpointKey } from '@/obp/keys'

const route = useRoute()
const router = useRouter()
const obpApiHost = ref(import.meta.env.VITE_OBP_API_HOST)
const obpApiManagerHost = ref(import.meta.env.VITE_OBP_API_MANAGER_HOST)
const loginUsername = ref('')
const logoffurl = ref('')
const obpApiVersions = ref(inject(obpApiActiveVersionsKey)!)
const obpMessageDocs = ref(Object.keys(inject(obpGroupedMessageDocsKey)!))
const isShowLoginButton = ref(true)
const isShowLogOffButton = ref(false)
const logo = ref(logoSource)
const headerLinksHoverColor = ref(headerLinksHoverColorSetting)
const headerLinksBackgroundColor = ref(headerLinksBackgroundColorSetting)

const clearActiveTab = () => {
  const activeLinks = document.querySelectorAll('.router-link')
  for (const active of activeLinks) {
    if (active.id) {
      active.style.backgroundColor = 'transparent'
      active.style.color = '#39455f'
    }
  }
}

const setActive = (target) => {
  if (target) {
    clearActiveTab()
    target.style.backgroundColor = headerLinksBackgroundColor.value
    target.style.color = HEADER_LINKS_COLOR
  }
}

const handleMore = (command: string) => {
  let element = document.getElementById("selected-api-version")
  if (element !== null) {
    element.textContent = command;
  }
  if (command.includes('_')) {
    router.push({ name: 'message-docs', params: { id: command } })
  } else {
    router.replace({ path: '/operationid', query: { version: command } })
  }
}

onMounted(async () => {
  const currentUser = await getCurrentUser()
  const currentResponseKeys = Object.keys(currentUser)
  if (currentResponseKeys.includes('username')) {
    isShowLoginButton.value = false
    isShowLogOffButton.value = !isShowLoginButton.value
    loginUsername.value = currentUser.username
  } else {
    isShowLoginButton.value = true
    isShowLogOffButton.value = !isShowLoginButton.value
  }
})

watchEffect(() => {
  const path = route.name
  if (path && route.params && !route.params.id) {
    setActive(document.getElementById('header-nav-' + path))
  } else {
    if (path == 'message-docs') {
      clearActiveTab()
    } else {
      setActive(document.getElementById('header-nav-tags'))
    }
  }
})
</script>

<template>
  <img alt="OBP logo" class="logo" v-show="logo" :src="logo" />
  <img alt="OBP logo" class="logo" v-show="!logo" src="@/assets/logo2x-1.png" />
  <nav id="nav">
    <RouterView name="header">
      <a v-bind:href="obpApiHost" class="router-link" id="header-nav-home">
        {{ $t('header.portal_home') }}
      </a>
      <RouterLink class="router-link" id="header-nav-tags" :to="'/operationid?version=OBP' + OBP_API_VERSION">{{
        $t('header.api_explorer') }}</RouterLink>
      <RouterLink class="router-link" id="header-nav-glossary" to="/glossary">{{
        $t('header.glossary')
      }}</RouterLink>
      <a v-bind:href="obpApiManagerHost" class="router-link" id="header-nav-api-manager">
        {{ $t('header.api_manager') }}
      </a>
      <span class="el-dropdown-link">
        <el-dropdown class="menu-right router-link" id="header-nav-more" @command="handleMore">
          <span class="el-dropdown-link">
            {{ $t('header.more') }}
            <el-icon class="el-icon--right">
              <arrow-down />
            </el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="value in obpApiVersions" :command="value" key="value">{{
                value
              }}</el-dropdown-item>
              <el-dropdown-item v-for="value in obpMessageDocs" :command="value" key="value">
                Message Docs for: {{ value }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </span>
      <!--<span class="el-dropdown-link">
        <RouterLink class="router-link" id="header-nav-spaces" to="/spaces">{{
          $t('header.spaces')
        }}</RouterLink>
        <el-icon class="el-icon--right">
          <arrow-down />
        </el-icon>
      </span>-->
      <a v-bind:href="'/api/connect'" v-show="isShowLoginButton" class="login-button router-link">
        {{ $t('header.login') }}
      </a>
      <span v-show="isShowLogOffButton" class="login-user">{{ loginUsername }}</span>
      <a v-bind:href="'/api/user/logoff'" v-show="isShowLogOffButton" class="logoff-button router-link">
        {{ $t('header.logoff') }}
      </a>
    </RouterView>
  </nav>
</template>

<style>
nav {
  text-align: right;
  display: table-cell;
  vertical-align: middle;
}

.logo {
  display: table-cell;
  vertical-align: middle;
  transform: translateY(-50%);
  top: 50%;
}

.header {
  position: relative;
  display: table;
}

.header::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 1px;
  background-color: var(--el-border-color-light);
  z-index: var(--el-index-normal);
}

.login-user {
  font-family: 'Roboto';
  padding: 9px;
  color: #39455f;
  font-size: 14px;
  border-radius: 8px;
}

.router-link {
  padding: 9px;
  margin: 3px;
  color: #39455f;
  font-family: 'Roboto';
  font-size: 14px;
  text-decoration: none;
  border-radius: 8px;
}

.router-link:hover {
  background-color: v-bind(headerLinksBackgroundColor) !important;
  color: v-bind(headerLinksHoverColor) !important;
}

.logo {
  height: 40px;
  position: absolute;
  cursor: pointer;
}

.login-button,
.logoff-button {
  margin: 5px;
  color: #ffffff;
  background-color: #32b9ce;
  cursor: pointer;
}

.login-button:hover,
.logoff-button:hover {
  color: #39455f;
}

/*override element plus*/
.el-dropdown-menu__item:hover {
  color: v-bind(headerLinksHoverColor) !important;
}
</style>
