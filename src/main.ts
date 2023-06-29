import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'

import App from './App.vue'
import router from './router'
import { createI18n } from 'vue-i18n'
import { languages, defaultLocale } from './language'

import { getOBPResourceDocs, getGroupedResourceDocs } from './obp/resource-docs'
import { getMyAPICollections, getMyAPICollectionsEndpoint } from './obp'
import { getOBPGlossary } from './obp/glossary'

import 'element-plus/dist/index.css'
import './assets/main.css'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/700.css'
;(async () => {
  const app = createApp(App)

  const worker = new Worker('/js/worker/web-worker.js')
  const cache = await caches.open('obp-resource-docs-cache')
  const response = await cache.match('/operationid')
  let docs

  const setCacheDocs = async () => {
    docs = await getOBPResourceDocs()
    await cache.put('/operationid', new Response(JSON.stringify(docs)))
  }
  if (response) {
    try {
      docs = await response.json()
      if (!docs) {
        await setCacheDocs()
      }
    } catch (err) {
      console.warn(err)
      //If cache docs is malformed update with the latest resource docs.
      await setCacheDocs()
    }
    worker.postMessage('update-resource-docs')
  } else {
    await setCacheDocs()
  }

  //Listen to Web worker
  worker.onmessage = async (event) => {
    //Update resource docs cache data in the background
    if (event.data === 'update-resource-docs') {
      await setCacheDocs()
    }
  }
  const groupedDocs = await getGroupedResourceDocs(docs)

  app.provide('OBP-ResourceDocs', docs)
  app.provide('OBP-GroupedResourceDocs', groupedDocs)
  app.provide('OBP-API-Host', import.meta.env.VITE_OBP_API_HOST)
  const glossary = await getOBPGlossary()
  app.provide('OBP-Glossary', glossary)

  const apiCollections = (await getMyAPICollections()).api_collections
  if (apiCollections && apiCollections.length > 0) {
    //Uncomment this when other collection will be supported.
    //for (const { api_collection_name } of apiCollections) {
    //  const apiCollectionsEndpoint = (
    //    await getMyAPICollectionsEndpoint(api_collection_name)
    //  ).api_collection_endpoints.map((api) => api.operation_id)
    //  app.provide('OBP-MyCollectionsEndpoint', apiCollectionsEndpoint)
    //}
    const apiCollectionsEndpoint = (
      await getMyAPICollectionsEndpoint('Favourites')
    ).api_collection_endpoints.map((api) => api.operation_id)
    app.provide('OBP-MyCollectionsEndpoint', apiCollectionsEndpoint)
  } else {
    app.provide('OBP-MyCollectionsEndpoint', undefined)
  }

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
})()
