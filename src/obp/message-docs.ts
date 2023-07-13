import { Any, GetAny, Version, API, get } from 'obp-typescript'
import type { APIClientConfig } from 'obp-typescript'
import { version } from '../obp'

const clientConfig: APIClientConfig = {
  baseUri: import.meta.env.VITE_OBP_API_HOST,
  version: version as Version,
  withFixedVersion: true
}

export const connectors = [
  'kafka_vSept2018',
  'akka_vDec2018',
  'rest_vMar2019',
  'stored_procedure_vDec2019'
]

// Get Message Docs
export async function getOBPMessageDocs(item: string): Promise<any> {
  return await get<API.Any>(clientConfig, Any)(GetAny)(`/message-docs/${item}`)
}

export async function getGroupedMessageDocs(docs: any): Promise<any> {
  return docs.message_docs.reduce((values: any, doc: any) => {
    const tag = doc.adapter_implementation.group.replace('-', '').trim()
    ;(values[tag] = values[tag] || []).push(doc)
    return values
  }, {})
}

export async function cacheDoc(messageDocsCache: any): Promise<any> {
  const messageDocs = await connectors.reduce(async (agroup: any, connector: any) => {
    const group = await agroup
    const docs = await getOBPMessageDocs(connector)
    group[connector] = await getGroupedMessageDocs(docs)
    return group
  }, Promise.resolve({}))
  await messageDocsCache.put('/message-docs', new Response(JSON.stringify(messageDocs)))
  return messageDocs
}

export async function cache(
  messageDocsCache: any,
  messageDocsCacheResponse: any,
  worker: any
): Promise<any> {
  let messageDocs
  if (messageDocsCacheResponse) {
    try {
      messageDocs = await messageDocsCacheResponse.json()
      if (!messageDocs) {
        messageDocs = await cacheDoc(messageDocsCache)
      }
    } catch (err) {
      console.warn(err)
      //If cache docs is malformed update with the latest resource docs.
      messageDocs = await cacheDoc(messageDocsCache)
    }
    worker.postMessage('update-message-docs')
  } else {
    messageDocs = await cacheDoc(messageDocsCache)
  }
  return messageDocs
}
