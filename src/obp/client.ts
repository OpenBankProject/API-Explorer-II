import { Version, API, get } from 'obp-typescript/src/api/client'
import type { APIClientConfig, DirectLoginAuthentication } from 'obp-typescript/src/api/client'
import { Any, GetAny } from 'obp-typescript/src/api/any'

const directLogin: DirectLoginAuthentication = {
  username: process.env.OBP_USERNAME,
  password: process.env.OBP_PASSWORD,
  consumerKey: process.env.OBP_CONSUMER_KEY
}

const clientConfig: APIClientConfig = {
  baseUri: 'https://obp-apisandbox.joinfincubator.com',
  version: Version.v510,
  authentication: directLogin
}

// Get Resource Docs
export async function getResourceDocs(): Promise<any> {
  return await get<API.Any>(clientConfig, Any)(GetAny)('/resource-docs/v5.1.0/obp?tags=Account')
}
