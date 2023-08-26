import { version, get } from '../obp'

// Get API Versions
export async function getOBPAPIVersions(): Promise<any> {
  return await get(`obp/${version}/api/versions`)
}
