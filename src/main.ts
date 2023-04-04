import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import { getOBPResourceDocs, getGroupedResourceDocs } from './obp/resource-docs'

import 'element-plus/dist/index.css'
import './assets/main.css'
;(async () => {
  const app = createApp(App)

  const docs = await getOBPResourceDocs()
  const groupedDocs = await getGroupedResourceDocs(docs)
  app.provide('OBP-ResourceDocs', docs)
  app.provide('OBP-GroupedResourceDocs', groupedDocs)

  app.use(createPinia())
  app.use(router)

  app.mount('#app')
})()
