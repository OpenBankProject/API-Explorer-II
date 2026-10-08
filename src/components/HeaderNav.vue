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
import { ref, inject, watchEffect, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { OBP_API_DEFAULT_RESOURCE_DOC_VERSION, getCurrentUser } from '../obp'
import { getOBPAPIVersions } from '../obp/api-version'
import {
  LOGO_URL as logoSource,
  HEADER_LINKS_COLOR,
  HEADER_LINKS_HOVER_COLOR as headerLinksHoverColorSetting,
  HEADER_LINKS_BACKGROUND_COLOR as headerLinksBackgroundColorSetting
} from '../obp/style-setting'
import { obpApiActiveVersionsKey, obpGroupedMessageDocsKey, obpGroupedMessageDocsJsonSchemaKey, obpMyCollectionsEndpointKey, obpResourceDocsKey } from '@/obp/keys'
import { getDynamicNamespaces } from '../obp/resource-docs'
import SvelteDropdown from './SvelteDropdown.vue'
import { theme, toggleTheme } from '../obp/theme'

const route = useRoute()
const router = useRouter()
const obpApiHost = ref(import.meta.env.VITE_OBP_API_HOST)
const obpApiPortalHost = ref(import.meta.env.VITE_OBP_API_PORTAL_HOST)
const obpApiHybridPost = computed(() => obpApiPortalHost.value ? obpApiPortalHost.value : obpApiHost.value)
const obpApiManagerHost = ref(import.meta.env.VITE_OBP_API_MANAGER_HOST)
const hasObpApiManagerHost = computed(() => obpApiManagerHost.value ? true : false)
const showObpApiManagerButton = computed(() => import.meta.env.VITE_SHOW_API_MANAGER_BUTTON === 'true')
const loginUsername = ref('')
const logoffurl = ref('')
const obpApiVersions = ref(inject(obpApiActiveVersionsKey) || [])
const obpMessageDocs = ref(Object.keys(inject(obpGroupedMessageDocsKey) || {}))
const obpMessageDocsJsonSchema = ref(Object.keys(inject(obpGroupedMessageDocsJsonSchemaKey) || {}))

// Combine message docs with JSON Schema items (with "J Schema" postfix)
const combinedMessageDocs = computed(() => {
  const regularDocs = obpMessageDocs.value || []
  const jsonSchemaDocs = (obpMessageDocsJsonSchema.value || []).map(connector => `${connector} J Schema`)
  return [...regularDocs, ...jsonSchemaDocs]
})

// On the API Explorer page the header filters its docs by ?content= instead of linking to it.
const isResourceDocsPage = computed(() => route.name === 'api')
const contentFilters = [
  { value: 'static', label: 'Static' },
  { value: 'dynamic', label: 'Dynamic' },
  { value: 'all', label: 'All' }
]
const activeContentFilter = computed(() =>
  route.query.content === 'static' || route.query.content === 'dynamic' ? route.query.content : 'all'
)
const contentFilterLink = (value: string) => ({
  name: 'api',
  params: { version: route.params.version },
  query: value === 'all' ? {} : { content: value }
})

// In Dynamic mode the docs can be narrowed further to one namespace: a bank, or SYS.
const ALL_NAMESPACES = 'All'
const resourceDocs = inject(obpResourceDocsKey, {})
const namespaces = computed(() =>
  isResourceDocsPage.value && activeContentFilter.value === 'dynamic'
    ? [ALL_NAMESPACES, ...getDynamicNamespaces(route.params.version as string, resourceDocs)]
    : []
)
const namespaceLabel = computed(
  () => `Namespace: ${typeof route.query.bank_id === 'string' && route.query.bank_id ? route.query.bank_id : ALL_NAMESPACES}`
)
const selectNamespace = (namespace: string) => {
  router.push({
    name: 'api',
    params: { version: route.params.version },
    query: namespace === ALL_NAMESPACES ? { content: 'dynamic' } : { content: 'dynamic', bank_id: namespace }
  })
}

// Help menu items (includes debug pages)
const helpMenuRoutes: Record<string, string> = {
  'Help': '/help',
  'About': '/about',
  'Providers Status': '/debug/providers-status',
  'OIDC': '/debug/oidc'
}

const GRPC_SERVICES_ITEM = 'gRPC Services'
const helpMenuItems = ref(Object.keys(helpMenuRoutes))

// Split versions into main and other.
// Main = most recent versions per standard (newest first), then dynamic endpoints/entities.
const DYNAMIC_ITEMS = ['dynamic-endpoints', 'dynamic-entities', 'OBPdynamic-endpoint', 'OBPdynamic-entity']

const versionNumbers = (v: string): number[] =>
  v.slice(v.indexOf('v') + 1).split('.').map(Number)

const compareVersionsDesc = (a: string, b: string): number => {
  const pa = versionNumbers(a)
  const pb = versionNumbers(b)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

const mostRecent = (all: string[], standard: string, count: number): string[] =>
  all
    .filter((v) => v.startsWith(`${standard}v`))
    .sort(compareVersionsDesc)
    .slice(0, count)

const sortedVersions = computed(() => {
  const all = obpApiVersions.value || []
  console.log('All available versions:', all)
  const main = [
    ...mostRecent(all, 'OBP', 3),
    ...mostRecent(all, 'BG', 2),
    ...mostRecent(all, 'UK', 2),
    ...DYNAMIC_ITEMS.filter((v) => all.includes(v))
  ]
  console.log('Main versions found:', main)
  const others = all.filter(v => !main.includes(v)).sort()
  console.log('Other versions:', others)

  // Insert gRPC Services between main (first set) and other (second set) versions
  const items: string[] = []
  if (main.length > 0) {
    items.push(...main)
    items.push('---')
  }
  items.push(GRPC_SERVICES_ITEM)
  if (others.length > 0) {
    items.push('---')
    items.push(...others)
  }
  return items
})

const isShowLoginButton = ref(true)
const isShowLogOffButton = ref(false)
const oauth2Available = ref(true) // Assume available initially
const oauth2StatusMessage = ref('')
const logo = ref(logoSource)
const headerLinksHoverColor = ref(headerLinksHoverColorSetting)
const headerLinksBackgroundColor = ref(headerLinksBackgroundColorSetting)

// Multi-provider support
const availableProviders = ref<Array<{ name: string; available: boolean; lastChecked?: Date; error?: string }>>([])
const showProviderSelector = ref(false)
const isLoadingProviders = ref(false)

// OAuth2 availability is determined by provider availability
// No separate status check needed

// Fetch available OIDC providers
async function fetchAvailableProviders() {
  isLoadingProviders.value = true
  try {
    const response = await fetch('/api/oauth2/providers')
    const data = await response.json()

    if (data.providers && Array.isArray(data.providers)) {
      availableProviders.value = data.providers
      console.log('Available OAuth2 providers:', availableProviders.value)
      console.log(`Total: ${data.count}, Available: ${data.availableCount}`)
    } else {
      console.warn('No providers returned from /api/oauth2/providers')
      availableProviders.value = []
    }
  } catch (error) {
    console.error('Failed to fetch OAuth2 providers:', error)
    availableProviders.value = []
  } finally {
    isLoadingProviders.value = false
  }
}

// Handle login button click
function handleLoginClick() {
  const available = availableProviders.value.filter(p => p.available)

  if (available.length > 1) {
    // Show provider selection dialog
    showProviderSelector.value = true
  } else if (available.length === 1) {
    // Direct login with single provider
    loginWithProvider(available[0].name)
  } else {
    // No providers available
    console.error('No OAuth2 providers available. Check backend configuration.')
    alert('Login is not available. Please check that OAuth2 providers are configured.')
  }
}

// Login with selected provider
function loginWithProvider(provider: string) {
  const redirectUrl = '/api/oauth2/connect?provider=' +
    encodeURIComponent(provider) +
    '&redirect=' +
    encodeURIComponent(getCurrentPath())
  console.log(`Logging in with provider: ${provider}`)
  window.location.href = redirectUrl
}

// Format provider name for display
function formatProviderName(name: string): string {
  // Convert "obp-oidc" to "OBP OIDC", "keycloak" to "Keycloak", etc.
  return name.split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Get provider icon
function getProviderIcon(name: string): string {
  const icons: Record<string, string> = {
    'obp-oidc': '🏦',
    'keycloak': '🔐',
    'google': '🔵',
    'github': '🐙'
  }
  return icons[name] || '🔑'
}

// Copy text to clipboard
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    console.log('Error message copied to clipboard')
  } catch (err) {
    console.error('Failed to copy text to clipboard:', err)
  }
}

const clearActiveTab = () => {
  const activeLinks = document.querySelectorAll<HTMLElement>('.router-link')
  for (const active of activeLinks) {
    // Skip login and logoff buttons
    if (active.id && active.id !== 'login' && active.id !== 'logoff') {
      active.style.backgroundColor = 'transparent'
      active.style.color = 'var(--obp-header-link)'
    }
  }
}

const setActive = (target: HTMLElement | null) => {
  if (target) {
    clearActiveTab()
    target.style.backgroundColor = headerLinksBackgroundColor.value
    target.style.color = HEADER_LINKS_COLOR
  }
}

const handleMore = (command: string, source?: string) => {
  console.log('handleMore called with command:', command, 'source:', source)

  // Ignore divider
  if (command === '---') {
    return
  }

  let element = document.getElementById("selected-api-version")
  if (element !== null) {
    element.textContent = command;
  }

  if (command === GRPC_SERVICES_ITEM) {
    console.log('Navigating to gRPC services')
    router.push('/grpc-services')
    return
  }

  // Check if command ends with " J Schema" - if so, it's a JSON Schema message doc
  if (command.endsWith(' J Schema')) {
    const connector = command.replace(' J Schema', '')
    console.log('Navigating to message docs JSON schema:', connector)
    router.push({ name: 'message-docs-json-schema', params: { id: connector } })
  } else if (command === '/message-docs') {
    // Navigate to message docs list
    console.log('Navigating to message docs list')
    router.push({ name: 'message-docs-list' })
  } else if (command === '/message-docs-json-schema') {
    // Navigate to message docs JSON schema list
    console.log('Navigating to message docs JSON schema list')
    router.push({ name: 'message-docs-json-schema-list' })
  } else if (command.includes('_')) {
    // Regular message docs (connector names contain underscores)
    console.log('Navigating to message docs:', command)
    router.push({ name: 'message-docs', params: { id: command } })
  } else if (command in helpMenuRoutes) {
    const route = helpMenuRoutes[command]
    console.log('Navigating to:', route)
    router.push(route)
  } else {
    console.log('Navigating to resource docs:', `/resource-docs/${command}`)
    console.log('Current route:', route.path)
    // Clear operationid query param when changing versions to avoid showing non-existent operation
    router.push(`/resource-docs/${command}`)
  }
}

onMounted(async () => {
  // Fetch available providers
  await fetchAvailableProviders()

  const currentUser = await getCurrentUser()
  const currentResponseKeys = Object.keys(currentUser)
  if (currentResponseKeys.includes('username')) {
    loginUsername.value = currentUser.username
    isShowLoginButton.value = false
    isShowLogOffButton.value = !isShowLoginButton.value
  } else {
    isShowLoginButton.value = true
    isShowLogOffButton.value = !isShowLoginButton.value
  }
})

onUnmounted(() => {
  // Cleanup hook
})

watchEffect(() => {
  const routeName = typeof route.name === 'string' ? route.name : null
  if (routeName && route.params && !route.params.id) {
    setActive(document.getElementById(`header-nav-${routeName}`))
  } else {
    if (routeName === 'message-docs') {
      clearActiveTab()
    } else {
      setActive(document.getElementById('header-nav-tags'))
    }
  }
})

const getCurrentPath = () => {
  const currentPath = route.path
  const queryString = new URLSearchParams(route.query as Record<string, string>).toString()
  return queryString ? `${currentPath}?${queryString}` : currentPath
}

</script>

<template>
  <a :href="obpApiHybridPost">
    <img alt="OBP logo" class="logo" v-show="logo" :src="logo" />
    <img alt="OBP logo" class="logo" v-show="!logo" src="@/assets/logo2x-1.png" />
  </a>
  <nav id="nav">
    <RouterView name="header">
      <a v-bind:href="obpApiHybridPost" class="router-link" id="header-nav-home">
        {{ $t('header.portal_home') }}
      </a>
      <span v-if="isResourceDocsPage" class="content-filter">
        <RouterLink
          v-for="filter in contentFilters"
          :key="filter.value"
          class="router-link"
          :class="{ 'content-filter-active': activeContentFilter === filter.value }"
          :to="contentFilterLink(filter.value)"
          >{{ filter.label }}</RouterLink
        >
        <SvelteDropdown
          v-if="namespaces.length > 0"
          id="header-nav-namespace"
          :label="namespaceLabel"
          :items="namespaces"
          :hover-color="headerLinksHoverColor"
          :background-color="headerLinksBackgroundColor"
          @select="selectNamespace"
        />
      </span>
      <RouterLink v-else class="router-link" id="header-nav-tags" :to="'/resource-docs/' + OBP_API_DEFAULT_RESOURCE_DOC_VERSION">{{
        $t('header.api_explorer') }}</RouterLink>
      <RouterLink class="router-link" id="header-nav-glossary" to="/glossary">{{
        $t('header.glossary')
      }}</RouterLink>
      <SvelteDropdown
        class="menu-right"
        id="header-nav-help"
        label="Help"
        :items="helpMenuItems"
        :hover-color="headerLinksHoverColor"
        :background-color="headerLinksBackgroundColor"
        @select="handleMore"
      />
      <a v-if="showObpApiManagerButton && hasObpApiManagerHost" v-bind:href="obpApiManagerHost" class="router-link" id="header-nav-api-manager">
        {{ $t('header.api_manager') }}
      </a>
      <SvelteDropdown
        class="menu-right"
        id="header-nav-versions"
        label="Versions"
        :items="sortedVersions"
        :hover-color="headerLinksHoverColor"
        :background-color="headerLinksBackgroundColor"
        @select="handleMore"
      />
      <SvelteDropdown
        class="menu-right"
        id="header-nav-message-docs"
        label="Message Docs"
        :items="combinedMessageDocs"
        :hover-color="headerLinksHoverColor"
        :background-color="headerLinksBackgroundColor"
        @select="handleMore"
      />
      <!--<span class="el-dropdown-link">
        <RouterLink class="router-link" id="header-nav-spaces" to="/spaces">{{
          $t('header.spaces')
        }}</RouterLink>
        <el-icon class="el-icon--right">
          <arrow-down />
        </el-icon>
      </span>-->
      <el-tooltip v-if="isShowLoginButton && !oauth2Available" :content="oauth2StatusMessage || 'OAuth2 server not available'" placement="bottom">
        <button disabled class="login-button-disabled router-link" id="login">
          {{ $t('header.login') }}
        </button>
      </el-tooltip>
      <button
        v-else-if="isShowLoginButton && oauth2Available"
        @click="handleLoginClick"
        class="login-button router-link"
        id="login"
      >
        {{ $t('header.login') }}
      </button>
      <span v-show="isShowLogOffButton" class="login-user">{{ loginUsername }}</span>
      <a v-bind:href="'/api/user/logoff?redirect=' + encodeURIComponent(getCurrentPath())" v-show="isShowLogOffButton" class="logoff-button router-link" id="logoff">
        {{ $t('header.logoff') }}
      </a>
      <button
        class="theme-toggle router-link"
        id="header-nav-theme"
        :title="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="toggleTheme"
      >
        <el-icon :size="16"><Sunny v-if="theme === 'dark'" /><Moon v-else /></el-icon>
      </button>
    </RouterView>
  </nav>

  <!-- Provider Selection Dialog -->
  <el-dialog
    v-model="showProviderSelector"
    title="Login"
    width="500px"
    :close-on-click-modal="true"
  >
    <!-- No providers available -->
    <div v-if="availableProviders.filter(p => p.available).length === 0" class="no-providers-error">
      <p class="error-message">No authentication providers available.</p>
      <p class="error-hint">Please contact your administrator.</p>

      <!-- Show unavailable providers even when no available providers -->
      <div v-if="availableProviders.filter(p => !p.available).length > 0" class="unavailable-section">
        <p class="unavailable-header">Currently unavailable:</p>
        <div
          v-for="provider in availableProviders.filter(p => !p.available)"
          :key="provider.name"
          class="provider-unavailable"
        >
          <div class="provider-unavailable-header">
            <span class="provider-status-indicator offline">●</span>
            <span class="provider-name">{{ formatProviderName(provider.name) }}</span>
            <span class="unavailable-label">Unavailable</span>
          </div>
          <div v-if="provider.error" class="provider-error">
            <div class="provider-error-text">{{ provider.error }}</div>
            <button
              @click.stop="copyToClipboard(provider.error)"
              class="copy-button"
              title="Copy error message"
            >
              📋
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Available providers -->
    <div v-else class="provider-selection">
      <p class="selection-hint">Choose your authentication provider:</p>

      <div class="available-providers">
        <button
          v-for="provider in availableProviders.filter(p => p.available)"
          :key="provider.name"
          class="provider-button"
          @click="loginWithProvider(provider.name); showProviderSelector = false"
        >
          <span class="provider-button-content">
            <span class="provider-status-indicator online">●</span>
            <span class="provider-button-text">{{ formatProviderName(provider.name) }}</span>
          </span>
        </button>
      </div>

      <!-- Unavailable providers section -->
      <div v-if="availableProviders.filter(p => !p.available).length > 0" class="unavailable-section">
        <p class="unavailable-header">Currently unavailable:</p>
        <div
          v-for="provider in availableProviders.filter(p => !p.available)"
          :key="provider.name"
          class="provider-unavailable"
        >
          <div class="provider-unavailable-header">
            <span class="provider-status-indicator offline">●</span>
            <span class="provider-name">{{ formatProviderName(provider.name) }}</span>
            <span class="unavailable-label">Unavailable</span>
          </div>
          <div v-if="provider.error" class="provider-error">
            <div class="provider-error-text">{{ provider.error }}</div>
            <button
              @click.stop="copyToClipboard(provider.error)"
              class="copy-button"
              title="Copy error message"
            >
              📋
            </button>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style>
nav {
  text-align: right;
  display: table-cell;
  vertical-align: middle;
}

.logo {
  display: table-cell;
  vertical-align: middle;
  transform: translateY(-50%);
  top: 50%;
}

.header {
  position: relative;
  display: table;
}

.header::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 1px;
  background-color: var(--el-border-color-light);
  z-index: var(--el-index-normal);
}

