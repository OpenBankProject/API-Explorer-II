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

import { get, isServerUp, OBP_API_DEFAULT_RESOURCE_DOC_VERSION } from '../obp'
import { getOBPAPIVersions } from '../obp/api-version'
import { updateLoadingInfoMessage } from './common-functions'
import { RESOURCE_DOCS_API_VERSION } from '../shared-constants'

// Get Resource Docs
export async function getOBPResourceDocs(apiStandardAndVersion: string): Promise<any> {
  const logMessage = `Loading API ${apiStandardAndVersion}`
  console.log(logMessage)
  updateLoadingInfoMessage(logMessage)
  const path = `/obp/${RESOURCE_DOCS_API_VERSION}/resource-docs/${apiStandardAndVersion}/obp`
  try {
    return await get(path)
  } catch (error: any) {
    console.error(`Failed to load resource docs for ${apiStandardAndVersion}`)
    console.error(`  URL: ${path}`)
    console.error(`  Status: ${error.status || 'unknown'}`)
    console.error(`  Error: ${error.message || JSON.stringify(error)}`)
    throw error
  }
}

export async function getOBPDynamicResourceDocs(apiStandardAndVersion: string): Promise<any> {
  const logMessage = `Loading Dynamic Docs for ${apiStandardAndVersion}`
  console.log(logMessage)
  updateLoadingInfoMessage(logMessage)
  const path = `/obp/${RESOURCE_DOCS_API_VERSION}/resource-docs/${apiStandardAndVersion}/obp?content=dynamic`
  try {
    return await get(path)
  } catch (error: any) {
    console.error(`Failed to load dynamic resource docs for ${apiStandardAndVersion}`)
    console.error(`  URL: ${path}`)
    console.error(`  Status: ${error.status || 'unknown'}`)
    console.error(`  Error: ${error.message || JSON.stringify(error)}`)
    throw error
  }
}

export function getFilteredGroupedResourceDocs(
  apiStandardAndVersion: string,
  tags: any,
  docs: any
): Promise<any> {
  console.log(docs)
  if (
    apiStandardAndVersion === undefined ||
    docs === undefined ||
    docs[apiStandardAndVersion] === undefined
  )
    return Promise.resolve<any>({})
  let list = tags.split(',')
  return docs[apiStandardAndVersion].resource_docs
    .filter((subArray: any) => subArray.tags.some((value: string) => list.includes(value))) // Filter by tags
    .reduce((values: any, doc: any) => {
      const tag = doc.tags[0] // Group by the first tag at resorce doc
      ;(values[tag] = values[tag] || []).push(doc)
      return values
    }, {})
}

export function getGroupedResourceDocs(apiStandardAndVersion: string, docs: any): Promise<any> {
  if (apiStandardAndVersion === undefined || docs === undefined) return Promise.resolve<any>({})

  // Check if the specific version exists in docs
  if (!docs[apiStandardAndVersion] || !docs[apiStandardAndVersion].resource_docs) {
    console.warn(`No resource_docs found for ${apiStandardAndVersion}`)
    return Promise.resolve<any>({})
  }

  return docs[apiStandardAndVersion].resource_docs.reduce((values: any, doc: any) => {
    const tag = doc.tags[0] // Group by the first tag at resorce doc
    ;(values[tag] = values[tag] || []).push(doc)
    return values
  }, {})
}

export function getOperationDetails(version: string, operation_id: string, docs: any): any {
  if (!docs || !docs[version] || !docs[version].resource_docs) {
    console.warn(`No resource_docs found for version ${version}`)
    return undefined
  }
  return docs[version].resource_docs.filter((doc: any) => doc.operation_id === operation_id)[0]
}

