<script setup lang="ts">
import HeaderNav from './components/HeaderNav.vue'
</script>

<template>
  <div class="common-layout" style="height: inherit">
    <el-container style="height: 100%">
      <el-header class="header">
        <!--Header-->
        <HeaderNav />
      </el-header>
      <RouterView />
    </el-container>
  </div>
</template>

<style scoped></style>
