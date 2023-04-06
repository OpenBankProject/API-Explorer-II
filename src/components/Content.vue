<script setup lang="ts">
import { ref, inject, onBeforeMount } from 'vue'
import { onBeforeRouteUpdate, useRoute } from 'vue-router'
import { getOperationDetails } from '../obp/resource-docs'

const description = ref('')
const summary = ref('')
const docs = inject('OBP-ResourceDocs')

const setOperationDetails = (id: string): void => {
  const operation = getOperationDetails(docs, id)
  description.value = operation.description
  summary.value = operation.summary
}

onBeforeMount(() => {
  const route = useRoute()
  setOperationDetails(route.params.id)
})
onBeforeRouteUpdate((to) => {
  setOperationDetails(to.params.id)
})
</script>

<template>
  <main>
    <span>{{ summary }}</span>
    <div v-html="description"></div>
  </main>
</template>
