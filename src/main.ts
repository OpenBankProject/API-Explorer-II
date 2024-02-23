import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'

import App from './App.vue'
import appRouter from './router'
import { createI18n } from 'vue-i18n'
import { languages, defaultLocale } from './language'

import { cache as cacheResourceDocs, cacheDoc as cacheResourceDocsDoc } from './obp/resource-docs'
import { cache as cacheMessageDocs, cacheDoc as cacheMessageDocsDoc } from './obp/message-docs'
import { OBP_API_VERSION, getMyAPICollections, getMyAPICollectionsEndpoint } from './obp'
import { getOBPGlossary } from './obp/glossary'

import 'element-plus/dist/index.css'
import './assets/main.css'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/700.css'
import { obpApiActiveVersionsKey, obpApiHostKey, obpGlossaryKey, obpGroupedMessageDocsKey, obpGroupedResourceDocsKey, obpMyCollectionsEndpointKey, obpResourceDocsKey } from './obp/keys'
import { getCacheStorageInfo } from './obp/common-functions'
(async () => {
  const app = createApp(App)
  const router = await appRouter()
  try {
    const worker = new Worker('/js/worker/web-worker.js')
    const isDataSetup = await setupData(app, worker)

    const messages = Object.assign(languages)
    const i18n = createI18n({
      locale: defaultLocale,
      fallbackLocale: 'ES',
      messages
    })
    app.provide('i18n', i18n)

    app.use(ElementPlus)
    app.use(i18n)
    app.use(createPinia())
    app.use(router)

    app.mount('#app')

    if (!isDataSetup) router.replace({ path: 'api-server-error' })
    app.config.errorHandler = (error) => {
      console.log(error)
      router.replace({ path: 'error' })
    }
  } catch (error) {
    console.log(error)
    router.replace({ path: 'error' })
  }
})()

async function setupData(app: App<Element>, worker: Worker) {
  try {
    // 'open': Returns a Promise that resolves to the Cache object matching the cacheName(obp-resource-docs-cache) (a new cache is created if it doesn't already exist.)
    const cacheStorageOfResourceDocs = await caches.open('obp-resource-docs-cache') // Please note: The global 'caches' read-only property returns the 'CacheStorage' object associated with the current context.
    // 'match': Checks if a given Request is a key in any of the Cache objects that the CacheStorage object tracks, and returns a Promise that resolves to that match.
    const cachedResponseOfResourceDocs = await cacheStorageOfResourceDocs.match('/')
    // 'open': Returns a Promise that resolves to the Cache object matching the cacheName(obp-message-docs-cache) (a new cache is created if it doesn't already exist.)
    const cacheStorageOfMessageDocs = await caches.open('obp-message-docs-cache') // Please note: The global 'caches' read-only property returns the 'CacheStorage' object associated with the current context.
    // 'match': Checks if a given Request is a key in any of the Cache objects that the CacheStorage object tracks, and returns a Promise that resolves to that match.
    const cachedResponseOfMessageDocs = await cacheStorageOfMessageDocs.match('/')

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

    // Provide data to a component's descendants
    // App-level provides are available to all components rendered in the app
    // Info: https://vuejs.org/guide/components/provide-inject.html
    app.provide(obpResourceDocsKey, resourceDocs)
    app.provide(obpApiActiveVersionsKey, Object.keys(resourceDocs).sort())
    app.provide(obpGroupedResourceDocsKey, groupedDocs)
    app.provide(obpGroupedMessageDocsKey, messageDocs)
    app.provide(obpApiHostKey, import.meta.env.VITE_OBP_API_HOST)
    const glossary = await getOBPGlossary()
    app.provide(obpGlossaryKey, glossary)

    const apiCollections = (await getMyAPICollections()).api_collections
    if (apiCollections && apiCollections.length > 0) {
      //Uncomment this when other collection will be supported.
      //for (const { api_collection_name } of apiCollections) {
      //  const apiCollectionsEndpoint = (
      //    await getMyAPICollectionsEndpoint(api_collection_name)
      //  ).api_collection_endpoints.map((api) => api.operation_id)
      //  app.provide(obpMyCollectionsEndpointKey, apiCollectionsEndpoint)
      //}
      const apiCollectionsEndpoint = (
        await getMyAPICollectionsEndpoint('Favourites')
      ).api_collection_endpoints.map((api) => api.operation_id)
      app.provide(obpMyCollectionsEndpointKey, apiCollectionsEndpoint)
    } else {
      app.provide(obpMyCollectionsEndpointKey, undefined)
    }
    return true
  } catch (error) {
    app.provide(obpApiActiveVersionsKey, [OBP_API_VERSION])
    return false
  }
}
