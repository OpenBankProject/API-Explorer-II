import { version, get, isServerUp } from '../obp'

export const connectors = [
  'kafka_vSept2018',
  'akka_vDec2018',
  'rest_vMar2019',
  'stored_procedure_vDec2019'
]

// Get Message Docs
export async function getOBPMessageDocs(item: string): Promise<any> {
  return await get(`obp/${version}/message-docs/${item}`)
}

export function getGroupedMessageDocs(docs: any): Promise<any> {
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
    group[connector] = getGroupedMessageDocs(docs)
    return group
  }, Promise.resolve({}))
  await messageDocsCache.put('/', new Response(JSON.stringify(messageDocs)))
  return messageDocs
}

async function getCacheDoc(messageDocsCache: any): Promise<any> {
  return await cacheDoc(messageDocsCache)
}

export async function cache(
  messageDocsCache: any,
  messageDocsCacheResponse: any,
  worker: any
): Promise<any> {
  try {
    worker.postMessage('update-message-docs')
    return await messageDocsCacheResponse.json()
  } catch (error) {
    console.warn('No message docs cache or malformed cache.')
    console.log('Caching message docs...')
    const isServerActive = await isServerUp()
    if (!isServerActive) throw new Error('API Server is not responding.')
    return await getCacheDoc(messageDocsCache)
  }
}
