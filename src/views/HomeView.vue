<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { setAccessToken } from '../obp'

onMounted(() => {
  const route = useRoute()
  const query = route.query
  setAccessToken(query.key, query.secret)
})
</script>

<template>
  <main>Home</main>
</template>
