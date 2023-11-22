<script setup lang="ts">
import SearchNav from '../components/SearchNav.vue'
import Menu from '../components/Menu.vue'
import Collections from '../components/Collections.vue'
import { inject } from 'vue'

</script>

<template>
  <el-container class="root">
    <el-aside class="search-nav" width="20%">
      <!--Left-->
      <SearchNav />
    </el-aside>
    <el-main>
      <el-container class="main">
        <!--<el-header class="collections">
          <Collections />
        </el-header>-->
        <el-header class="menu">
          <Menu />
        </el-header>
        <el-container class="middle">
          <el-aside class="summary" width="50%">
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

<style>
.root {
  min-height: 100vh;
  overflow: unset;
}
.middle {
  max-height: 95vh;
}
.summary {
  max-height: 95vh;
}
.preview {
  color: white;
  background-color: #151d30;
  max-height: 100vh;
}
.collections {
  margin-left: -20px;
  margin-right: -20px;
  padding-left: 20px;
  padding-right: 20px;
}
</style>
