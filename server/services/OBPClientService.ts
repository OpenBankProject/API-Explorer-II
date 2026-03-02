/*
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

import { Service, Container } from 'typedi'
import { DEFAULT_OBP_API_VERSION } from '../../src/shared-constants.js'
import { BerlinGroupSignatureService } from './BerlinGroupSignatureService.js'
import type { BerlinGroupSessionData } from '../types/berlin-group.js'

// Custom error class to preserve HTTP status codes
class OBPAPIError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'OBPAPIError'
  }
}

// OAuth2 Bearer token configuration
interface OAuth2Config {
  accessToken: string
  tokenType: string
}

// API Client configuration for OAuth2
interface APIClientConfig {
  baseUri: string
  version: string
  oauth2?: OAuth2Config
  berlinGroup?: BerlinGroupSessionData
}

@Service()
/**
 * OBPClientService provides methods for interacting with the Open Bank Project API.
 *
 * This service handles API communication with OBP using OAuth2 Bearer token authentication,
 * making HTTP requests (GET, POST, PUT, DELETE).
 *
 * @class OBPClientService
 *
 * @property {APIClientConfig} clientConfig - API client configuration
 *
 * @example
 * const obpService = new OBPClientService();
 * const response = await obpService.get('/obp/v5.1.0/banks', sessionConfig);
 */
export default class OBPClientService {
  private clientConfig: APIClientConfig

  constructor() {
    if (!process.env.VITE_OBP_API_HOST) throw new Error('VITE_OBP_API_HOST is not set')

    // Always use v5.1.0 for application infrastructure - stable and debuggable
    this.clientConfig = {
      baseUri: process.env.VITE_OBP_API_HOST!,
      version: DEFAULT_OBP_API_VERSION
    }
  }
  async get(path: string, clientConfig: any): Promise<any> {
    const config = this.getSessionConfig(clientConfig)

    // Check if this is a Berlin Group path and signing is enabled
    const bgService = Container.get(BerlinGroupSignatureService)
    if (BerlinGroupSignatureService.isBerlinGroupPath(path) && bgService.isEnabled()) {
      return await this.requestWithBerlinGroupHeaders(
        path, 'GET', '', config, config?.berlinGroup?.consentId
      )
    }

    // If no config or no access token, make unauthenticated request
    if (!config || !config.oauth2?.accessToken) {
      return await this.getWithoutAuth(path)
    }

    return await this.getWithBearer(path, config.oauth2.accessToken)
  }

  async create(path: string, body: any, clientConfig: any): Promise<any> {
    const config = this.getSessionConfig(clientConfig)

    // Check if this is a Berlin Group path and signing is enabled
    const bgService = Container.get(BerlinGroupSignatureService)
    if (BerlinGroupSignatureService.isBerlinGroupPath(path) && bgService.isEnabled()) {
      return await this.requestWithBerlinGroupHeaders(
        path, 'POST', JSON.stringify(body), config, config?.berlinGroup?.consentId
      )
    }

    if (!config || !config.oauth2?.accessToken) {
      throw new Error('Authentication required for creating resources.')
    }

    return await this.createWithBearer(path, body, config.oauth2.accessToken)
  }

  async update(path: string, body: any, clientConfig: any): Promise<any> {
    const config = this.getSessionConfig(clientConfig)

    // Check if this is a Berlin Group path and signing is enabled
    const bgService = Container.get(BerlinGroupSignatureService)
    if (BerlinGroupSignatureService.isBerlinGroupPath(path) && bgService.isEnabled()) {
      return await this.requestWithBerlinGroupHeaders(
        path, 'PUT', JSON.stringify(body), config, config?.berlinGroup?.consentId
      )
    }

    if (!config || !config.oauth2?.accessToken) {
      throw new Error('Authentication required for updating resources.')
    }

    return await this.updateWithBearer(path, body, config.oauth2.accessToken)
  }

