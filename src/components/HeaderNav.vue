<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'

const clearActiveTab = () => {
  const activeLinks = document.querySelectorAll('#header-nav')
  for (const active of activeLinks) {
    active.style.backgroundColor = 'transparent'
  }
}

const setActive = (event) => {
  clearActiveTab()
  const target = event.target
  target.style.backgroundColor = '#eef0f4'
}
</script>

<template>
  <img alt="OBP logo" class="logo" src="@/assets/logo2x-1.png" />
  <nav id="nav">
    <RouterView name="header">
      <RouterLink class="router-link" active="true" id="header-nav" to="/" @click="setActive">{{
        $t('header.portal_home')
      }}</RouterLink>
      <RouterLink class="router-link" id="header-nav" to="/api" @click="setActive">{{
        $t('header.api_explorer')
      }}</RouterLink>
      <RouterLink class="router-link" id="header-nav" to="/glossary" @click="setActive">{{
        $t('header.glossary')
      }}</RouterLink>
      <RouterLink class="router-link" id="header-nav" to="/api_manager" @click="setActive">{{
        $t('header.api_manager')
      }}</RouterLink>
      <span class="el-dropdown-link">
        <RouterLink class="router-link" id="header-nav" to="/more" @click="setActive">{{
          $t('header.more')
        }}</RouterLink>
        <el-icon class="el-icon--right">
          <arrow-down />
        </el-icon>
      </span>
      <span class="el-dropdown-link">
        <RouterLink class="router-link" id="header-nav" to="/spaces" @click="setActive">{{
          $t('header.spaces')
        }}</RouterLink>
        <el-icon class="el-icon--right">
          <arrow-down />
        </el-icon>
      </span>
      <RouterLink class="login-button router-link" to="/login" @click="setActive">{{
        $t('header.login')
      }}</RouterLink>
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