.login-user {
  font-family: 'Roboto';
  padding: 9px;
  color: var(--obp-text-strong);
  font-size: 14px;
  border-radius: 8px;
}

.router-link {
  padding: 9px;
  margin: 3px;
  color: var(--obp-header-link);
  font-family: 'Roboto';
  font-size: 14px;
  text-decoration: none;
  border-radius: 8px;
}

.router-link:hover {
  background-color: v-bind(headerLinksBackgroundColor) !important;
  color: v-bind(headerLinksHoverColor) !important;
}

.router-link.content-filter-active {
  background-color: v-bind(headerLinksBackgroundColor);
  color: v-bind(HEADER_LINKS_COLOR);
}

.logo {
  height: 40px;
  position: absolute;
  cursor: pointer;
}

a.login-button,
a.logoff-button,
button.login-button {
  margin: 5px;
  color: #ffffff;
  background-color: #32b9ce;
  cursor: pointer;
  border: none;
}

button.login-button-disabled {
  margin: 5px;
  padding: 9px;
  color: #999999;
  background-color: #e0e0e0;
  border: 1px solid #cccccc;
  border-radius: 8px;
  cursor: not-allowed;
  font-family: 'Roboto';
  font-size: 14px;
  opacity: 0.6;
}

html.dark button.login-button-disabled {
  color: #8d9095;
  background-color: #2b2d31;
  border-color: #4c4d4f;
}

