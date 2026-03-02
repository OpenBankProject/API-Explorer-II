/*
 * Open Bank Project - API Explorer II
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

import { OAuth2Client, OAuth2Tokens } from 'arctic'
import type { OIDCConfiguration, TokenResponse } from '../types/oauth2.js'

/**
 * Extended OAuth2 Client with OIDC configuration support
 *
 * This class extends the arctic OAuth2Client to add:
 * - OIDC discovery document (.well-known/openid-configuration)
 * - Provider name tracking
 * - Provider-specific token exchange logic
 *
 * @example
 * const client = new OAuth2ClientWithConfig(
 *   'client-id',
 *   'client-secret',
 *   'http://localhost:5173/api/oauth2/callback',
 *   'obp-oidc'
 * )
 * await client.initOIDCConfig('http://localhost:9000/obp-oidc/.well-known/openid-configuration')
 */
export class OAuth2ClientWithConfig extends OAuth2Client {
  public OIDCConfig?: OIDCConfiguration
  public provider: string
  public wellKnownUri?: string
  private _clientSecret: string
  private _redirectUri: string

  constructor(clientId: string, clientSecret: string, redirectUri: string, provider: string) {
    super(clientId, clientSecret, redirectUri)
    this.provider = provider
    this._clientSecret = clientSecret
    this._redirectUri = redirectUri
  }

  /**
   * Initialize OIDC configuration from well-known discovery endpoint
   *
   * @param oidcConfigUrl - Full URL to .well-known/openid-configuration
   * @throws {Error} If the discovery document cannot be fetched or is invalid
   *
   * @example
   * await client.initOIDCConfig('http://localhost:9000/obp-oidc/.well-known/openid-configuration')
   */
  async initOIDCConfig(wellKnownUrl: string): Promise<void> {
    console.log(
      `OAuth2ClientWithConfig: Fetching OIDC config for ${this.provider} from: ${wellKnownUrl}`
    )

    // Store the well-known URL for health checks
    this.wellKnownUri = wellKnownUrl

    try {
      const response = await fetch(wellKnownUrl)

      console.log(
        `OAuth2ClientWithConfig: Response status: ${response.status} ${response.statusText}`
      )
      console.log(
        `OAuth2ClientWithConfig: Response headers:`,
        Object.fromEntries(response.headers.entries())
      )

      if (!response.ok) {
        const errorBody = await response.text()
        console.error(`OAuth2ClientWithConfig: Error response body:`, errorBody)
        throw new Error(
          `Failed to fetch OIDC configuration for ${this.provider}: ${response.status} ${response.statusText} - ${errorBody}`
        )
      }

      const responseText = await response.text()
      console.log(
        `OAuth2ClientWithConfig: Raw response body (first 500 chars):`,
        responseText.substring(0, 500)
      )

      let config: OIDCConfiguration
      try {
        config = JSON.parse(responseText) as OIDCConfiguration
        console.log(`OAuth2ClientWithConfig: Parsed config keys:`, Object.keys(config))
        console.log(`OAuth2ClientWithConfig: Full parsed config:`, JSON.stringify(config, null, 2))
      } catch (parseError) {
        console.error(`OAuth2ClientWithConfig: JSON parse error:`, parseError)
        console.error(`OAuth2ClientWithConfig: Failed to parse response as JSON`)
        throw new Error(`Invalid JSON response from ${this.provider}: ${parseError}`)
      }

      // Validate required endpoints with detailed logging
      console.log(`OAuth2ClientWithConfig: Validating required endpoints...`)
      console.log(`  - authorization_endpoint: ${config.authorization_endpoint || 'MISSING'}`)
      console.log(`  - token_endpoint: ${config.token_endpoint || 'MISSING'}`)
      console.log(`  - userinfo_endpoint: ${config.userinfo_endpoint || 'MISSING'}`)

      if (!config.authorization_endpoint) {
        console.error(`OAuth2ClientWithConfig: authorization_endpoint is missing or undefined`)
        console.error(`OAuth2ClientWithConfig: Config object type:`, typeof config)
        console.error(`OAuth2ClientWithConfig: Config object:`, config)
        throw new Error(`OIDC configuration for ${this.provider} missing authorization_endpoint`)
      }
      if (!config.token_endpoint) {
        console.error(`OAuth2ClientWithConfig: token_endpoint is missing or undefined`)
        throw new Error(`OIDC configuration for ${this.provider} missing token_endpoint`)
      }
      if (!config.userinfo_endpoint) {
        console.error(`OAuth2ClientWithConfig: userinfo_endpoint is missing or undefined`)
        throw new Error(`OIDC configuration for ${this.provider} missing userinfo_endpoint`)
      }

      this.OIDCConfig = config

      console.log(`OAuth2ClientWithConfig: OIDC config loaded for ${this.provider}`)
      console.log(`  Issuer: ${config.issuer}`)
      console.log(`  Authorization: ${config.authorization_endpoint}`)
      console.log(`  Token: ${config.token_endpoint}`)
      console.log(`  UserInfo: ${config.userinfo_endpoint}`)

      // Log supported PKCE methods if available
      if (config.code_challenge_methods_supported) {
        console.log(`  PKCE methods: ${config.code_challenge_methods_supported.join(', ')}`)
      }
    } catch (error) {
      console.error(`OAuth2ClientWithConfig: Failed to initialize ${this.provider}:`, error)
      console.error(
        `OAuth2ClientWithConfig: Error stack:`,
        error instanceof Error ? error.stack : 'N/A'
      )
      throw error
    }
  }

