import { createRouter, createWebHistory } from 'vue-router'
import GlossaryView from '../views/GlossaryView.vue'
import LoginView from '../views/LoginView.vue'
import BodyView from '../views/BodyView.vue'
import Content from '../components/Content.vue'
import Preview from '../components/Preview.vue'
import NotFoundView from '../views/NotFoundView.vue'

const router = createRouter({
  history: createWebHistory(),
  mode: 'history',
  routes: [
    {
      path: '/',
      redirect: '/operationid'
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/glossary',
      name: 'glossary',
      component: GlossaryView
    },
    {
      path: '/operationid',
      name: 'operationid',
      component: BodyView
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
      component: BodyView
    },
    { path: '/:pathMatch(.*)*', name: 'notFound', component: NotFoundView }
  ]
})

export default router
