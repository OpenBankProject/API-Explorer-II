<script setup lang="ts">
import { ref, inject, onBeforeMount } from 'vue'
import { onBeforeRouteUpdate, useRoute } from 'vue-router'
import { getOperationDetails } from '../obp/resource-docs'

const url = ref('')
const method = ref('')
const successResponse = ref('')
const roles = ref('')
const docs = inject('OBP-ResourceDocs')

const setOperationDetails = (id: string): void => {
  const operation = getOperationDetails(docs, id)
  url.value = operation.specified_url
  method.value = operation.request_verb
  successResponse.value = operation.success_response_body
  roles.value = operation.roles
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
    {{ $route.params.id }} <br />
    {{ url }} <el-button type="primary">{{ method }}</el-button> <br />
    <div>
      TYPICAL SUCCESSFUL RESPONSE: <br />
      {{ successResponse }}
    </div>
    <div>
      REQUIRED ROLES: <br />
      {{ roles }}
    </div>
  </main>
</template>
