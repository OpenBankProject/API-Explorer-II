<script setup lang="ts">
import { ref } from 'vue'
const version = ref(__APP_VERSION__)
</script>

<template>
  <main>500 | The API server is not responding.</main>
  <span>Version: {{ version }}</span>
</template>

<style scoped>
main {
  margin-top: -60px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #39455f;
  font-family: 'roboto';
  font-size: 30px;
}
span {
  font-size: 14px;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
