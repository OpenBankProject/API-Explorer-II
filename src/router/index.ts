/*
 * *
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

import { createRouter, createWebHistory } from 'vue-router'
import GlossaryView from '../views/GlossaryView.vue'
import MessageDocsView from '../views/MessageDocsView.vue'
import BodyView from '../views/BodyView.vue'
import Content from '../components/Content.vue'
import Preview from '../components/Preview.vue'
import NotFoundView from '../views/NotFoundView.vue'
import InternalServerErrorView from '../views/InternalServerErrorView.vue'
import APIServerErrorView from '../views/APIServerErrorView.vue'
import APIServerStatusView from '../views/APIServerStatusView.vue'
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
        path: '/status',
        name: 'status',
        component: APIServerStatusView
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
