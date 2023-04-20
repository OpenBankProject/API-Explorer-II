import docs from './resource-docs.json'
import { Any, GetAny } from 'obp-typescript/src/api/any'
import { Version, API, get as getOBP } from 'obp-typescript/src/api/client'
import type { APIClientConfig, DirectLoginAuthentication } from 'obp-typescript/src/api/client'

const clientConfig: APIClientConfig = {
  baseUri: 'https://apisandbox.openbankproject.com',
  version: Version.v510
  //oauthConfig: oauthConfig
}

// Get Resource Docs
export async function getOBPResourceDocs(): Promise<any> {
  //return await get<API.Any>(clientConfig, Any)(GetAny)(`/resource-docs/${VERSION}/obp`)
  return docs
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
