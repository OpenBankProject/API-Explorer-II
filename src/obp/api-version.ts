import { OBP_API_VERSION, get } from '../obp'

// Get API Versions
export async function getOBPAPIVersions(): Promise<any> {
  return await get(`obp/${OBP_API_VERSION}/api/versions`)
}
