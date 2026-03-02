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
import { ref, reactive, inject, onBeforeMount, onMounted, onUnmounted } from 'vue'
import { onBeforeRouteUpdate, useRoute } from 'vue-router'
import { getOperationDetails } from '../obp/resource-docs'
import { ElNotification, FormInstance } from 'element-plus'
import { OBP_API_DEFAULT_RESOURCE_DOC_VERSION, get, create, update, discard, createEntitlement, getCurrentUser, getUserEntitlements } from '../obp'
import { obpResourceDocsKey } from '@/obp/keys'
import JsonEditorVue from 'json-editor-vue'
import { Mode } from 'vanilla-jsoneditor'
import 'vanilla-jsoneditor/themes/jse-theme-dark.css'
import * as cheerio from 'cheerio'

const elMessageDuration = 5500
const configVersion = OBP_API_DEFAULT_RESOURCE_DOC_VERSION
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
const userEntitlements = ref([])
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

const replaceUrlPlaceholders = () => {
  const selectedBankId = localStorage.getItem('obp-selected-bank-id')
  if (selectedBankId && url.value) {
    url.value = url.value.replace(/BANK_ID/g, selectedBankId)
  }
}

const setOperationDetails = (id: string, version: string): void => {
  const operation = getOperationDetails(version, id, resourceDocs)

  // Safety check: if operation doesn't exist (e.g., after version change), return early
  if (!operation) {
    console.warn(`Operation "${id}" not found in version "${version}"`)
    return
  }

  // Replace the version in the URL with the current viewing version
  // This ensures users test against the version they're viewing (e.g., v6.0.0)
  // even if the endpoint was originally defined in an earlier version (e.g., v3.1.0)
  if (operation?.specified_url) {
    // Extract version without OBP prefix for URL replacement (e.g., "OBPv6.0.0" -> "v6.0.0")
    const versionWithoutPrefix = version.replace('OBP', '')
    // Replace /obp/vX.X.X/ with the current version
    url.value = operation.specified_url.replace(/\/obp\/v\d+\.\d+\.\d+\//, `/obp/${versionWithoutPrefix}/`)
  } else {
    url.value = operation?.specified_url
  }
  replaceUrlPlaceholders()
  method.value = operation?.request_verb
  exampleRequestBody.value = operation.example_request_body
  requiredRoles.value = operation.roles || []
  possibleErrors.value = operation.error_response_bodies
  connectorMethods.value = operation.connector_methods
  showRequiredRoles.value = requiredRoles.value.length > 0
  showValidations.value = validations.value.length > 0
  showPossibleErrors.value = possibleErrors.value.length > 0
  showConnectorMethods.value = true
  footNote.value.operationId = operation.operation_id
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

const refreshEntitlements = async () => {
  const currentUser = await getCurrentUser()
  if (currentUser.username) {
    const entitlements = await getUserEntitlements()
    if (entitlements && entitlements.list) {
      userEntitlements.value = entitlements.list
    }
  }
}

const hasEntitlement = (roleName: string, bankId: string = '', requiresBankId: boolean = false): boolean => {
  if (!userEntitlements.value || userEntitlements.value.length === 0) {
    return false
  }

  if (requiresBankId) {
    // For bank-level roles, check if user has the role for the specific bank
    // Only return true if bankId is provided and matches
    if (!bankId) {
      return false
    }
    return userEntitlements.value.some(e => e.role_name === roleName && e.bank_id === bankId)
  } else {
    // For system-wide roles, just check if user has the role
    return userEntitlements.value.some(e => e.role_name === roleName)
  }
}

const getEntitlementBankIds = (roleName: string): string[] => {
  if (!userEntitlements.value || userEntitlements.value.length === 0) {
    return []
  }
  return userEntitlements.value
    .filter(e => e.role_name === roleName && e.bank_id)
    .map(e => e.bank_id)
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
        highlightCode(
          await create(
            url.value,
            (() => {
              const rawBody = exampleRequestBody.value
              const maybeBody = typeof rawBody === 'string' ? rawBody.trim() : rawBody
              return maybeBody ? maybeBody : undefined
            })()
          )
        )
        break
      }
      case 'PUT': {
        highlightCode(
          await update(
            url.value,
            (() => {
              const rawBody = exampleRequestBody.value
              const maybeBody = typeof rawBody === 'string' ? rawBody.trim() : rawBody
              return maybeBody ? maybeBody : undefined
            })()
          )
        )
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
// Helper function to recursively parse double-encoded JSON strings
const parseDoubleEncodedJson = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj
  }

  // If it's a string, try to parse it as JSON
  if (typeof obj === 'string') {
    try {
      const parsed = JSON.parse(obj)
      // Recursively parse the result in case it's triple-encoded or more
      return parseDoubleEncodedJson(parsed)
    } catch (e) {
      // If parsing fails, return the original string
      return obj
    }
  }

  // If it's an array, recursively parse each element
  if (Array.isArray(obj)) {
    return obj.map(item => parseDoubleEncodedJson(item))
  }

  // If it's an object, recursively parse each property
  if (typeof obj === 'object') {
    const result = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = parseDoubleEncodedJson(obj[key])
      }
    }
    return result
  }

  // For other types (numbers, booleans, etc.), return as-is
  return obj
}

