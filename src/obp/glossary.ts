import { Any, GetAny, Version, API, get } from 'obp-typescript'
import type { APIClientConfig } from 'obp-typescript'

const clientConfig: APIClientConfig = {
  baseUri: import.meta.env.VITE_OBP_API_HOST,
  version: Version.v510,
  withFixedVersion: true
}

// Get Glossary
export async function getOBPGlossary(): Promise<any> {
  return await get<API.Any>(clientConfig, Any)(GetAny)('/api/glossary')
}
