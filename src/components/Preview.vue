<script setup lang="ts">
import { ref, inject, onBeforeMount } from 'vue'
import { onBeforeRouteUpdate, useRoute } from 'vue-router'
import { getOperationDetails } from '../obp/resource-docs'
import { get, create, update, discard } from '../obp'

const url = ref('')
const method = ref('')
const header = ref('')
const responseHeaderTitle = ref('TYPICAL SUCCESSFUL RESPONSE')
const successResponseBody = ref('')
const exampleRequestBody = ref('')
const requiredRoles = ref([])
const validations = ref([])
const possibleErrors = ref([])
const connectorMethods = ref([])
const showRequiredRoles = ref(true)
const showValidations = ref(true)
const showPossibleErrors = ref(true)
const showConnectorMethods = ref(true)
const type = ref('')
const docs = inject('OBP-ResourceDocs')

const setOperationDetails = (id: string): void => {
  const operation = getOperationDetails(docs, id)
  url.value = operation.specified_url
  method.value = operation.request_verb
  exampleRequestBody.value = JSON.stringify(operation.example_request_body)
  requiredRoles.value = operation.roles || []
  possibleErrors.value = operation.error_response_bodies
  connectorMethods.value = operation.connector_methods
  showRequiredRoles.value = requiredRoles.value.some((role) => role.requires_bank_id)
  showValidations.value = validations.value.length > 0
  showPossibleErrors.value = possibleErrors.value.length > 0
  showConnectorMethods.value = connectorMethods.value.length > 0

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
  responseHeaderTitle.value = 'RESPONSE'
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
const request = () => {}
onBeforeMount(async () => {
  const route = useRoute()
  setOperationDetails(route.params.id)
})
onBeforeRouteUpdate((to) => {
  setOperationDetails(to.params.id)
  responseHeaderTitle.value = 'TYPICAL SUCCESSFUL RESPONSE'
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
      <input type="text" v-show="exampleRequestBody" v-model="exampleRequestBody" />
    </div>
    <div v-show="successResponseBody">
      <pre>
        {{responseHeaderTitle}}:
        <code><div id="code" v-html="successResponseBody"></div></code>
      </pre>
    </div>
    <div v-show="showRequiredRoles">
      <p>REQUIRED ROLES:</p>
      <ul>
        <li
          v-for="role in requiredRoles"
          v-show="role.requires_bank_id"
          :key="role.role"
          :name="role.role"
        >
          <p>{{ role.role }}</p>
          <div class="flex-preview-panel" id="request-role-button-panel">
            <input type="text" placeholder="Bank ID" id="request-role-input" />
            <el-button id="request-role-button" @click="request">Request</el-button>
          </div>
        </li>
      </ul>
    </div>
    <!--<div v-show="showValidations">-->
    <div>
      <p>VALIDATIONS:</p>
      <!--TODO: implementation; replace hard coded.-->
      <div>
        <ul>
          <li>Required JSON Validation: No</li>
          <li>Allowed Authentication Types: Not set</li>
        </ul>
      </div>
    </div>
    <div v-show="showPossibleErrors">
      <p>POSSIBLE ERRORS:</p>
      <ul>
        <li v-for="error in possibleErrors" :key="error" :name="error">
          {{ error }}
        </li>
      </ul>
    </div>
    <div v-show="showConnectorMethods">
      <p>CONNECTOR METHODS:</p>
      <ul>
        <li v-for="method in connectorMethods" :key="method" :name="method">
          {{ method }}
        </li>
      </ul>
    </div>
    <br />
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
ul {
  margin-left: -10px;
}
li {
  padding: 5px 0 5px 0;
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
#search-input,
#request-role-input {
  -webkit-border-top-right-radius: 0;
  -moz-border-top-right-radius: 0;
  border-top-right-radius: 0;
  -webkit-border-bottom-right-radius: 0;
  -moz-border-bottom-right-radius: 0;
  border-bottom-right-radius: 0;
}
#search-button,
#request-role-button {
  height: 34px;
  -webkit-border-top-left-radius: 0;
  -moz-border-top-left-radius: 0;
  border-top-left-radius: 0;
  -webkit-border-bottom-left-radius: 0;
  -moz-border-bottom-left-radius: 0;
  border-bottom-left-radius: 0;
}
#request-role-button-panel {
  width: 95%;
  margin: 0 auto;
}
</style>
