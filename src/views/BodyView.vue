<script setup lang="ts">
import SearchNav from '../components/SearchNav.vue'
import Menu from '../components/Menu.vue'
</script>

<template>
  <el-container>
    <el-aside class="search-nav" width="20%">
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
            <!--Middle -->
            <RouterView name="body" />
          </el-aside>
          <el-aside class="preview" width="50%">
            <!--right -->
            <RouterView class="preview" name="preview" />
          </el-aside>
        </el-container>
        <!--<el-footer> -->
        <!--Bottom -->
        <!--Footer
        </el-footer>-->
      </el-container>
    </el-main>
  </el-container>
</template>

<style></style>
