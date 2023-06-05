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
  async get(path: string, clientConfig: any): Promise<any> {
    const config = this.getSessionConfig(clientConfig)
    return await get<API.Any>(config, Any)(GetAny)(path)
  }
  async create(path: string, body: any, clientConfig: any): Promise<any> {
    const config = this.getSessionConfig(clientConfig)
    return await create<API.Any>(config, Any)(CreateAny)(path)(body)
  }
  async update(path: string, body: any, clientConfig: any): Promise<any> {
    const config = this.getSessionConfig(clientConfig)
    return await update<API.Any>(config, Any)(UpdateAny)(path)(body)
  }
  async discard(path: string, clientConfig: any): Promise<any> {
    const config = this.getSessionConfig(clientConfig)
    return await discard<API.Any>(config, Any)(DiscardAny)(path)
  }
  private getSessionConfig(clientConfig: any): any {
    return clientConfig || this.clientConfig
  }

  getOBPVersion(): string {
    return this.clientConfig.version
  }

  getOBPClientConfig(): any {
    return this.clientConfig
  }
}