export async function cacheDoc(cacheStorageOfResourceDocs: any): Promise<any> {
  try {
    const apiVersions = await getOBPAPIVersions()
    if (
      !apiVersions ||
      !apiVersions.scanned_api_versions ||
      !Array.isArray(apiVersions.scanned_api_versions)
    ) {
      console.warn('API versions response is invalid or user not authenticated, skipping cache')
      return {}
    }
    const scannedAPIVersions = apiVersions.scanned_api_versions
    // Filter to only include active versions
    const activeVersions = scannedAPIVersions.filter((version: any) => version.is_active === true)
    console.log(
      `[CACHE] Found ${scannedAPIVersions.length} total versions, ${activeVersions.length} are active`
    )
    const resourceDocsMapping: any = {}
    for (const { api_standard, api_short_version } of activeVersions) {
      // we need this to cache the dynamic entities resource doc
      if (api_short_version === 'dynamic-entity') {
        const logMessage = `Caching Dynamic API { standard: ${api_standard}, version: ${api_short_version} }`
        console.log(logMessage)
        if (api_standard) {
          try {
            const version = `${api_standard.toUpperCase()}${api_short_version}`
            console.log(`[CACHE] Attempting to load dynamic resource docs for: ${version}`)
            const resourceDocs = await getOBPDynamicResourceDocs(version)
            if (version && Object.keys(resourceDocs).includes('resource_docs')) {
              resourceDocsMapping[version] = resourceDocs
              console.log(`[CACHE] Successfully cached dynamic docs for: ${version}`)
            } else {
              console.warn(`[CACHE] WARNING: Response for ${version} missing 'resource_docs' field`)
            }
          } catch (error: any) {
            console.warn(
              `[CACHE] WARNING: Skipping dynamic endpoint ${api_standard}${api_short_version}:`
            )
            console.warn(`   API Version: ${api_short_version}`)
            console.warn(`   API Standard: ${api_standard}`)
            console.warn(
              `   Constructed version string: ${api_standard.toUpperCase()}${api_short_version}`
            )
            console.warn(`   Error status: ${error.status || 'unknown'}`)
            console.warn(`   Error message: ${error.message || 'No message'}`)
            if (error.status === 500) {
              console.warn(
                `   NOTE: This likely means the OBP-API server doesn't have this feature enabled`
              )
            }
          }
        }
        updateLoadingInfoMessage(logMessage)
        continue
      }
      const logMessage = `Caching API { standard: ${api_standard}, version: ${api_short_version} }`
      console.log(logMessage)
      if (api_standard) {
        try {
          const version = `${api_standard.toUpperCase()}${api_short_version}`
          console.log(`[CACHE] Attempting to load resource docs for: ${version}`)
          const resourceDocs = await getOBPResourceDocs(version)
          if (version && Object.keys(resourceDocs).includes('resource_docs')) {
            resourceDocsMapping[version] = resourceDocs
            console.log(`[CACHE] Successfully cached docs for: ${version}`)
          } else {
            console.warn(`[CACHE] WARNING: Response for ${version} missing 'resource_docs' field`)
          }
        } catch (error: any) {
          console.warn(`[CACHE] WARNING: Skipping API version ${api_standard}${api_short_version}:`)
          console.warn(`   API Version: ${api_short_version}`)
          console.warn(`   API Standard: ${api_standard}`)
          console.warn(
            `   Constructed version string: ${api_standard.toUpperCase()}${api_short_version}`
          )
          console.warn(`   Error status: ${error.status || 'unknown'}`)
          console.warn(`   Error message: ${error.message || 'No message'}`)
          if (error.status === 400) {
            console.warn(`   NOTE: This API version is not enabled on the OBP-API server`)
            console.warn(`   NOTE: Check your OBP-API server configuration for available versions`)
          } else if (error.status === 500) {
            console.warn(`   NOTE: This API version may not be available on the OBP-API server`)
          } else if (error.status === 404) {
            console.warn(`   NOTE: This endpoint was not found on the OBP-API server`)
          }
        }
      }
      updateLoadingInfoMessage(logMessage)
    }
    await cacheStorageOfResourceDocs.put('/', new Response(JSON.stringify(resourceDocsMapping)))
    return resourceDocsMapping
  } catch (error) {
    console.error('Failed to cache resource docs:', error)
    console.warn('Returning empty cache - user may need to login')
    return {}
  }
}

async function getCacheDoc(cacheStorageOfResourceDocs: any): Promise<any> {
  return await cacheDoc(cacheStorageOfResourceDocs)
}

export async function cache(cachedStorage: any, cachedResponse: any, worker: any): Promise<any> {
  try {
    worker.postMessage('update-resource-docs')
    const resourceDocs = await cachedResponse.json()
    console.log(
      '[CACHE] Loaded cached resource docs, available versions:',
      Object.keys(resourceDocs)
    )

    // Check if the default version exists
    if (!resourceDocs[OBP_API_DEFAULT_RESOURCE_DOC_VERSION]) {
      console.warn(
        `[CACHE] Default version ${OBP_API_DEFAULT_RESOURCE_DOC_VERSION} not found in cache`
      )
      console.warn('[CACHE] Available versions:', Object.keys(resourceDocs))
      // Try to use the first available version
      const availableVersions = Object.keys(resourceDocs)
      if (availableVersions.length > 0) {
        console.log(`[CACHE] Using first available version: ${availableVersions[0]}`)
      }
    }

    const groupedResourceDocs = getGroupedResourceDocs(
      OBP_API_DEFAULT_RESOURCE_DOC_VERSION,
      resourceDocs
    )
    return { resourceDocs, groupedDocs: groupedResourceDocs }
  } catch (error) {
    console.warn('No resource docs cache or malformed cache.')
    console.log('Caching resource docs...')
    const isServerActive = await isServerUp()
    if (!isServerActive) throw new Error('API Server is not responding.')
    const resourceDocs = await getCacheDoc(cachedStorage)
    console.log(
      '[CACHE] Newly cached resource docs, available versions:',
      Object.keys(resourceDocs)
    )

    // Check if we got any docs back
    if (!resourceDocs || Object.keys(resourceDocs).length === 0) {
      console.error('[CACHE] No resource docs were cached - API may have returned empty data')
      throw new Error(
        'No resource documentation available. API may be misconfigured or authentication required.'
      )
    }

    // Check if the default version exists
    if (!resourceDocs[OBP_API_DEFAULT_RESOURCE_DOC_VERSION]) {
      console.warn(
        `[CACHE] Default version ${OBP_API_DEFAULT_RESOURCE_DOC_VERSION} not found after caching`
      )
      console.warn('[CACHE] Available versions:', Object.keys(resourceDocs))
    }

    const groupedDocs = getGroupedResourceDocs(OBP_API_DEFAULT_RESOURCE_DOC_VERSION, resourceDocs)
    return { resourceDocs, groupedDocs }
  }
}
