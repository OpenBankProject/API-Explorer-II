import { OBP_API_VERSION, get, isServerUp } from '../obp'
import { getOBPAPIVersions } from '../obp/api-version'
import { updateLoadingInfoMessage } from './common-functions'

// Get Resource Docs
export async function getOBPResourceDocs(apiStandardAndVersion: string): Promise<any> {
  const logMessage = `Loading API ${apiStandardAndVersion}`
  console.log(logMessage)
  updateLoadingInfoMessage(logMessage)
  return await get(`/obp/${OBP_API_VERSION}/resource-docs/${apiStandardAndVersion}/obp`)
}

export function getGroupedResourceDocs(apiStandardAndVersion: string, docs: any): Promise<any> {
  if (apiStandardAndVersion === undefined || docs === undefined) return Promise.resolve<any>({})

  return docs[apiStandardAndVersion].resource_docs.reduce((values: any, doc: any) => {
    const tag = doc.tags[0] // Group by the first tag at resorce doc
    ;(values[tag] = values[tag] || []).push(doc)
    return values
  }, {})
}

export function getOperationDetails(version: string, operation_id: string, docs: any): any {
  return docs[version].resource_docs.filter((doc: any) => doc.operation_id === operation_id)[0]
}

export async function cacheDoc(cacheStorageOfResourceDocs: any): Promise<any> {
  const apiVersions = await getOBPAPIVersions()
  if (apiVersions) {
    const scannedAPIVersions = apiVersions.scanned_api_versions
    const resourceDocsMapping: any = {}
    for (const { apiStandard, API_VERSION } of scannedAPIVersions) {
      const logMessage = `Caching API { standard: ${apiStandard}, version: ${API_VERSION} }`
      console.log(logMessage)
      if (apiStandard) {
        const version = `${apiStandard.toUpperCase()}${API_VERSION}`
        const resourceDocs = await getOBPResourceDocs(version)
        if (version && Object.keys(resourceDocs).includes('resource_docs'))
          resourceDocsMapping[version] = resourceDocs
      }
      updateLoadingInfoMessage(logMessage)
    }
    await cacheStorageOfResourceDocs.put('/', new Response(JSON.stringify(resourceDocsMapping)))
    return resourceDocsMapping
  } else {
    const resourceDocs = { ['OBP' + OBP_API_VERSION]: await getOBPResourceDocs(OBP_API_VERSION) }
    await cacheStorageOfResourceDocs.put('/', new Response(JSON.stringify(resourceDocs)))
    return resourceDocs
  }
}

async function getCacheDoc(cacheStorageOfResourceDocs: any): Promise<any> {
  return await cacheDoc(cacheStorageOfResourceDocs)
}

export async function cache(
  cachedStorage: any,
  cachedResponse: any,
  worker: any
): Promise<any> {
  try {
    worker.postMessage('update-resource-docs')
    const resourceDocs = await cachedResponse.json()
    const groupedResourceDocs = getGroupedResourceDocs('OBP' + OBP_API_VERSION, resourceDocs)
    return { resourceDocs, groupedDocs: groupedResourceDocs }
  } catch (error) {
    console.warn('No resource docs cache or malformed cache.')
    console.log('Caching resource docs...')
    const isServerActive = await isServerUp()
    if (!isServerActive) throw new Error('API Server is not responding.')
    const resourceDocs = await getCacheDoc(cachedStorage)
    const groupedDocs = getGroupedResourceDocs('OBP' + OBP_API_VERSION, resourceDocs)
    return { resourceDocs, groupedDocs }
  }
}
