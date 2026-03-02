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

import { createRouter, createWebHistory } from 'vue-router'
import GlossaryView from '../views/GlossaryView.vue'
import HelpView from '../views/HelpView.vue'
import MessageDocsView from '../views/MessageDocsView.vue'
import MessageDocsListView from '../views/MessageDocsListView.vue'
import MessageDocsJsonSchemaView from '../views/MessageDocsJsonSchemaView.vue'
import MessageDocsJsonSchemaListView from '../views/MessageDocsJsonSchemaListView.vue'
import BodyView from '../views/BodyView.vue'
import CollectionView from '../views/CollectionView.vue'
import Content from '../components/Content.vue'
import Preview from '../components/Preview.vue'
import NotFoundView from '../views/NotFoundView.vue'
import InternalServerErrorView from '../views/InternalServerErrorView.vue'
import APIServerErrorView from '../views/APIServerErrorView.vue'
import APIServerStatusView from '../views/APIServerStatusView.vue'
import { isServerUp, OBP_API_DEFAULT_RESOURCE_DOC_VERSION } from '../obp'
import MessageDocsContent from '@/components/CodeBlock.vue'
import ProvidersStatusView from '../views/ProvidersStatusView.vue'
import OIDCDebugView from '../views/OIDCDebugView.vue'

export default async function router(): Promise<any> {
  const isServerActive = await isServerUp()
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: '/',
        redirect: isServerActive ? '/resource-docs' : '/api-server-error'
      },
      {
        path: '/status',
        name: 'status',
        component: APIServerStatusView
      },
      {
        path: '/debug/providers-status',
        name: 'providers-status',
        component: ProvidersStatusView
      },
      {
        path: '/debug/oidc',
        name: 'oidc-debug',
        component: OIDCDebugView
      },
      {
        path: '/glossary',
        name: 'glossary',
        component: isServerActive ? GlossaryView : InternalServerErrorView
      },
      {
        path: '/help',
        name: 'help',
        component: isServerActive ? HelpView : InternalServerErrorView
      },
      {
        path: '/message-docs',
        name: 'message-docs-list',
        component: isServerActive ? MessageDocsListView : InternalServerErrorView
      },
      {
        path: '/message-docs/:id',
        name: 'message-docs',
        component: isServerActive ? MessageDocsView : InternalServerErrorView
      },
      {
        path: '/message-docs-json-schema',
        name: 'message-docs-json-schema-list',
        component: isServerActive ? MessageDocsJsonSchemaListView : InternalServerErrorView
      },
      {
        path: '/message-docs-json-schema/:id',
        name: 'message-docs-json-schema',
        component: isServerActive ? MessageDocsJsonSchemaView : InternalServerErrorView
      },
      {
        path: '/resource-docs',
        redirect: () => {
          return { path: `/resource-docs/${OBP_API_DEFAULT_RESOURCE_DOC_VERSION}` }
        }
      },
      {
        path: '/resource-docs/:version',
        name: 'resource-docs-version',
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
        path: '/operationid',
        redirect: (to) => {
          return { path: '/resource-docs', query: to.query }
        }
      },
      {
        path: '/operationid/:id',
        redirect: (to) => {
          const version = to.query.version || 'OBPv6.0.0'
          return {
            path: `/resource-docs/${version}`,
            query: { operationid: to.params.id }
          }
        }
      },
      {
        path: '/callback',
        name: 'callback',
        component: isServerActive ? BodyView : InternalServerErrorView
      },
      {
        path: '/collections/:id',
        name: 'collection-view',
        component: isServerActive ? CollectionView : InternalServerErrorView,
        children: [
          {
            path: '',
            name: 'collection-api',
            components: {
              body: Content,
              preview: Preview
            }
          }
        ]
      },
      { path: '/api-server-error', name: 'apiServerError', component: APIServerErrorView },
      { path: '/:pathMatch(.*)*', name: 'notFound', component: NotFoundView }
    ]
  })
  return router
}
