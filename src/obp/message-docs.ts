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

import { OBP_API_VERSION, get, isServerUp } from '../obp'
import { V6_0_0 } from '../shared-constants'
import { runWithConcurrency, updateLoadingInfoMessage } from './common-functions'
import { putDocumentationCache, scheduleDocumentationRefreshIfDue } from './documentation-refresh'

const MESSAGE_DOCS_CONCURRENCY = 4

// Connectors to exclude from message docs display
const excludedConnectors = ['mapped', 'star', 'proxy', 'internal', 'cardano', 'ethereum']

// Fallback list in case the API endpoint is unavailable
const fallbackConnectors = [
  'akka_vDec2018',
  'rest_vMar2019',
  'stored_procedure_vDec2019',
  'rabbitmq_vOct2024'
]

// cacheDoc and cacheDocJsonSchema each call getConnectors() and, since this PR, can run
// concurrently (see main.ts's Promise.all) — share one in-flight request instead of firing
// two near-simultaneous GETs to the same endpoint. Reset once it settles so a later
// background re-warm still sees a fresh connector list.
let connectorsRequest: Promise<string[]> | null = null

// Fetch available connectors dynamically from the API
export async function getConnectors(): Promise<string[]> {
  if (connectorsRequest) {
    return connectorsRequest
  }
  connectorsRequest = (async () => {
    try {
      const data = await get(`obp/${V6_0_0}/system/connectors`)
      if (data && data.connectors && Array.isArray(data.connectors)) {
        const connectorNames = data.connectors
          .map((c: any) => c.connector_name)
          .filter((name: string) => !excludedConnectors.some(exc => name === exc || name.startsWith(exc + '_')))
        console.log('Fetched connectors from API:', connectorNames)
        return connectorNames
      }
    } catch (error) {
      console.warn('Failed to fetch connectors from API, using fallback list:', error)
    }
    return fallbackConnectors
  })()
  try {
    return await connectorsRequest
  } finally {
    connectorsRequest = null
  }
}

// Get Message Docs
export async function getOBPMessageDocs(item: string): Promise<any> {
  const logMessage = `Loading message docs { connector: ${item} }`
  console.log(logMessage)
  updateLoadingInfoMessage(logMessage)
  return await get(`obp/${OBP_API_VERSION}/message-docs/${item}`)
}

// Get Message Docs JSON Schema
export async function getOBPMessageDocsJsonSchema(item: string): Promise<any> {
  const logMessage = `Loading message docs JSON schema { connector: ${item} }`
  console.log(logMessage)
  updateLoadingInfoMessage(logMessage)
  return await get(`obp/${V6_0_0}/message-docs/${item}/json-schema`)
}

export function getGroupedMessageDocs(docs: any): any {
  return docs.message_docs.reduce((values: any, doc: any) => {
    const tag = doc.adapter_implementation.group.replace('-', '').trim()
    ;(values[tag] = values[tag] || []).push(doc)
    return values
  }, {})
}

export function getGroupedMessageDocsJsonSchema(docs: any): any {
  console.log('getGroupedMessageDocsJsonSchema - Raw docs:', docs)

  // Access messages from the correct path: properties.messages.items
  const messages = docs.properties?.messages?.items
  const definitions = docs.definitions || {}

  if (!messages || !Array.isArray(messages)) {
    console.log('No messages array found, falling back to definitions')
    // Fallback to old structure if messages array doesn't exist
    if (!definitions || typeof definitions !== 'object') {
      console.log('No definitions object found either')
      return { grouped: {}, definitions: {} }
    }

    // Convert definitions object to array format and group by InBound/OutBound prefix
    const grouped: any = {}
    Object.keys(definitions).forEach((methodName: string) => {
      const schema = definitions[methodName]

      // Determine category based on method name prefix
      let category = 'Uncategorized'
      if (methodName.startsWith('InBound')) {
        category = 'Inbound Methods'
      } else if (methodName.startsWith('OutBound')) {
        category = 'Outbound Methods'
      }

      if (!grouped[category]) {
        grouped[category] = []
      }

      grouped[category].push({
        method_name: methodName,
        category: category,
        outbound_schema: schema,
        inbound_schema: schema
      })
    })

    console.log('Grouped definitions result:', grouped)
    return { grouped, definitions }
  }

  // Group messages by adapter_implementation.group
  console.log('Processing messages array')
  const grouped: any = {}
  messages.forEach((message: any) => {
    const category =
      message.adapter_implementation?.group?.replace('-', '').trim() || 'Uncategorized'

    if (!grouped[category]) {
      grouped[category] = []
    }

    // Keep original schemas with $refs intact
    grouped[category].push({
      method_name: message.process,
      category: category,
      description: message.description,
      outbound_schema: message.outbound_schema,
      inbound_schema: message.inbound_schema,
      message_format: message.message_format
    })
  })

  console.log('Grouped messages result:', grouped)
  console.log('Definitions:', definitions)
  return { grouped, definitions }
}

