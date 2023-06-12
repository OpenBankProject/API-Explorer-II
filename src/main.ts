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

  const cache = await caches.open('obp-resource-docs-cache')
  const response = await cache.match('/operationid')
  let docs
  if (response) {
    docs = await response.json()
  } else {
    docs = await getOBPResourceDocs()
    await cache.put('/operationid', new Response(JSON.stringify(docs)))
  }
  const groupedDocs = await getGroupedResourceDocs(docs)
  app.provide('OBP-ResourceDocs', docs)
  app.provide('OBP-GroupedResourceDocs', groupedDocs)
  app.provide('OBP-API-Host', import.meta.env.VITE_OBP_API_HOST)
  const glossary = await getOBPGlossary()
  app.provide('OBP-Glossary', glossary)

  const apiCollections = (await getMyAPICollections()).api_collections
  if (apiCollections) {
    for (const { api_collection_name } of apiCollections) {
      const apiCollectionsEndpoint = (
        await getMyAPICollectionsEndpoint(api_collection_name)
      ).api_collection_endpoints.map((api) => api.operation_id)
      app.provide('OBP-MyCollectionsEndpoint', apiCollectionsEndpoint)
    }
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
