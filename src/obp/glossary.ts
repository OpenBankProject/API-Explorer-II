import { version, get } from '../obp'
import { updateLoadingInfoMessage } from './common-functions'

// Get Glossary
export async function getOBPGlossary(): Promise<any> {
  const logMessage = `Loading glossary { version: ${version} }`
  console.log(logMessage)
  updateLoadingInfoMessage(logMessage)
  return await get(`obp/${version}/api/glossary`)
}
