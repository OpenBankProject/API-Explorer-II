import { Version, API, get as getOBP } from 'obp-typescript/src/api/client'
import type { APIClientConfig } from 'obp-typescript/src/api/client'
import type { OAuthConfig } from 'obp-typescript/src/oauth'
import { GetAny, Any } from 'obp-typescript/src/api/any'

const oauthConfig: OAuthConfig = {
  consumerKey: import.meta.env.VITE_CONSUMER_KEY,
  consumerSecret: import.meta.env.VITE_CONSUMER_SECRET,
  redirectUrl: import.meta.env.VITE_REDIRECT_URL
}

const clientConfig: APIClientConfig = {
  baseUri: import.meta.env.VITE_API_HOST,
  version: Version.v510,
  oauthConfig: oauthConfig
}

export async function get(path: string): Promise<any> {
  return await getOBP<API.Any>(clientConfig, Any)(GetAny)(path)
}

export function setAccessToken(key: string, secret: string) {
  if (!oauthConfig.accessToken) oauthConfig['accessToken'] = { key, secret }
}
