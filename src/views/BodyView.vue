<script setup lang="ts">
import SearchNav from '../components/SearchNav.vue'
import Menu from '../components/Menu.vue'
</script>

<template>
  <el-container>
    <el-aside class="search-nav" width="15%">
      <!--Left-->
      <SearchNav />
    </el-aside>
    <el-main>
      <el-container class="main">
        <el-header class="menu">
          <Menu />
        </el-header>
        <el-container>
          <el-aside width="50%">
            Middle
            <RouterView />
          </el-aside>
          <el-aside class="preview" width="50%">
            <!--Right -->
            Right
            <RouterView class="" name="preview" />
          </el-aside>
        </el-container>
      </el-container>
    </el-main>
  </el-container>
</template>