const highlightCode = (json) => {
  if (!json) {
    successResponseBody.value = ''
    return
  }

  if (json.error) {
    // Parse double-encoded JSON error messages to display them cleanly
    const errorObj = parseDoubleEncodedJson(json.error)

    // Display the full OBP error object with proper formatting
    successResponseBody.value = hljs.lineNumbersValue(
      hljs.highlightAuto(JSON.stringify(errorObj, null, 4), ['JSON']).value
    )
  } else {
    // Parse double-encoded JSON in successful responses too
    const parsedJson = parseDoubleEncodedJson(json)
    successResponseBody.value = hljs.lineNumbersValue(
      hljs.highlightAuto(JSON.stringify(parsedJson, null, 4), ['JSON']).value
    )
  }
}
const submitSingleEntitlement = async (formRole: any, idx: number) => {
  const role = roleForm[`role${formRole.role}${idx}`]

  if (formRole.requires_bank_id) {
    // Bank-level entitlement
    const bankId = roleForm[`bankId${formRole.role}${idx}`]

    if (!role || !bankId) {
      ElNotification({
        duration: elMessageDuration,
        title: 'Validation Error',
        message: 'Please fill in both Role and Bank ID fields',
        position: 'bottom-right',
        type: 'warning'
      })
      return
    }

    try {
      const response = await createEntitlement(bankId, role)

      // Check if response is an error object (from superagent)
      const isError = response && typeof response === 'object' && 'error' in response
      const errorBody = isError ? response.error : null

      if (isError && errorBody && errorBody.code >= 400) {
        // Parse error message from body
        let errorMessage = 'Failed to create entitlement'
        if (errorBody.message) {
          // Message might be double-encoded JSON string
          try {
            const parsed = JSON.parse(errorBody.message)
            errorMessage = parsed.message || parsed.error || errorBody.message
          } catch {
            errorMessage = errorBody.message
          }
        }

        ElNotification({
          duration: elMessageDuration,
          title: 'Request Failed',
          message: errorMessage,
          position: 'bottom-right',
          type: 'error'
        })
      } else {
        ElNotification({
          duration: elMessageDuration,
          title: 'Success',
          message: `Entitlement "${role}" requested successfully for bank "${bankId}"`,
          position: 'bottom-right',
          type: 'success'
        })
        // Refresh entitlements after successful request
        await refreshEntitlements()
      }
    } catch (error: any) {
      ElNotification({
        duration: elMessageDuration,
        title: 'Request Failed',
        message: error.message || 'An error occurred while requesting the entitlement',
        position: 'bottom-right',
        type: 'error'
      })
    }
  } else {
    // System-wide entitlement (no bank_id required)
    if (!role) {
      ElNotification({
        duration: elMessageDuration,
        title: 'Validation Error',
        message: 'Please select a role',
        position: 'bottom-right',
        type: 'warning'
      })
      return
    }

    try {
      // System-wide entitlement uses empty string for bank_id
      const response = await createEntitlement('', role)

      // Check if response is an error object (from superagent)
      const isError = response && typeof response === 'object' && 'error' in response
      const errorBody = isError ? response.error : null

      if (isError && errorBody && errorBody.code >= 400) {
        // Parse error message from body
        let errorMessage = 'Failed to create entitlement'
        if (errorBody.message) {
          // Message might be double-encoded JSON string
          try {
            const parsed = JSON.parse(errorBody.message)
            errorMessage = parsed.message || parsed.error || errorBody.message
          } catch {
            errorMessage = errorBody.message
          }
        }

        ElNotification({
          duration: elMessageDuration,
          title: 'Request Failed',
          message: errorMessage,
          position: 'bottom-right',
          type: 'error'
        })
      } else {
        ElNotification({
          duration: elMessageDuration,
          title: 'Success',
          message: `System-wide entitlement "${role}" requested successfully`,
          position: 'bottom-right',
          type: 'success'
        })
        // Refresh entitlements after successful request
        await refreshEntitlements()
      }
    } catch (error: any) {
      ElNotification({
        duration: elMessageDuration,
        title: 'Request Failed',
        message: error.message || 'An error occurred while requesting the entitlement',
        position: 'bottom-right',
        type: 'error'
      })
    }
  }
}

