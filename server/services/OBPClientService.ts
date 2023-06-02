import { Service } from 'typedi'
import {
  Version,
  API,
  get,
  create,
  update,
  discard,
  GetAny,
  CreateAny,
  UpdateAny,
  DiscardAny,
  Any
} from 'obp-typescript'
import type { APIClientConfig, OAuthConfig } from 'obp-typescript'

@Service()
export default class OBPClientService {
  private oauthConfig: OAuthConfig
  private clientConfig: APIClientConfig
  constructor() {
    this.oauthConfig = {
      consumerKey: process.env.VITE_OBP_CONSUMER_KEY,
      consumerSecret: process.env.VITE_OBP_CONSUMER_SECRET,
      redirectUrl: process.env.VITE_OBP_REDIRECT_URL
    }
    this.clientConfig = {
      baseUri: process.env.VITE_OBP_API_HOST,
      version: process.env.VITE_OBP_API_VERSION as Version,
      oauthConfig: this.oauthConfig
    }
  }
  setAccessToken(key: string, secret: string): void {
    this.oauthConfig['accessToken'] = { key, secret }
  }
  async get(path: string): Promise<any> {
    return await get<API.Any>(this.clientConfig, Any)(GetAny)(path)
  }
  async create(path: string, body: any): Promise<any> {
    return await create<API.Any>(this.clientConfig, Any)(CreateAny)(path)(body)
  }
  async update(path: string, body: any): Promise<any> {
    return await update<API.Any>(this.clientConfig, Any)(UpdateAny)(path)(body)
  }
  async discard(path: string): Promise<any> {
    return await discard<API.Any>(this.clientConfig, Any)(DiscardAny)(path)
  }

  getOBPVersion(): string {
    return this.clientConfig.version
  }
}
