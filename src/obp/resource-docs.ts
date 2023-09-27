import { get, isServerUp, version as configVersion } from '../obp'
import { getOBPAPIVersions } from '../obp/api-version'

// Get Resource Docs
export async function getOBPResourceDocs(version: string): Promise<any> {
  return await get(`/obp/${configVersion}/resource-docs/${version}/obp`)
}

export function getGroupedResourceDocs(version: string, docs: any): Promise<any> {
  if (version === undefined || docs === undefined) return Promise.resolve<any>({})

  return docs[version].resource_docs.reduce((values: any, doc: any) => {
    const tag = doc.tags[0]
    ;(values[tag] = values[tag] || []).push(doc)
    return values
  }, {})
}

export function getOperationDetails(version: string, operation_id: string, docs: any): any {
  return docs[version].resource_docs.filter((doc: any) => doc.operation_id === operation_id)[0]
}

export async function cacheDoc(resourceDocsCache: any): Promise<any> {
  const apiVersions = await getOBPAPIVersions()
  if (apiVersions) {
    const scannedAPIVersions = apiVersions.scanned_api_versions
    const resourceDocsMapping: any = {}
    for (const { apiStandard, API_VERSION } of scannedAPIVersions) {
      if (apiStandard) {
        const version = `${apiStandard.toUpperCase()}${API_VERSION}`
        const resourceDocs = await getOBPResourceDocs(version)
        if (version && Object.keys(resourceDocs).includes('resource_docs'))
          resourceDocsMapping[version] = resourceDocs
      }
    }
    await resourceDocsCache.put('/', new Response(JSON.stringify(resourceDocsMapping)))
    return resourceDocsMapping
  } else {
    const resourceDocs = { ['OBP' + configVersion]: await getOBPResourceDocs(configVersion) }
    await resourceDocsCache.put('/', new Response(JSON.stringify(resourceDocs)))
    return resourceDocs
  }
}

async function getCacheDoc(resourceDocsCache: any, worker: any): Promise<any> {
  const docs = await cacheDoc(resourceDocsCache)
  worker.postMessage('update-resource-docs')
  return docs
}

export async function cache(
  resourceDocsCache: any,
  resourceDocsCacheResponse: any,
  worker: any
): Promise<any> {
  try {
    const resourceDocs = await resourceDocsCacheResponse.json()
    const groupedDocs = getGroupedResourceDocs('OBP' + configVersion, resourceDocs)
    return { resourceDocs, groupedDocs }
  } catch (error) {
    console.warn('No resource docs cache or malformed cache.')
    console.log('Caching resource docs...')
    const isServerActive = await isServerUp()
    if (!isServerActive) throw new Error('API Server is not responding.')
    const resourceDocs = await getCacheDoc(resourceDocsCache, worker)
    const groupedDocs = getGroupedResourceDocs('OBP' + configVersion, resourceDocs)
    return { resourceDocs, groupedDocs }
  }
}
