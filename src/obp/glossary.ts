import { OBP_API_VERSION, get } from '../obp'
import { updateLoadingInfoMessage } from './common-functions'

// Get Glossary
export async function getOBPGlossary(): Promise<any> {
  const logMessage = `Loading glossary { version: ${OBP_API_VERSION} }`
  console.log(logMessage)
  updateLoadingInfoMessage(logMessage)
  return await get(`obp/${OBP_API_VERSION}/api/glossary`)
}
