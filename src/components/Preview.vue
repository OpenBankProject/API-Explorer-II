<script setup lang="ts">
import { ref, inject, onBeforeMount } from 'vue'
import { onBeforeRouteUpdate, useRoute } from 'vue-router'
import { getOperationDetails } from '../obp/resource-docs'
import { get, create, update, discard } from '../obp'

const url = ref('')
const method = ref('')
const header = ref('')
const successResponseBody = ref('')
const exampleRequestBody = ref('')
const roles = ref('')
const type = ref('')
const docs = inject('OBP-ResourceDocs')

const setOperationDetails = (id: string): void => {
  const operation = getOperationDetails(docs, id)
  url.value = operation.specified_url
  method.value = operation.request_verb
  exampleRequestBody.value = JSON.stringify(operation.example_request_body)
  roles.value = operation.roles
  highlightCode(operation.success_response_body)
  setType(method.value)
}

const setType = (method) => {
  switch (method) {
    case 'POST': {
      type.value = 'success'
      break
    }
    case 'PUT': {
      type.value = 'warning'
      break
    }
    case 'DELETE': {
      type.value = 'danger'
      break
    }
    default: {
      type.value = 'primary'
      break
    }
  }
}
const submit = async () => {
  switch (method.value) {
    case 'POST': {
      highlightCode(await create(url.value, exampleRequestBody.value))
      break
    }
    case 'PUT': {
      highlightCode(await update(url.value, exampleRequestBody.value))
      break
    }
    case 'DELETE': {
      highlightCode(await discard(url.value))
      break
    }
    default: {
      highlightCode(await get(url.value))
      break
    }
  }
}
const highlightCode = (json) => {
  if (json) {
    successResponseBody.value = hljs.lineNumbersValue(
      hljs.highlightAuto(JSON.stringify(json, null, 4), ['JSON']).value
    )
  } else {
    successResponseBody.value = ''
  }
}
onBeforeMount(async () => {
  const route = useRoute()
  setOperationDetails(route.params.id)
})
onBeforeRouteUpdate((to) => {
  setOperationDetails(to.params.id)
})
</script>

<template>
  <main>
    <div class="flex-preview-panel">
      <input type="text" v-model="url" id="search-input" />
      <el-button :type="type" id="search-button" @click="submit">{{ method }}</el-button>
    </div>
    <div class="flex-preview-panel">
      <input
        type="text"
        v-model="header"
        placeholder="Request Header (Heeader1:Value1::Header2:Value2)"
      />
    </div>
    <div class="flex-preview-panel">
      <input type="text" v-model="exampleRequestBody" />
    </div>
    <div>
      <pre>
        TYPICAL SUCCESSFUL RESPONSE:
        <code><div id="code" v-html="successResponseBody"></div></code>
      </pre>
    </div>
    <div>
      <p>REQUIRED ROLES:</p>
      <div v-for="role in roles" :title="role" :key="role" :name="role">
        <ul>
          <li>{{ role.role }}</li>
        </ul>
        <div class="flex-preview-panel">
          <input type="text" v-model="role.requires_bank_id" />
        </div>
      </div>
    </div>
    <div>
      <p>Validations:</p>
    </div>
    <div>
      <p>Possible Errors:</p>
    </div>
    <div>
      <p>Connector Methods:</p>
    </div>
  </main>
</template>

<style scoped>
template {
  overflow: auto;
  max-height: 900px;
}
main {
  margin: 25px;
  color: #fffff;
  font-family: 'Roboto';
  font-size: 14px;
}
span {
  font-size: 28px;
}
pre {
  margin-left: -25px;
  margin-right: -25px;
  padding: 30px 30px 10px 30px;
  max-height: 340px;
  background-color: #253047;
  font-size: 14px;
  font-family: 'Roboto';
  font-weight: normal;
}
input[type='text'] {
  color: #ffffff;
  font-size: 14px;
  font-family: 'Roboto';
  font-weight: normal;
  border: none;
  width: 100%;
  height: 32px;
  padding-left: 10px;
  background-color: #253047;
  -webkit-border-radius: 5px;
  -moz-border-radius: 5px;
  border-radius: 5px;
}
input[type='text']:focus {
  outline: none;
}
.content p a::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 1px;
  background-color: var(--el-border-color-light);
  z-index: var(--el-index-normal);
}
.flex-preview-panel {
  display: flex;
  flex-direction: row;
  padding-bottom: 12px;
}
#search-input {
  -webkit-border-top-right-radius: 0;
  -moz-border-top-right-radius: 0;
  border-top-right-radius: 0;
  -webkit-border-bottom-right-radius: 0;
  -moz-border-bottom-right-radius: 0;
  border-bottom-right-radius: 0;
}
#search-button {
  height: 34px;
  -webkit-border-top-left-radius: 0;
  -moz-border-top-left-radius: 0;
  border-top-left-radius: 0;
  -webkit-border-bottom-left-radius: 0;
  -moz-border-bottom-left-radius: 0;
  border-bottom-left-radius: 0;
}
</style>
