<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
</script>

<template>
  <img alt="OBP logo" class="logo" src="@/assets/logo2x-1.png" />
  <nav>
    <RouterLink class="router-link" to="/">Portal Home</RouterLink>
    <RouterLink class="router-link" to="/api">API Explorer</RouterLink>
    <RouterLink class="router-link" to="/glossary">Glossary</RouterLink>
    <RouterLink class="router-link" to="/">API Manager</RouterLink>
    <span class="el-dropdown-link">
      <RouterLink class="router-link" to="/">More</RouterLink>
      <el-icon class="el-icon--right">
        <arrow-down />
      </el-icon>
    </span>
    <span class="el-dropdown-link">
      <RouterLink class="router-link" to="/">Spaces</RouterLink>
      <el-icon class="el-icon--right">
        <arrow-down />
      </el-icon>
    </span>
    <RouterLink class="login-button router-link" to="/login">Login</RouterLink>
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
  color: #39455f;
  font-family: 'Roboto';
  font-size: 14px;
  text-decoration: none;
  border-radius: 8px;
}

.router-link:hover {
  background-color: #eef0f4;
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