export async function cacheDoc(cacheStorageOfMessageDocs: any): Promise<any> {
  const connectors = await getConnectors()
  const messageDocs: any = {}
  let failed = 0
  await runWithConcurrency(connectors, MESSAGE_DOCS_CONCURRENCY, async (connector: string) => {
    const logMessage = `Caching message docs { connector: ${connector} }`
    console.log(logMessage)
    updateLoadingInfoMessage(logMessage)
    try {
      const docs = await getOBPMessageDocs(connector)
      if (!Object.keys(docs).includes('code')) {
        messageDocs[connector] = getGroupedMessageDocs(docs)
      } else {
        failed++
      }
    } catch (error: any) {
      failed++
      console.warn(`[CACHE] WARNING: Skipping message docs for connector ${connector}:`, error.message || error)
    }
  })
  await putDocumentationCache(cacheStorageOfMessageDocs, messageDocs, failed === 0, 'message docs')
  return messageDocs
}

async function getCacheDoc(cacheStorageOfMessageDocs: any): Promise<any> {
  return await cacheDoc(cacheStorageOfMessageDocs)
}

export async function cacheDocJsonSchema(cacheStorageOfMessageDocsJsonSchema: any): Promise<any> {
  const connectors = await getConnectors()
  const messageDocsJsonSchema: any = {}
  let failed = 0
  await runWithConcurrency(connectors, MESSAGE_DOCS_CONCURRENCY, async (connector: string) => {
    const logMessage = `Caching message docs JSON schema { connector: ${connector} }`
    console.log(logMessage)
    updateLoadingInfoMessage(logMessage)
    try {
      const docs = await getOBPMessageDocsJsonSchema(connector)
      if (!Object.keys(docs).includes('code')) {
        messageDocsJsonSchema[connector] = getGroupedMessageDocsJsonSchema(docs)
      } else {
        failed++
      }
    } catch (error: any) {
      failed++
      console.warn(`[CACHE] WARNING: Skipping message docs JSON schema for connector ${connector}:`, error.message || error)
    }
  })
  await putDocumentationCache(
    cacheStorageOfMessageDocsJsonSchema,
    messageDocsJsonSchema,
    failed === 0,
    'message docs JSON schemas'
  )
  return messageDocsJsonSchema
}

async function getCacheDocJsonSchema(cacheStorageOfMessageDocsJsonSchema: any): Promise<any> {
  return await cacheDocJsonSchema(cacheStorageOfMessageDocsJsonSchema)
}

export async function cache(cacheStorage: any, cachedResponse: any, worker: any): Promise<any> {
  try {
    const messageDocs = await cachedResponse.json()
    // Legacy cache entries have no timestamp and refresh once after this successful read.
    scheduleDocumentationRefreshIfDue(cachedResponse, worker, 'update-message-docs')
    return messageDocs
  } catch (error) {
    console.warn('No message docs cache or malformed cache.')
    console.log('Caching message docs...')
    const isServerActive = await isServerUp()
    if (!isServerActive) throw new Error('API Server is not responding.')
    return await getCacheDoc(cacheStorage)
  }
}

export async function cacheJsonSchema(
  cacheStorage: any,
  cachedResponse: any,
  worker: any
): Promise<any> {
  try {
    const messageDocsJsonSchema = await cachedResponse.json()
    // Legacy cache entries have no timestamp and refresh once after this successful read.
    scheduleDocumentationRefreshIfDue(cachedResponse, worker, 'update-message-docs-json-schema')
    return messageDocsJsonSchema
  } catch (error) {
    console.warn('No message docs JSON schema cache or malformed cache.')
    console.log('Caching message docs JSON schema...')
    const isServerActive = await isServerUp()
    if (!isServerActive) throw new Error('API Server is not responding.')
    return await getCacheDocJsonSchema(cacheStorage)
  }
}
