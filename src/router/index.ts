import { createRouter, createWebHistory } from 'vue-router'
import GlossaryView from '../views/GlossaryView.vue'
import MessageDocsView from '../views/MessageDocsView.vue'
import BodyView from '../views/BodyView.vue'
import Content from '../components/Content.vue'
import Preview from '../components/Preview.vue'
import NotFoundView from '../views/NotFoundView.vue'
import InternalServerErrorView from '../views/InternalServerErrorView.vue'
import { checkServerStatus } from '../obp'

export default async function router(): Promise<any> {
  const isServerUp = false //await checkServerStatus()
  const router = createRouter({
    history: createWebHistory(),
    mode: 'history',
    routes: [
      {
        path: '/',
        redirect: isServerUp ? '/operationid' : '/error'
      },
      {
        path: '/glossary',
        name: 'glossary',
        component: isServerUp ? GlossaryView : InternalServerErrorView
      },
      {
        path: '/message-docs/:id',
        name: 'message-docs',
        component: isServerUp ? MessageDocsView : InternalServerErrorView
      },
      {
        path: '/operationid',
        name: 'operationid',
        component: isServerUp ? BodyView : InternalServerErrorView
      },
      {
        path: '/operationid/:id',
        name: 'operationid-path',
        component: BodyView,
        children: [
          {
            path: '',
            name: 'api',
            components: {
              body: Content,
              preview: Preview
            }
          }
        ]
      },
      {
        path: '/callback',
        name: 'callback',
        component: isServerUp ? BodyView : InternalServerErrorView
      },
      { path: '/error', name: 'error', component: InternalServerErrorView },
      { path: '/:pathMatch(.*)*', name: 'notFound', component: NotFoundView }
    ]
  })
  return router
}
