/*
 * *
 * Open Bank Project -  API Explorer II
 * Copyright (C) 2023-2024, TESOBE GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * Email: contact@tesobe.com
 * TESOBE GmbH
 * Osloerstrasse 16/17
 * Berlin 13359, Germany
 *
 *   This product includes software developed at
 *   TESOBE (http://www.tesobe.com/)
 *
 */

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
