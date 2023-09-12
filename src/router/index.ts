import { createRouter, createWebHistory } from 'vue-router'
import GlossaryView from '../views/GlossaryView.vue'
import MessageDocsView from '../views/MessageDocsView.vue'
import BodyView from '../views/BodyView.vue'
import Content from '../components/Content.vue'
import Preview from '../components/Preview.vue'
import NotFoundView from '../views/NotFoundView.vue'
import InternalServerErrorView from '../views/InternalServerErrorView.vue'
import APIServerErrorView from '../views/APIServerErrorView.vue'
import { isServerUp } from '../obp'

export default async function router(): Promise<any> {
  const isServerActive = await isServerUp()
  const router = createRouter({
    history: createWebHistory(),
    mode: 'history',
    routes: [
      {
        path: '/',
        redirect: isServerActive ? '/operationid' : '/api-server-error'
      },
      {
        path: '/glossary',
        name: 'glossary',
        component: isServerActive ? GlossaryView : InternalServerErrorView
      },
      {
        path: '/message-docs/:id',
        name: 'message-docs',
        component: isServerActive ? MessageDocsView : InternalServerErrorView
      },
      {
        path: '/operationid',
        name: 'operationid',
        component: isServerActive ? BodyView : InternalServerErrorView
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
        component: isServerActive ? BodyView : InternalServerErrorView
      },
      { path: '/error', name: 'error', component: InternalServerErrorView },
      { path: '/api-server-error', name: 'apiServerError', component: APIServerErrorView },
      { path: '/:pathMatch(.*)*', name: 'notFound', component: NotFoundView }
    ]
  })
  return router
}
