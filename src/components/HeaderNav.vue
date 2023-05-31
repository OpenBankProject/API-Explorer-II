<script setup lang="ts">
import { ref, watchEffect, onMounted } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'
import { getCurrentUser } from '../obp'

const route = useRoute()
const obpApiHost = ref(import.meta.env.VITE_OBP_API_HOST)
const obpApiManagerHost = ref(import.meta.env.VITE_OBP_API_MANAGER_HOST)
const loginUsername = ref('')
const logOffUrl = ref('')
const isShowLoginButton = ref(true)
const isShowLogOffButton = ref(false)

const clearActiveTab = () => {
  const activeLinks = document.querySelectorAll('.router-link')
  for (const active of activeLinks) {
    if (active.id) active.style.backgroundColor = 'transparent'
  }
}

const setActive = (target) => {
  if (target) {
    clearActiveTab()
    target.style.backgroundColor = '#eef0f4'
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
    setActive(document.getElementById('header-nav-tags'))
  }
})
</script>

<template>
  <img alt="OBP logo" class="logo" src="@/assets/logo2x-1.png" />
  <nav id="nav">
    <RouterView name="header">
      <a v-bind:href="obpApiHost" class="router-link" id="header-nav-home">
        {{ $t('header.portal_home') }}
      </a>
      <RouterLink class="router-link" id="header-nav-tags" to="/operationid">{{
        $t('header.api_explorer')
      }}</RouterLink>
      <RouterLink class="router-link" id="header-nav-glossary" to="/glossary">{{
        $t('header.glossary')
      }}</RouterLink>
      <a v-bind:href="obpApiManagerHost" class="router-link" id="header-nav-api-manager">
        {{ $t('header.api_manager') }}
      </a>
      <span class="el-dropdown-link">
        <el-dropdown class="menu-right router-link" id="header-nav-spaces">
          <span class="el-dropdown-link">
            {{ $t('header.more') }}
            <el-icon class="el-icon--right">
              <arrow-down />
            </el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item key="messageDocs">Message Docs</el-dropdown-item>
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
      <a
        v-bind:href="'/api/user/logoff'"
        v-show="isShowLogOffButton"
        class="logoff-button router-link"
      >
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
  background-color: #eef0f4 !important;
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
</style>
