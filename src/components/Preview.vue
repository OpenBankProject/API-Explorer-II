<!--
  - Open Bank Project -  API Explorer II
  - Copyright (C) 2023-2024, TESOBE GmbH
  -
  - This program is free software: you can redistribute it and/or modify
  - it under the terms of the GNU Affero General Public License as published by
  - the Free Software Foundation, either version 3 of the License, or
  - (at your option) any later version.
  -
  - This program is distributed in the hope that it will be useful,
  - but WITHOUT ANY WARRANTY; without even the implied warranty of
  - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  - GNU Affero General Public License for more details.
  -
  - You should have received a copy of the GNU Affero General Public License
  - along with this program.  If not, see <http://www.gnu.org/licenses/>.
  -
  - Email: contact@tesobe.com
  - TESOBE GmbH
  - Osloerstrasse 16/17
  - Berlin 13359, Germany
  -
  -   This product includes software developed at
  -   TESOBE (http://www.tesobe.com/)
  -
  -->

<script setup lang="ts">
import { ref, reactive, inject, onBeforeMount } from 'vue'
import { onBeforeRouteUpdate, useRoute } from 'vue-router'
import { getOperationDetails } from '../obp/resource-docs'
import { ElNotification, FormInstance } from 'element-plus'
import { OBP_API_VERSION, get, create, update, discard, createEntitlement, getCurrentUser } from '../obp'
import { obpResourceDocsKey } from '@/obp/keys'
import JsonEditorVue from 'json-editor-vue'
import { Mode } from 'vanilla-jsoneditor'
import 'vanilla-jsoneditor/themes/jse-theme-dark.css'
import * as cheerio from 'cheerio'

const elMessageDuration = 5500
const configVersion = 'OBP' + OBP_API_VERSION
const url = ref('')
const roleName = ref('')
const method = ref('')
const header = ref('')
const responseHeaderTitle = ref('TYPICAL SUCCESSFUL RESPONSE')
const exampleBodyTitle = ref('REQUEST BODY')
const oldExampleBodyContent = ref('')
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
const isUserLogon = ref(true)
const type = ref('')
const resourceDocs = inject(obpResourceDocsKey)
const footNote = ref({
  operationId: '',
  version: '',
  functionName: '',
  messageTags: ''
})

const requestFormRef = reactive<FormInstance>({})
const requestForm = reactive({ url: '' })

const roleFormRef = reactive<FormInstance>({})
const roleForm = reactive({})

const setOperationDetails = (id: string, version: string): void => {
  const operation = getOperationDetails(version, id, resourceDocs)
  url.value = operation?.specified_url
  method.value = operation?.request_verb
  exampleRequestBody.value = operation.example_request_body
  requiredRoles.value = operation.roles || []
  possibleErrors.value = operation.error_response_bodies
  connectorMethods.value = operation.connector_methods
  showRequiredRoles.value = requiredRoles.value.length > 0
  showValidations.value = validations.value.length > 0
  showPossibleErrors.value = possibleErrors.value.length > 0
  showConnectorMethods.value = true
  footNote.value.version = operation.operation_id
  footNote.value.version = operation.implemented_by.version
  footNote.value.functionName = operation.implemented_by.function
  footNote.value.messageTags = operation.tags.join(',')

  highlightCode(operation.success_response_body)
  setType(method.value)
}

const setRoleForm = () => {
  if (requiredRoles.value) {
    requiredRoles.value.forEach((role, idx) => {
      roleForm[`role${role.role}${idx}`] = role.role
    })
  }
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
const submitRequest = async () => {
  if (url.value) {
    switch (method.value) {
      case 'POST': {
        highlightCode(await create(url.value, JSON.stringify(exampleRequestBody.value)))
        break
      }
      case 'PUT': {
        highlightCode(await update(url.value, JSON.stringify(exampleRequestBody.value)))
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
  } else {
    ElNotification({
      duration: elMessageDuration,
      message: 'URL path is required.',
      type: 'error'
    })
  }
}
const submit = async (form: FormInstance, fn: () => void) => {
  if (!form) return
  fn(form).then(() => {})
}
const highlightCode = (json) => {
  if (json.error) {
    successResponseBody.value = json.error.message
  } else if (json) {
    successResponseBody.value = hljs.lineNumbersValue(
      hljs.highlightAuto(JSON.stringify(json, null, 4), ['JSON']).value
    )
  } else {
    successResponseBody.value = ''
  }
}
const submitEntitlement = async () => {
  requiredRoles.value.forEach(async (formRole, idx) => {
    if (formRole.requires_bank_id) {
      const role = roleForm[`role${formRole.role}${idx}`]
      const bankId = roleForm[`bankId${formRole.role}${idx}`]
      if (role && bankId && isUserLogon) {
        const response = await createEntitlement(bankId, role)
        let type = 'success'
        if ('code' in response && response['code'] >= 400) {
          type = 'error'
        }
        ElNotification({
          duration: elMessageDuration,
          message: response.message,
          position: 'bottom-right',
          type
        })
      } else {
        ElNotification({
          duration: elMessageDuration,
          message: 'Bank Id is required.',
          position: 'bottom-right',
          type: 'error'
        })
      }
    }
  })
}
onBeforeMount(async () => {
  const route = useRoute()
  const version = route.query.version ? route.query.version : configVersion
  setOperationDetails(route.params.id, version)

  const currentUser = await getCurrentUser()
  isUserLogon.value = currentUser.username
  setRoleForm()
})
onBeforeRouteUpdate((to) => {
  const version = to.query.version ? to.query.version : configVersion
  setOperationDetails(to.params.id, version)
  responseHeaderTitle.value = 'TYPICAL SUCCESSFUL RESPONSE'
  setRoleForm()
})

const copyToClipboard = () => {
  // Create a temporary text area to hold the content
  const textArea = document.createElement('textarea');

  // Parse the HTML content with Cheerio
  const $ = cheerio.load(successResponseBody.value);

  // Extract all JSON lines
  const jsonLines: string[] = [];
  $('.hljs-ln-code').each((_, element) => {
      jsonLines.push($(element).text());
  });

  // Combine lines to form raw JSON
  const rawJson = jsonLines.join('\n');

  textArea.value = rawJson; // Set the text to copy
  document.body.appendChild(textArea); // Append the text area to the DOM
  textArea.select(); // Select the text inside the text area
  document.execCommand('copy'); // Execute the copy command
  document.body.removeChild(textArea); // Remove the text area from the DOM

  // Show feedback to the user
  ElNotification({
    message: 'Response copied to clipboard!',
    type: 'success',
    duration: elMessageDuration
  });
};

const onJsonEditorChange = (updatedContent) => {
  oldExampleBodyContent.value = exampleRequestBody.value;
  try {
    updatedContent = JSON.parse(JSON.stringify(updatedContent))
    exampleRequestBody.value = updatedContent;
  } catch (e) {
    exampleRequestBody.value = oldExampleBodyContent.value;
    console.log(`JSON not valid: ${e}`);
  }
  
}

const onError = (error) => {
  console.error(error)
  try {
    exampleRequestBody.value = oldExampleBodyContent.value
  } catch (e) {
    console.error(e)
  }
}

</script>

<template>
  <main>
    <el-form ref="requestFormRef" :model="requestForm">
      <el-form-item prop="url">
        <div class="flex-request-preview-panel">
          <input type="text" v-model="url" :set="(requestForm.url = url)" id="search-input" />
          <el-button
            :type="type"
            id="search-button"
            @click="submit(requestFormRef, submitRequest)"
            >{{ method }}</el-button
          >
        </div>
      </el-form-item>
    </el-form>
    <div class="flex-preview-panel">
      <input
        type="text"
        v-model="header"
        placeholder="Request Header (Header1:Value1::Header2:Value2)"
      />
    </div>
    <div class="json-editor-container" v-show="exampleRequestBody">
      <p v-show="exampleRequestBody" class="header-container request-body-header">{{ exampleBodyTitle }}:</p>
      <div class="json-editor jse-theme-dark">
        <JsonEditorVue
          v-model="exampleRequestBody"
          :stringified="true"
          :mode="Mode.tree"
          v-bind="{/* local props & attrs */}"
          :onChange="onJsonEditorChange"
        />
      </div>
      
    </div>
    <div v-show="successResponseBody" class="success-response-container">
      <div class="success-response-header-container">
        <p class="header-container success-response-header">{{ responseHeaderTitle }}:</p>
        <button @click="copyToClipboard" class="copy-button icon-md-heavy" title="Copy to Clipboard"><i class="material-icons">content_copy</i></button>
      </div>
      <pre>
        <code><div id="code" v-html="successResponseBody"></div></code>
      </pre>
    </div>
    <el-form ref="roleFormRef" :model="roleForm">
      <div v-show="showRequiredRoles">
        <p>{{ $t('preview.required_roles') }}:</p>
        <el-alert v-show="!isUserLogon" type="info" show-icon :closable="false">
          <p>Please login to request this Role.</p>
        </el-alert>
        <ul>
          <li
            v-for="(role, idx) in requiredRoles"
            :key="role.role"
            :name="role.role"
            
          >
            <p>{{ role.role }}</p>
            <div class="flex-role-preview-panel" id="request-role-button-panel">
              <el-form-item v-show="role.requires_bank_id" :prop=" `bankId${role.role}${idx}`">
                <input
                  type="text"
                  v-model="roleForm[`bankId${role.role}${idx}`]"
                  placeholder="Bank ID"
                />
              </el-form-item>
            </div>
          </li>
        </ul>
        <el-button
          id="request-role-button"
          v-show="isUserLogon"
          @click="submit(roleFormRef, submitEntitlement)"
          >Request</el-button
        >
      </div>
    </el-form>
    <!--<div v-show="showValidations">-->
    <el-divider class="divider" />
    <div>
      <p>{{ $t('preview.validations') }}:</p>
      <!--TODO: implementation; replace hard coded.-->
      <div>
        <ul>
          <li>Required JSON Validation: No</li>
          <li>Allowed Authentication Types: Not set</li>
        </ul>
      </div>
    </div>
    <el-divider class="divider" />
    <div v-show="showPossibleErrors">
      <p>{{ $t('preview.possible_errors') }}:</p>
      <ul>
        <li v-for="error in possibleErrors" :key="error" :name="error">
          {{ error }}
        </li>
      </ul>
    </div>
    <el-divider class="divider" />
    <div v-show="showConnectorMethods">
      <p>{{ $t('preview.connector_methods') }}:</p>
      <ul>
        <li v-for="method in connectorMethods" :key="method" :name="method">
          <a id="conector-method-link" :href="`/message-docs/rabbitmq_vOct2024/#${method}` " >
            {{ method }}
          </a>
        </li>
      </ul>
    </div>
    <el-divider class="divider" />
    <div>
      <p class="footnote">
        Version: {{ footNote.version }}, function_name: by {{ footNote.functionName }},
        operation_id: {{ footNote.functionName }}, Message Tags: {{ footNote.messageTags }}
      </p>
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
  padding: 0px 30px 0px 30px;
  max-height: 340px;
  background-color: #253047;
  font-size: 14px;
  margin: 0;
  font-family: 'Roboto';
  font-weight: normal;
}
pre span {
  all: unset; /* Reset all default styles */
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
.request-body-header {
  background-color: #010B20;
  margin-right: auto;
  margin-top: 0;
}
.json-editor-container {
  display: flex;
  flex-direction: column;
  margin-left: -25px;
  margin-right: -25px;
  background-color: #010B20;
  padding: 25px 25px 25px 25px;
}
.json-editor {
  /* the list of default vars to change can be found here: https://github.com/josdejong/svelte-jsoneditor/blob/main/src/lib/themes/defaults.scss */
  width: 100%;
  margin-left: -5px;
  margin-right: -5px;
  --jse-theme-color: #010B20;
  --jse-key-color: #ffffff;
  --jse-value-color: #6a8759;
  --jse-value-color-string: #6a8759;
  --jse-background-color: #010B20;
  --jse-context-menu-background: #010B20;
  --jse-theme-color-highlight: #010B20;
  --jse-context-menu-pointer-hover-background: #253047;
  --jse-context-menu-background-highlight: #253047;
  --jse-context-menu-pointer-background: #253047;
  --jse-context-menu-tip-background: #253047;
  --jse-modal-background: #010B20;
  --jse-panel-background: #010B20;
  --jse-font-family-mono: 'Roboto', 'Courier New', monospace;
  --jse-main-border: none;
}
.flex-preview-panel {
  display: flex;
  flex-direction: row;
  padding-bottom: 18px;
}
.flex-role-preview-panel {
  display: flex;
  flex-direction: row;
  padding-bottom: 12px;
}
.flex-request-preview-panel {
  display: flex;
  flex-direction: row;
}
.footnote {
  color: var(--el-color-info);
  font-size: 12px;
}
.divider {
  border-top: 1px #253047 solid;
  margin-left: -25px;
  padding-right: 50px;
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
#request-role-button {
  margin-left: 30px;
}
#request-role-button-panel {
  width: 95%;
  margin: 0 0 -30px 0;
}

#conector-method-link {
  color: white !important;
}
.success-response-header-container {
  margin-left: 25px;
  margin-right: 25px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  background-color: #253047;
}
.success-response-header {
  margin-top: 25px;
}
.success-response-container{
  background-color: #253047;
  margin-right: -25px;
  margin-left: -25px;
}
.copy-button {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-button .material-icons {
  font-size: 20px;
  color: #757575;
  transition: color 0.2s ease, transform 0.2s ease;
}

.copy-button:hover .material-icons {
  color: #424242;
  transform: scale(1.1);
}

.copy-button:active .material-icons {
  color: #212121;
  transform: scale(0.95);
}
</style>