const submitEntitlement = async () => {
  for (const [idx, formRole] of requiredRoles.value.entries()) {
    const role = roleForm[`role${formRole.role}${idx}`]

    if (formRole.requires_bank_id) {
      // Bank-level entitlement
      const bankId = roleForm[`bankId${formRole.role}${idx}`]

      if (!role || !bankId) {
        ElNotification({
          duration: elMessageDuration,
          title: 'Missing Information',
          message: 'Bank ID is required for this role.',
          position: 'bottom-right',
          type: 'error'
        })
        continue
      }

      if (!isUserLogon) {
        ElNotification({
          duration: elMessageDuration,
          title: 'Not Authenticated',
          message: 'Please login to request this role.',
          position: 'bottom-right',
          type: 'error'
        })
        continue
      }

      try {
        const response = await createEntitlement(bankId, role)

        // Check if response is an error object (from superagent)
        const isError = response && response.error && response.error.response
        const errorBody = isError ? response.error.response.body : null
        const statusCode = isError ? response.error.status : null

        if (isError && errorBody && errorBody.code >= 400) {
          // Parse error message from body
          let errorMessage = 'Failed to create entitlement'
          if (errorBody.message) {
            // Message might be double-encoded JSON string
            try {
              const parsedMessage = JSON.parse(errorBody.message)
              errorMessage = parsedMessage.message || errorBody.message
            } catch {
              errorMessage = errorBody.message
            }
          }

          ElNotification({
            duration: elMessageDuration,
            title: `Error (${errorBody.code})`,
            message: errorMessage,
            position: 'bottom-right',
            type: 'error'
          })
        } else {
          // Success
          ElNotification({
            duration: elMessageDuration,
            title: 'Success',
            message: `Entitlement "${role}" requested successfully for bank "${bankId}"`,
            position: 'bottom-right',
            type: 'success'
          })
          // Refresh entitlements after successful request
          await refreshEntitlements()
        }
      } catch (error: any) {
        ElNotification({
          duration: elMessageDuration,
          title: 'Request Failed',
          message: error.message || 'An error occurred while requesting the entitlement',
          position: 'bottom-right',
          type: 'error'
        })
      }
    } else {
      // System-wide entitlement (no bank_id required)
      if (!role) {
        ElNotification({
          duration: elMessageDuration,
          title: 'Missing Information',
          message: 'Role name is required.',
          position: 'bottom-right',
          type: 'error'
        })
        continue
      }

      if (!isUserLogon) {
        ElNotification({
          duration: elMessageDuration,
          title: 'Not Authenticated',
          message: 'Please login to request this role.',
          position: 'bottom-right',
          type: 'error'
        })
        continue
      }

      try {
        // System-wide entitlement uses empty string for bank_id
        const response = await createEntitlement('', role)

        // Check if response is an error object (from superagent)
        const isError = response && response.error && response.error.response
        const errorBody = isError ? response.error.response.body : null
        const statusCode = isError ? response.error.status : null

        if (isError && errorBody && errorBody.code >= 400) {
          // Parse error message from body
          let errorMessage = 'Failed to create entitlement'
          if (errorBody.message) {
            // Message might be double-encoded JSON string
            try {
              const parsedMessage = JSON.parse(errorBody.message)
              errorMessage = parsedMessage.message || errorBody.message
            } catch {
              errorMessage = errorBody.message
            }
          }

          ElNotification({
            duration: elMessageDuration,
            title: `Error (${errorBody.code})`,
            message: errorMessage,
            position: 'bottom-right',
            type: 'error'
          })
        } else {
          // Success
          ElNotification({
            duration: elMessageDuration,
            title: 'Success',
            message: `System-wide entitlement "${role}" requested successfully`,
            position: 'bottom-right',
            type: 'success'
          })
          // Refresh entitlements after successful request
          await refreshEntitlements()
        }
      } catch (error: any) {
        ElNotification({
          duration: elMessageDuration,
          title: 'Request Failed',
          message: error.message || 'An error occurred while requesting the entitlement',
          position: 'bottom-right',
          type: 'error'
        })
      }
    }
  }
}
onBeforeMount(async () => {
  const route = useRoute()
  const version = route.params.version ? route.params.version : configVersion

  // Only set operation details if operationid exists
  if (route.query.operationid) {
    setOperationDetails(route.query.operationid, version)
  }

  const currentUser = await getCurrentUser()
  isUserLogon.value = currentUser.username

  // Fetch user entitlements
  if (currentUser.username) {
    const entitlements = await getUserEntitlements()
    if (entitlements && entitlements.list) {
      userEntitlements.value = entitlements.list
    }
  }

  setRoleForm()
})
onBeforeRouteUpdate(async (to) => {
  const version = to.params.version ? to.params.version : configVersion

  // Only set operation details if operationid exists
  if (to.query.operationid) {
    setOperationDetails(to.query.operationid, version)
    responseHeaderTitle.value = 'TYPICAL SUCCESSFUL RESPONSE'
  }

  // Refresh entitlements on route change
  await refreshEntitlements()

  setRoleForm()
})

