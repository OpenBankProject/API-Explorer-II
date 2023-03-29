<script setup lang="ts">
import HeaderNav from './components/HeaderNav.vue'
import BodyView from './views/BodyView.vue'
</script>

<template>
  <div class="common-layout" style="height: inherit">
    <el-container style="height: 100%">
      <el-header class="header">
        <!--Header-->
        <HeaderNav />
      </el-header>
      <BodyView />
      <el-footer>Footer</el-footer>
    </el-container>
  </div>
</template>

<style scoped></style>
