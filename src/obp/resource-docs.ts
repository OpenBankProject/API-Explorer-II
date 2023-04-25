import { Any, GetAny } from 'obp-typescript/src/api/any'
import { Version, API, get } from 'obp-typescript/src/api/client'
import type { APIClientConfig } from 'obp-typescript/src/api/client'

const clientConfig: APIClientConfig = {
  baseUri: 'https://apisandbox.openbankproject.com',
  version: Version.v510
}

// Get Resource Docs
export async function getOBPResourceDocs(): Promise<any> {
  return await get<API.Any>(clientConfig, Any)(GetAny)(`/resource-docs/${Version.v510}/obp`)
}

export async function getGroupedResourceDocs(docs: any): Promise<any> {
  return docs.resource_docs.reduce((values: any, doc: any) => {
    doc.tags.forEach((tag: any) => {
      ;(values[tag] = values[tag] || []).push(doc)
    })
    return values
  }, {})
}

export function getOperationDetails(docs: any, operation_id: string): any {
  return docs.resource_docs.filter((doc: any) => doc.operation_id === operation_id)[0]
}
