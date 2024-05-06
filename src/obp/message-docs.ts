import { OBP_API_VERSION, get, isServerUp } from '../obp'
import { updateLoadingInfoMessage } from './common-functions'

export const connectors = [
  'kafka_vSept2018',
  'akka_vDec2018',
  'rest_vMar2019',
  'stored_procedure_vDec2019'
]

// Get Message Docs
export async function getOBPMessageDocs(item: string): Promise<any> {
  const logMessage = `Loading message docs { connector: ${item} }`
  console.log(logMessage)
  updateLoadingInfoMessage(logMessage)
  return await get(`obp/${OBP_API_VERSION}/message-docs/${item}`)
}

export function getGroupedMessageDocs(docs: any): Promise<any> {
  return docs.message_docs.reduce((values: any, doc: any) => {
    const tag = doc.adapter_implementation.group.replace('-', '').trim()
    ;(values[tag] = values[tag] || []).push(doc)
    return values
  }, {})
}

export async function cacheDoc(cacheStorageOfMessageDocs: any): Promise<any> {
  const messageDocs = await connectors.reduce(async (agroup: any, connector: any) => {
    const logMessage = `Caching message docs { connector: ${connector} }`
    console.log(logMessage)
    updateLoadingInfoMessage(logMessage)
    const group = await agroup
    const docs = await getOBPMessageDocs(connector)
    if (!Object.keys(docs).includes('code')) {
      group[connector] = getGroupedMessageDocs(docs)
    }
    return group
  }, Promise.resolve({}))
  await cacheStorageOfMessageDocs.put('/', new Response(JSON.stringify(messageDocs)))
  return messageDocs
}

async function getCacheDoc(cacheStorageOfMessageDocs: any): Promise<any> {
  return await cacheDoc(cacheStorageOfMessageDocs)
}

export async function cache(
  cacheStorage: any,
  cachedResponse: any,
  worker: any
): Promise<any> {
  try {
    worker.postMessage('update-message-docs')
    return await cachedResponse.json()
  } catch (error) {
    console.warn('No message docs cache or malformed cache.')
    console.log('Caching message docs...')
    const isServerActive = await isServerUp()
    if (!isServerActive) throw new Error('API Server is not responding.')
    return await getCacheDoc(cacheStorage)
  }
}