  async discard(path: string, clientConfig: any): Promise<any> {
    const config = this.getSessionConfig(clientConfig)

    // Check if this is a Berlin Group path and signing is enabled
    const bgService = Container.get(BerlinGroupSignatureService)
    if (BerlinGroupSignatureService.isBerlinGroupPath(path) && bgService.isEnabled()) {
      return await this.requestWithBerlinGroupHeaders(
        path, 'DELETE', '', config, config?.berlinGroup?.consentId
      )
    }

    if (!config || !config.oauth2?.accessToken) {
      throw new Error('Authentication required for deleting resources.')
    }

    return await this.discardWithBearer(path, config.oauth2.accessToken)
  }
  /**
   * Make a request to a Berlin Group API path with TPP signature headers.
   * OAuth2 Bearer token is included when available alongside signature headers.
   */
  private async requestWithBerlinGroupHeaders(
    path: string,
    method: string,
    body: string,
    clientConfig: APIClientConfig | null,
    consentId?: string
  ): Promise<any> {
    const bgService = Container.get(BerlinGroupSignatureService)
    const bgHeaders = bgService.generateHeaders(method, body, consentId)

    // Merge with OAuth2 Bearer token if available
    const headers: Record<string, string> = { ...bgHeaders }
    if (clientConfig?.oauth2?.accessToken) {
      headers['Authorization'] = `Bearer ${clientConfig.oauth2.accessToken}`
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const url = `${this.clientConfig.baseUri}${normalizedPath}`
    console.log(`OBPClientService: ${method} Berlin Group request to: ${url}`)

    const fetchOptions: RequestInit = { method, headers }
    if (method === 'POST' || method === 'PUT') {
      fetchOptions.body = body
    }

    const response = await fetch(url, fetchOptions)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[OBPClientService] Berlin Group ${method} request failed:`, response.status, errorText)
      throw new OBPAPIError(response.status, errorText)
    }

    return await response.json()
  }

  private getSessionConfig(clientConfig: APIClientConfig): APIClientConfig {
    return clientConfig || this.clientConfig
  }

  getOBPVersion(): string {
    return this.clientConfig.version
  }

  getOBPClientConfig(): APIClientConfig {
    return this.clientConfig
  }

  /**
   * Make a GET request without authentication (for public endpoints)
   *
   * @param path - The API endpoint path (e.g., /obp/v5.1.0/api/versions)
   * @returns Response data from the API
   */
  private async getWithoutAuth(path: string): Promise<any> {
    // Ensure proper slash handling between base URI and path
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const url = `${this.clientConfig.baseUri}${normalizedPath}`
    console.log('OBPClientService: GET request without authentication to:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      // 401 errors are expected when user is not authenticated
      if (response.status === 401) {
        console.log(`[OBPClientService] 401 Unauthorized: ${url} (authentication required)`)
      } else {
        console.error('[OBPClientService] GET request failed:', response.status, errorText)
      }
      throw new OBPAPIError(response.status, errorText)
    }

    const responseData = await response.json()
    // Log count instead of full data to reduce log noise
    if (
      responseData &&
      responseData.scanned_api_versions &&
      Array.isArray(responseData.scanned_api_versions)
    ) {
      console.log(
        `OBPClientService: Response data: ${responseData.scanned_api_versions.length} scanned_api_versions`
      )
    } else {
      console.log('OBPClientService: Response data received:', typeof responseData)
    }
    return responseData
  }

  /**
   * Make a GET request with OAuth2 Bearer token authentication
   *
   * @param path - The API endpoint path (e.g., /obp/v5.1.0/banks)
   * @param accessToken - OAuth2 access token
   * @returns Response data from the API
   */
  private async getWithBearer(path: string, accessToken: string): Promise<any> {
    // Ensure proper slash handling between base URI and path
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const url = `${this.clientConfig.baseUri}${normalizedPath}`
    console.log('OBPClientService: GET request with Bearer token to:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      // 401 errors indicate token expiration or invalid token
      if (response.status === 401) {
        console.warn(
          `[OBPClientService] 401 Unauthorized with Bearer token: ${url} (token may be expired)`
        )
      } else {
        console.error(
          '[OBPClientService] GET request with Bearer failed:',
          response.status,
          errorText
        )
      }
      throw new OBPAPIError(response.status, errorText)
    }

    return await response.json()
  }

  /**
   * Make a POST request with OAuth2 Bearer token authentication
   *
   * @param path - The API endpoint path
   * @param body - Request body data
   * @param accessToken - OAuth2 access token
   * @returns Response data from the API
   */
  private async createWithBearer(path: string, body: any, accessToken: string): Promise<any> {
    // Ensure proper slash handling between base URI and path
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const url = `${this.clientConfig.baseUri}${normalizedPath}`
    console.log('OBPClientService: POST request with Bearer token to:', url)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      if (response.status === 401) {
        console.warn(`[OBPClientService] 401 Unauthorized on POST: ${url} (token may be expired)`)
      } else {
        console.error('[OBPClientService] POST request failed:', response.status, errorText)
      }
      throw new OBPAPIError(response.status, errorText)
    }

    return await response.json()
  }

  /**
   * Make a PUT request with OAuth2 Bearer token authentication
   *
   * @param path - The API endpoint path
   * @param body - Request body data
   * @param accessToken - OAuth2 access token
   * @returns Response data from the API
   */
  private async updateWithBearer(path: string, body: any, accessToken: string): Promise<any> {
    // Ensure proper slash handling between base URI and path
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const url = `${this.clientConfig.baseUri}${normalizedPath}`
    console.log('OBPClientService: PUT request with Bearer token to:', url)

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      if (response.status === 401) {
        console.warn(`[OBPClientService] 401 Unauthorized on PUT: ${url} (token may be expired)`)
      } else {
        console.error('[OBPClientService] PUT request failed:', response.status, errorText)
      }
      throw new OBPAPIError(response.status, errorText)
    }

    return await response.json()
  }

  /**
   * Make a DELETE request with OAuth2 Bearer token authentication
   *
   * @param path - The API endpoint path
   * @param accessToken - OAuth2 access token
   * @returns Response data from the API
   */
  private async discardWithBearer(path: string, accessToken: string): Promise<any> {
    // Ensure proper slash handling between base URI and path
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const url = `${this.clientConfig.baseUri}${normalizedPath}`
    console.log('OBPClientService: DELETE request with Bearer token to:', url)

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      if (response.status === 401) {
        console.warn(`[OBPClientService] 401 Unauthorized on DELETE: ${url} (token may be expired)`)
      } else {
        console.error('[OBPClientService] DELETE request failed:', response.status, errorText)
      }
      throw new OBPAPIError(response.status, errorText)
    }

    return await response.json()
  }
}
