<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
</script>

<template>
  <el-row>
    <el-col :span="12" class="menu-left">Menu left</el-col>
    <el-col :span="12" class="menu-right">
      Menu right &nbsp;&nbsp;&nbsp;&nbsp;
      <el-dropdown class="menu-right">
        <span class="el-dropdown-link">
          EN
          <el-icon class="el-icon--right">
            <arrow-down />
          </el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item>EN</el-dropdown-item>
            <el-dropdown-item disabled>SP</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </el-col>
  </el-row>
</template>