.login-button:hover,
.logoff-button:hover {
  color: #39455f;
}

button.theme-toggle {
  background: none;
  border: none;
  cursor: pointer;
  vertical-align: middle;
  line-height: 0;
}

/* Custom dropdown containers */
#header-nav-versions,
#header-nav-namespace,
#header-nav-message-docs,
#header-nav-help {
  display: inline-block;
  vertical-align: middle;
}

/* Provider Selection Dialog */
.provider-selection {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.selection-hint {
  text-align: center;
  font-size: 14px;
  color: var(--obp-text-muted);
  margin: 0 0 8px 0;
}

.available-providers {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.provider-button {
  width: 100%;
  padding: 14px 20px;
  background-color: #32b9ce;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-family: 'Roboto', sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.provider-button:hover {
  background-color: #2a9fb0;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(50, 185, 206, 0.3);
}

.provider-button-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.provider-button-text {
  flex: 1;
  text-align: left;
  margin-left: 8px;
}

.provider-status-indicator {
  font-size: 14px;
  margin-right: 8px;
}

.provider-status-indicator.online {
  color: #10b981;
}

.provider-status-indicator.offline {
  color: #ef4444;
}

/* Unavailable providers section */
.unavailable-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

html.dark .unavailable-section {
  border-top-color: #3a3d44;
}

.unavailable-header {
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
  margin: 0 0 12px 0;
}

.provider-unavailable {
  width: 100%;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background-color: #f9fafb;
  opacity: 0.7;
  margin-bottom: 8px;
}

html.dark .provider-unavailable {
  border-color: #4c4d4f;
  background-color: #1b1d22;
}

.provider-unavailable-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.provider-name {
  flex: 1;
  color: #4b5563;
  font-size: 14px;
}

html.dark .provider-name {
  color: #cfd3dc;
}

.unavailable-label {
  font-size: 11px;
  color: #ef4444;
  font-weight: 500;
  text-transform: uppercase;
}

.provider-error {
  display: flex;
  align-items: start;
  gap: 8px;
  margin-top: 8px;
  margin-left: 22px;
}

.provider-error-text {
  flex: 1;
  font-size: 11px;
  color: #6b7280;
  max-height: 80px;
  overflow-y: auto;
  word-break: break-word;
  white-space: pre-wrap;
  line-height: 1.4;
}

html.dark .provider-error-text {
  color: #a3a6ad;
}

.copy-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  opacity: 0.6;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.copy-button:hover {
  opacity: 1;
}

/* No providers error state */
.no-providers-error {
  text-align: center;
  padding: 24px;
}

.error-message {
  color: #ef4444;
  font-size: 15px;
  margin: 0 0 8px 0;
  font-weight: 500;
}

.error-hint {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

html.dark .error-hint {
  color: #a3a6ad;
}
</style>
