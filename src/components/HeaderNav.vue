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
    <RouterLink class="router-link" to="/login">Login</RouterLink>
  </nav>
</template>