  /**
   * Get authorization endpoint from OIDC config
   *
   * @returns Authorization endpoint URL
   * @throws {Error} If OIDC configuration not initialized
   */
  getAuthorizationEndpoint(): string {
    if (!this.OIDCConfig?.authorization_endpoint) {
      throw new Error(`OIDC configuration not initialized for ${this.provider}`)
    }
    return this.OIDCConfig.authorization_endpoint
  }

  /**
   * Get token endpoint from OIDC config
   *
   * @returns Token endpoint URL
   * @throws {Error} If OIDC configuration not initialized
   */
  getTokenEndpoint(): string {
    if (!this.OIDCConfig?.token_endpoint) {
      throw new Error(`OIDC configuration not initialized for ${this.provider}`)
    }
    return this.OIDCConfig.token_endpoint
  }

  /**
   * Get userinfo endpoint from OIDC config
   *
   * @returns UserInfo endpoint URL
   * @throws {Error} If OIDC configuration not initialized
   */
  getUserInfoEndpoint(): string {
    if (!this.OIDCConfig?.userinfo_endpoint) {
      throw new Error(`OIDC configuration not initialized for ${this.provider}`)
    }
    return this.OIDCConfig.userinfo_endpoint
  }

  /**
   * Check if OIDC configuration is initialized
   *
   * @returns True if OIDC config has been loaded
   */
  isInitialized(): boolean {
    return this.OIDCConfig !== undefined
  }

  /**
   * Exchange authorization code for tokens
   *
   * This method provides a simpler interface for token exchange
   *
   * @param code - Authorization code from OIDC provider
   * @param codeVerifier - PKCE code verifier
   * @returns Token response with access token, refresh token, and ID token
   */
  async exchangeAuthorizationCode(code: string, codeVerifier: string): Promise<TokenResponse> {
    const tokenEndpoint = this.getTokenEndpoint()

    console.log(`OAuth2ClientWithConfig: Exchanging authorization code for ${this.provider}`)

    // Prepare token request body
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: this._redirectUri,
      code_verifier: codeVerifier,
      client_id: this.clientId
    })

    // Add client_secret to body (some providers prefer this over Basic Auth)
    if (this._clientSecret) {
      body.append('client_secret', this._clientSecret)
    }

    try {
      // Try with Basic Authentication first (RFC 6749 standard)
      const authHeader = Buffer.from(`${this.clientId}:${this._clientSecret}`).toString('base64')

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          Authorization: `Basic ${authHeader}`
        },
        body: body.toString()
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(
          `Token exchange failed for ${this.provider}: ${response.status} ${response.statusText} - ${errorData}`
        )
      }

      const data = await response.json()

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        idToken: data.id_token,
        tokenType: data.token_type || 'Bearer',
        expiresIn: data.expires_in,
        scope: data.scope
      }
    } catch (error) {
      console.error(`OAuth2ClientWithConfig: Token exchange error for ${this.provider}:`, error)
      throw error
    }
  }

  /**
   * Refresh access token using refresh token
   *
   * @param refreshToken - Refresh token from previous authentication
   * @returns New token response
   */
  async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    const tokenEndpoint = this.getTokenEndpoint()

    console.log(`OAuth2ClientWithConfig: Refreshing access token for ${this.provider}`)

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId
    })

    if (this._clientSecret) {
      body.append('client_secret', this._clientSecret)
    }

    try {
      const authHeader = Buffer.from(`${this.clientId}:${this._clientSecret}`).toString('base64')

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          Authorization: `Basic ${authHeader}`
        },
        body: body.toString()
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(
          `Token refresh failed for ${this.provider}: ${response.status} ${response.statusText} - ${errorData}`
        )
      }

      const data = await response.json()

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken, // Some providers don't return new refresh token
        idToken: data.id_token,
        tokenType: data.token_type || 'Bearer',
        expiresIn: data.expires_in,
        scope: data.scope
      }
    } catch (error) {
      console.error(`OAuth2ClientWithConfig: Token refresh error for ${this.provider}:`, error)
      throw error
    }
  }

  /**
   * Get the redirect URI
   */
  getRedirectUri(): string {
    return this._redirectUri
  }

  /**
   * Get the client secret
   */
  getClientSecret(): string {
    return this._clientSecret
  }
}
