<script setup lang="ts">
import { watchEffect } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'

const route = useRoute()

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
      <a
        v-bind:href="'https://apisandbox.openbankproject.com/'"
        class="router-link"
        id="header-nav-home"
      >
        {{ $t('header.portal_home') }}
      </a>
      <RouterLink class="router-link" id="header-nav-tags" to="/tags">{{
        $t('header.api_explorer')
      }}</RouterLink>
      <RouterLink class="router-link" id="header-nav-glossary" to="/glossary">{{
        $t('header.glossary')
      }}</RouterLink>
      <a
        v-bind:href="'https://apimanagersandbox.openbankproject.com'"
        class="router-link"
        id="header-nav-api-manager"
      >
        {{ $t('header.api_manager') }}
      </a>
      <span class="el-dropdown-link">
        <RouterLink class="router-link" id="header-nav-more" to="/">{{
          $t('header.more')
        }}</RouterLink>
        <el-icon class="el-icon--right">
          <arrow-down />
        </el-icon>
      </span>
      <span class="el-dropdown-link">
        <RouterLink class="router-link" id="header-nav-spaces" to="/spaces">{{
          $t('header.spaces')
        }}</RouterLink>
        <el-icon class="el-icon--right">
          <arrow-down />
        </el-icon>
      </span>
      <a v-bind:href="'/api/connect'" class="login-button router-link">
        {{ $t('header.login') }}
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

.login-button {
  margin: 5px;
  color: #ffffff;
  background-color: #32b9ce;
}

.login-button:hover {
  color: #39455f;
}
</style>
