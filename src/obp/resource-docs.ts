import { Any, GetAny, Version, API, get } from 'obp-typescript'
import type { APIClientConfig } from 'obp-typescript'
import { version } from '../obp'

const clientConfig: APIClientConfig = {
  baseUri: import.meta.env.VITE_OBP_API_HOST,
  version: Version.v510,
  withFixedVersion: true
}

// Get Resource Docs
export async function getOBPResourceDocs(): Promise<any> {
  return await get<API.Any>(clientConfig, Any)(GetAny)(`/resource-docs/${version}/obp`)
}

export async function getGroupedResourceDocs(docs: any): Promise<any> {
  return docs.resource_docs.reduce((values: any, doc: any) => {
    const tag = doc.tags[0]
    ;(values[tag] = values[tag] || []).push(doc)
    return values
  }, {})
}

export function getOperationDetails(docs: any, operation_id: string): any {
  return docs.resource_docs.filter((doc: any) => doc.operation_id === operation_id)[0]
}
