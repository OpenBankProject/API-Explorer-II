import { get, version as configVersion } from '../obp'
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
    for (const { urlPrefix, API_VERSION } of scannedAPIVersions) {
      if (urlPrefix) {
        const version = `${urlPrefix.toUpperCase()}${API_VERSION}`
        const resourceDocs = await getOBPResourceDocs(version)
        if (version && Object.keys(resourceDocs).includes('resource_docs'))
          resourceDocsMapping[version] = resourceDocs
      }
    }
    await resourceDocsCache.put('/operationid', new Response(JSON.stringify(resourceDocsMapping)))
  } else {
    const resourceDocs = { ['OBP' + configVersion]: await getOBPResourceDocs(configVersion) }
    await resourceDocsCache.put('/operationid', new Response(JSON.stringify(resourceDocs)))
  }
}

export async function cache(
  resourceDocsCache: any,
  resourceDocsCacheResponse: any,
  worker: any
): Promise<any> {
  let resourceDocs
  if (resourceDocsCacheResponse) {
    try {
      resourceDocs = await resourceDocsCacheResponse.json()
      if (!resourceDocs) {
        resourceDocs = await cacheDoc(resourceDocsCache)
      }
    } catch (err) {
      console.warn(err)
      //If cache docs is malformed update with the latest resource docs.
      resourceDocs = await cacheDoc(resourceDocsCache)
    }
    worker.postMessage('update-resource-docs')
  } else {
    resourceDocs = await cacheDoc(resourceDocsCache)
  }
  return resourceDocs
}
