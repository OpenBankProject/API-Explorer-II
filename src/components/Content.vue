<script setup lang="ts">
import { ref, inject, onBeforeMount } from 'vue'
import { onBeforeRouteUpdate, useRoute } from 'vue-router'
import { getDescription } from '../obp/resource-docs'

const description = ref('')
const docs = inject('OBP-ResourceDocs')

onBeforeMount(() => {
  const route = useRoute()
  description.value = getDescription(docs, route.params.id)
})
onBeforeRouteUpdate((to) => {
  description.value = getDescription(docs, to.params.id)
})
</script>

<template>
  <main>
    Description:
    {{ $route.params.id }}
    <div v-html="description"></div>
  </main>
</template>