const onBankSelected = (event: Event) => {
  const bankId = (event as CustomEvent).detail
  if (bankId && url.value) {
    url.value = url.value.replace(/BANK_ID/g, bankId)
  }
}

onMounted(() => {
  window.addEventListener('obp-bank-selected', onBankSelected)
})

onUnmounted(() => {
  window.removeEventListener('obp-bank-selected', onBankSelected)
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
    // In text mode, vanilla-jsoneditor returns { text: "..." }
    // Extract the text property if it exists
    const content = updatedContent?.text !== undefined ? updatedContent.text : updatedContent;
    exampleRequestBody.value = content;
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
    <el-form ref="requestFormRef" :model="requestForm" @submit.prevent>
      <el-form-item prop="url">
        <div class="flex-request-preview-panel">
          <input
            type="text"
            v-model="url"
            :set="(requestForm.url = url)"
            id="search-input"
            @keyup.enter="submit(requestFormRef, submitRequest)"
          />
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
    <div class="json-editor-container" v-show="method === 'POST' || method === 'PUT' || method === 'DELETE'">
      <p class="header-container request-body-header">{{ exampleBodyTitle }}:</p>
      <div class="json-editor jse-theme-dark">
        <JsonEditorVue
          v-model="exampleRequestBody"
          :stringified="true"
          :mode="Mode.text"
          v-bind="{/* local props & attrs */}"
          :onChange="onJsonEditorChange"
          :mainMenuBar="false"
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
          <p>Please login to request Roles.</p>
        </el-alert>
        <ul>
          <li
            v-for="(role, idx) in requiredRoles"
            :key="role.role"
            :name="role.role"

          >
            <div class="role-header">
              <div class="role-name-section">
                <p>{{ role.role }}</p>
                <!-- Show existing bank IDs for bank-level roles -->
                <div v-if="role.requires_bank_id && getEntitlementBankIds(role.role).length > 0" class="existing-entitlements">
                  <span class="entitlement-label">You have this at:</span>
                  <span
                    v-for="bankId in getEntitlementBankIds(role.role)"
                    :key="bankId"
                    class="bank-id-badge"
                  >
                    {{ bankId }}
                  </span>
                </div>
                <!-- Always show input for bank-level roles when logged in -->
                <el-form-item
                  v-show="isUserLogon && role.requires_bank_id"
                  :prop="`bankId${role.role}${idx}`"
                  class="role-bank-id-input"
                >
                  <input
                    type="text"
                    v-model="roleForm[`bankId${role.role}${idx}`]"
                    placeholder="Bank ID"
                  />
                </el-form-item>
              </div>
              <!-- Show "You have this Entitlement" only for system-wide roles -->
              <span
                v-if="!role.requires_bank_id && hasEntitlement(role.role, '', role.requires_bank_id)"
                class="entitlement-owned-text"
              >
                You have this Entitlement
              </span>
              <!-- For bank-level roles, always show Request button when logged in -->
              <!-- For system-wide roles, only show if they don't have it -->
              <el-button
                class="role-request-button"
                v-show="isUserLogon && (role.requires_bank_id || !hasEntitlement(role.role, '', role.requires_bank_id))"
                @click="submit(roleFormRef, () => submitSingleEntitlement(role, idx))"
                size="small"
                >Request</el-button
              >
            </div>
          </li>
        </ul>
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
        Implemented in: {{ footNote.version }} by function_name: {{ footNote.functionName }} (operation_id: {{ footNote.operationId }}). Message Tags: {{ footNote.messageTags }}
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
  list-style: none;
  padding: 0;
}
li {
  padding: 15px;
  margin-bottom: 15px;
  border: 1px solid #414d63;
  border-radius: 6px;
  background-color: rgba(65, 77, 99, 0.2);
}
li:last-child {
  margin-bottom: 0;
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
.role-header {
  display: flex;
  align-items: center;
  gap: 15px;
  justify-content: space-between;
}
.role-name-section {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
}
.role-bank-id-input {
  margin-bottom: 0;
}
.role-bank-id-input input {
  width: 200px;
}
.role-request-button {
  margin-left: auto;
}
.role-header p {
  margin: 0;
  white-space: nowrap;
}
.entitlement-owned-text {
  color: #67c23a;
  font-weight: 500;
  font-size: 14px;
}
.existing-entitlements {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.entitlement-label {
  color: #67c23a;
  font-weight: 500;
  font-size: 13px;
}
.bank-id-badge {
  background-color: rgba(103, 194, 58, 0.2);
  color: #67c23a;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid rgba(103, 194, 58, 0.3);
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
