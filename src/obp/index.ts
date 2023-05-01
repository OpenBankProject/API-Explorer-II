import { Version, API, get as getOBP } from 'obp-typescript/src/api/client'
import type { APIClientConfig } from 'obp-typescript/src/api/client'
import type { OAuthConfig } from 'obp-typescript/src/auth'
import { GetAny, Any } from 'obp-typescript/src/api/any'

const oauthConfig: OAuthConfig = {
  consumerKey: import.meta.env.VITE_OBP_CONSUMER_KEY,
  consumerSecret: import.meta.env.VITE_OBP_CONSUMER_SECRET,
  redirectUrl: import.meta.env.VITE_OBP_REDIRECT_URL
}

const clientConfig: APIClientConfig = {
  baseUri: import.meta.env.VITE_OBP_API_HOST,
  version: Version.v510,
  oauthConfig: oauthConfig
}

export function setAccessToken(key: string, secret: string): void {
  if (!oauthConfig.accessToken) oauthConfig['accessToken'] = { key, secret }
}

export async function get(path: string): Promise<any> {
  try {
    return await getOBP<API.Any>(clientConfig, Any)(GetAny)(path)
  } catch (error) {
    console.log(error)
    return error
  }
}
