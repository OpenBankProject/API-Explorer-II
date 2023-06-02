<script setup lang="ts">
import { ref, reactive, inject, onBeforeMount } from 'vue'
import { onBeforeRouteUpdate, useRoute } from 'vue-router'
import { getOperationDetails } from '../obp/resource-docs'
import type { ElNotification, FormInstance, FormRules } from 'element-plus'
import { get, create, update, discard, createEntitlement, getCurrentUser } from '../obp'

const url = ref('')
const roleName = ref('')
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
const isUserLogon = ref(true)
const type = ref('')
const docs = inject('OBP-ResourceDocs')

const requestFormRef = reactive<FormInstance>({})
const requestForm = reactive({ url: '' })
const requestRules = reactive<FormRules>({
  url: [{ required: true, message: 'URL path is required', trigger: 'blur' }]
})

const roleFormRef = reactive<FormInstance>({})
const roleForm = reactive({})
const roleRules = reactive<FormRules>({})

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

const setValidations = () => {
  if (requiredRoles.value) {
    requiredRoles.value.forEach((role, idx) => {
      if (role.requires_bank_id) {
        roleForm[`role${role.role}${idx}`] = role.role
        roleRules[`bankId${role.role}` + idx] = [
          { required: true, message: 'Bank Id is required', trigger: 'blur' }
        ]
      }
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
const submitRequest = async (form: FormInstance) => {
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
const submit = async (form: FormInstance | undefined, fn: () => void) => {
  if (!form) return
  await form.validate(async (valid) => {
    if (valid) {
      await fn(form)
    } else {
      return false
    }
  })
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
const submitEntitlement = async (form) => {
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
          duration: 4500,
          message: response.message,
          type
        })
      }
    }
  })
}
onBeforeMount(async () => {
  const route = useRoute()
  setOperationDetails(route.params.id)

  const currentUser = await getCurrentUser()
  isUserLogon.value = currentUser.username
  setValidations()
})
onBeforeRouteUpdate((to) => {
  setOperationDetails(to.params.id)
  responseHeaderTitle.value = 'TYPICAL SUCCESSFUL RESPONSE'
  setValidations()
})
</script>

<template>
  <main>
    <el-form ref="requestFormRef" :model="requestForm" :rules="requestRules">
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
    <el-form ref="roleFormRef" :model="roleForm" :rules="roleRules">
      <div v-show="showRequiredRoles">
        <p>REQUIRED ROLES:</p>
        <el-alert v-show="!isUserLogon" type="info" show-icon :closable="false">
          <p>Please login to request this Role.</p>
        </el-alert>
        <ul>
          <li
            v-for="(role, idx) in requiredRoles"
            :key="role.role"
            :name="role.role"
            v-show="role.requires_bank_id"
          >
            <p>{{ role.role }}</p>
            <div class="flex-role-preview-panel" id="request-role-button-panel">
              <el-form-item :prop="`bankId${role.role}${idx}`">
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
</style>
