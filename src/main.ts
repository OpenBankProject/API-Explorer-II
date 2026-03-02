/*
 * Open Bank Project -  API Explorer II
 * Copyright (C) 2023-2024, TESOBE GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * Email: contact@tesobe.com
 * TESOBE GmbH
 * Osloerstrasse 16/17
 * Berlin 13359, Germany
 *
 *   This product includes software developed at
 *   TESOBE (http://www.tesobe.com/)
 *
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import { Check, Close } from '@element-plus/icons-vue'

import App from './App.vue'
import appRouter from './router'
import { createI18n } from 'vue-i18n'
import { languages, defaultLocale } from './language'

import { cache as cacheResourceDocs, cacheDoc as cacheResourceDocsDoc } from './obp/resource-docs'
import {
  cache as cacheMessageDocs,
  cacheDoc as cacheMessageDocsDoc,
  cacheJsonSchema as cacheMessageDocsJsonSchema,
  cacheDocJsonSchema as cacheMessageDocsJsonSchemaDoc
} from './obp/message-docs'
import { OBP_API_VERSION, getMyAPICollections, getMyAPICollectionsEndpoint } from './obp'
import { getOBPGlossary } from './obp/glossary'

import 'element-plus/dist/index.css'
import './assets/main.css'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/700.css'

import { getCacheStorageInfo } from './obp/common-functions'
import {
  obpApiActiveVersionsKey,
  obpApiHostKey,
  obpGlossaryKey,
  obpGroupedMessageDocsKey,
  obpGroupedMessageDocsJsonSchemaKey,
  obpGroupedResourceDocsKey,
  obpMyCollectionsEndpointKey,
  obpResourceDocsKey
} from './obp/keys'
;(async () => {
  const app = createApp(App)
  const router = await appRouter()
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }
  try {
    const worker = new Worker('/js/worker/web-worker.js')
    const isDataSetup = await setupData(app, worker)

    const messages = Object.assign(languages)
    const i18n = createI18n({
      locale: defaultLocale,
      fallbackLocale: 'ES',
      messages
    })

    const pinia = createPinia()

    app.provide('i18n', i18n)
    app.use(ElementPlus)
    app.use(i18n)
    app.use(pinia)
    app.use(router)

    app.mount('#app')

    if (!isDataSetup) {
      // Error details are already stored in sessionStorage by setupData catch block
      router.replace({ path: 'api-server-error' })
    }
    app.config.errorHandler = (error) => {
      console.error('[APP ERROR]', error)
      // Show error details in browser DOM
      const errorDiv = document.createElement('div')
      errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #f5f5f5;
        color: #333;
        padding: 20px;
        border-radius: 8px;
        max-width: 90%;
        max-height: 80vh;
        overflow: auto;
        z-index: 10000;
        font-family: monospace;
        white-space: pre-wrap;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        border: 1px solid #ddd;
      `
      let errorText = ''
      if (error instanceof Error) {
        errorText = `Application Error\n\nMessage:\n${error.message}\n\nStack:\n${error.stack || 'No stack trace available'}`
        errorDiv.innerHTML = `
          <strong style="font-size: 18px;">Application Error</strong><br><br>
          <strong>Message:</strong><br>${error.message}<br><br>
          <strong>Stack:</strong><br>${error.stack || 'No stack trace available'}
        `
      } else {
        errorText = `Application Error\n\n${JSON.stringify(error, null, 2)}`
        errorDiv.innerHTML = `
          <strong style="font-size: 18px;">Application Error</strong><br><br>
          ${JSON.stringify(error, null, 2)}
        `
      }

      const copyBtn = document.createElement('button')
      copyBtn.textContent = '📋 Copy'
      copyBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 90px;
        background: #e0e0e0;
        border: 1px solid #ccc;
        color: #333;
        padding: 5px 10px;
        cursor: pointer;
        border-radius: 4px;
      `
      copyBtn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(errorText)
          copyBtn.textContent = '✓ Copied!'
          setTimeout(() => {
            copyBtn.textContent = '📋 Copy'
          }, 2000)
        } catch (err) {
          console.error('Failed to copy error:', err)
          copyBtn.textContent = '✗ Failed'
          setTimeout(() => {
            copyBtn.textContent = '📋 Copy'
          }, 2000)
        }
      }
      errorDiv.appendChild(copyBtn)

      const closeBtn = document.createElement('button')
      closeBtn.textContent = '✕ Close'
      closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: #e0e0e0;
        border: 1px solid #ccc;
        color: #333;
        padding: 5px 10px;
        cursor: pointer;
        border-radius: 4px;
      `
      closeBtn.onclick = () => errorDiv.remove()
      errorDiv.appendChild(closeBtn)
      document.body.appendChild(errorDiv)
    }
  } catch (error) {
    console.error('[APP SETUP ERROR]', error)
    // Show error details in browser DOM
    const errorDiv = document.createElement('div')
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #f5f5f5;
      color: #333;
      padding: 20px;
      border-radius: 8px;
      max-width: 90%;
      max-height: 80vh;
      overflow: auto;
      z-index: 10000;
      font-family: monospace;
      white-space: pre-wrap;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      border: 1px solid #ddd;
    `
    let errorText = ''
    if (error instanceof Error) {
      errorText = `API Explorer II Error\n\nMessage:\n${error.message}\n\nStack:\n${error.stack || 'No stack trace available'}`
      errorDiv.innerHTML = `
        <strong style="font-size: 18px;">API Explorer II Error</strong><br><br>
        <strong>Message:</strong><br>${error.message}<br><br>
        <strong>Stack:</strong><br>${error.stack || 'No stack trace available'}
      `
    } else {
      errorText = `API Explorer II Error\n\n${JSON.stringify(error, null, 2)}`
      errorDiv.innerHTML = `
        <strong style="font-size: 18px;">API Explorer II Error</strong><br><br>
        ${JSON.stringify(error, null, 2)}
      `
    }

    const copyBtn = document.createElement('button')
    copyBtn.textContent = '📋 Copy'
    copyBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 90px;
      background: #e0e0e0;
      border: 1px solid #ccc;
      color: #333;
      padding: 5px 10px;
      cursor: pointer;
      border-radius: 4px;
    `
    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(errorText)
        copyBtn.textContent = '✓ Copied!'
        setTimeout(() => {
          copyBtn.textContent = '📋 Copy'
        }, 2000)
      } catch (err) {
        console.error('Failed to copy error:', err)
        copyBtn.textContent = '✗ Failed'
        setTimeout(() => {
          copyBtn.textContent = '📋 Copy'
        }, 2000)
      }
    }
    errorDiv.appendChild(copyBtn)

    const closeBtn = document.createElement('button')
    closeBtn.textContent = '✕ Close'
    closeBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: #e0e0e0;
      border: 1px solid #ccc;
      color: #333;
      padding: 5px 10px;
      cursor: pointer;
      border-radius: 4px;
    `
    closeBtn.onclick = () => errorDiv.remove()
    errorDiv.appendChild(closeBtn)
    document.body.appendChild(errorDiv)
  }
})()

async function setupData(app: App<Element>, worker: Worker) {
  try {
    // Clear any previous error
    sessionStorage.removeItem('setupError')
    // 'open': Returns a Promise that resolves to the Cache object matching the cacheName(obp-resource-docs-cache) (a new cache is created if it doesn't already exist.)
    const cacheStorageOfResourceDocs = await caches.open('obp-resource-docs-cache') // Please note: The global 'caches' read-only property returns the 'CacheStorage' object associated with the current context.
    // 'match': Checks if a given Request is a key in any of the Cache objects that the CacheStorage object tracks, and returns a Promise that resolves to that match.
    const cachedResponseOfResourceDocs = await cacheStorageOfResourceDocs.match('/')
    // 'open': Returns a Promise that resolves to the Cache object matching the cacheName(obp-message-docs-cache) (a new cache is created if it doesn't already exist.)
    const cacheStorageOfMessageDocs = await caches.open('obp-message-docs-cache') // Please note: The global 'caches' read-only property returns the 'CacheStorage' object associated with the current context.
    // 'match': Checks if a given Request is a key in any of the Cache objects that the CacheStorage object tracks, and returns a Promise that resolves to that match.
    const cachedResponseOfMessageDocs = await cacheStorageOfMessageDocs.match('/')
    // 'open': Returns a Promise that resolves to the Cache object matching the cacheName(obp-message-docs-json-schema-cache) (a new cache is created if it doesn't already exist.)
    const cacheStorageOfMessageDocsJsonSchema = await caches.open(
      'obp-message-docs-json-schema-cache'
    ) // Please note: The global 'caches' read-only property returns the 'CacheStorage' object associated with the current context.
    // 'match': Checks if a given Request is a key in any of the Cache objects that the CacheStorage object tracks, and returns a Promise that resolves to that match.
    const cachedResponseOfMessageDocsJsonSchema =
      await cacheStorageOfMessageDocsJsonSchema.match('/')

    // Listen to Web worker
    worker.onmessage = async (event) => {
      // Update cache docs data in the background
      if (event.data === 'update-resource-docs') {
        await cacheResourceDocsDoc(cacheStorageOfResourceDocs)
        console.log('Resource Docs cache was updated.')
        const storageInfo = await getCacheStorageInfo()
        console.log(storageInfo)
      }
      if (event.data === 'update-message-docs') {
        await cacheMessageDocsDoc(cacheStorageOfMessageDocs)
        console.log('Message Docs cache was updated.')
      }
      if (event.data === 'update-message-docs-json-schema') {
        await cacheMessageDocsJsonSchemaDoc(cacheStorageOfMessageDocsJsonSchema)
        console.log('Message Docs JSON Schema cache was updated.')
      }
    }

    const { resourceDocs, groupedDocs } = await cacheResourceDocs(
      cacheStorageOfResourceDocs,
      cachedResponseOfResourceDocs,
      worker
    )
    const messageDocs = await cacheMessageDocs(
      cacheStorageOfMessageDocs,
      cachedResponseOfMessageDocs,
      worker
    )
    const messageDocsJsonSchema = await cacheMessageDocsJsonSchema(
      cacheStorageOfMessageDocsJsonSchema,
      cachedResponseOfMessageDocsJsonSchema,
      worker
    )

    // Provide data to a component's descendants
    // App-level provides are available to all components rendered in the app
    // Info: https://vuejs.org/guide/components/provide-inject.html
    app.provide(obpResourceDocsKey, resourceDocs)
    app.provide(obpApiActiveVersionsKey, Object.keys(resourceDocs).sort())
    app.provide(obpGroupedResourceDocsKey, groupedDocs)
    app.provide(obpGroupedMessageDocsKey, messageDocs)
    app.provide(obpGroupedMessageDocsJsonSchemaKey, messageDocsJsonSchema)
    app.provide(obpApiHostKey, import.meta.env.VITE_OBP_API_HOST)
    const glossary = await getOBPGlossary()
    app.provide(obpGlossaryKey, glossary)

    // Try to load user's API collections (requires authentication)
    try {
      console.log('[MAIN] Attempting to load user API collections...')
      const apiCollections = (await getMyAPICollections()).api_collections
      if (apiCollections && apiCollections.length > 0) {
        console.log(`[MAIN] Loaded ${apiCollections.length} API collection(s)`)
        //Uncomment this when other collection will be supported.
        //for (const { api_collection_name } of apiCollections) {
        //  const apiCollectionsEndpoint = (
        //    await getMyAPICollectionsEndpoint(api_collection_name)
        //  ).api_collection_endpoints.map((api) => api.operation_id)
        //  app.provide(obpMyCollectionsEndpointKey, apiCollectionsEndpoint)
        //}
        const apiCollectionsEndpoint = (
          await getMyAPICollectionsEndpoint('Favourites')
        ).api_collection_endpoints.map((api: any) => api.operation_id)
        app.provide(obpMyCollectionsEndpointKey, apiCollectionsEndpoint)
      } else {
        console.log('[MAIN] No API collections found')
        app.provide(obpMyCollectionsEndpointKey, undefined)
      }
    } catch (error: any) {
      if (error?.status === 401) {
        console.log('[MAIN] User not authenticated - skipping API collections (expected behavior)')
      } else {
        console.warn('[MAIN] Failed to load API collections:', error?.message || error)
      }
      app.provide(obpMyCollectionsEndpointKey, undefined)
    }
    return true
  } catch (error) {
    app.provide(obpApiActiveVersionsKey, [OBP_API_VERSION])
    // Store error details for display on error page
    const errorDetails =
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { message: JSON.stringify(error) }
    sessionStorage.setItem('setupError', JSON.stringify(errorDetails))
    console.error('[SETUP ERROR] Stored error details:', errorDetails)
    return false
  }
}
