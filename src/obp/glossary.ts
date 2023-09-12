import { version, get } from '../obp'

// Get Glossary
export async function getOBPGlossary(): Promise<any> {
  return await get(`obp/${version}/api/glossary`)
}
