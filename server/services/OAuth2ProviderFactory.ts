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

import { Service } from 'typedi'
import { OAuth2ClientWithConfig } from './OAuth2ClientWithConfig.js'
import type { WellKnownUri, ProviderStrategy } from '../types/oauth2.js'

/**
 * Factory for creating OAuth2 clients for different OIDC providers
 *
 * Uses the Strategy pattern to handle provider-specific configurations:
 * - OBP-OIDC
 * - Keycloak
 * - Google
 * - GitHub
 * - Custom providers
 *
 * Configuration is loaded from environment variables.
 *
 * @example
 * const factory = Container.get(OAuth2ProviderFactory)
 * const client = await factory.initializeProvider({
 *   provider: 'obp-oidc',
 *   url: 'http://localhost:9000/obp-oidc/.well-known/openid-configuration'
 * })
 */
@Service()
export class OAuth2ProviderFactory {
  private strategies: Map<string, ProviderStrategy> = new Map()

  constructor() {
    this.loadStrategies()
  }

  /**
   * Load provider strategies from environment variables
   *
   * Each provider requires:
   * - VITE_[PROVIDER]_CLIENT_ID
   * - VITE_[PROVIDER]_CLIENT_SECRET
   * - VITE_OAUTH2_REDIRECT_URL (shared by all providers, defaults to /api/oauth2/callback)
   */
  private loadStrategies(): void {
    console.log('OAuth2ProviderFactory: Loading provider strategies...')

    // Shared redirect URL for all providers
    const sharedRedirectUri =
      process.env.VITE_OAUTH2_REDIRECT_URL || 'http://localhost:5173/api/oauth2/callback'

    // OBP-OIDC Strategy
    if (process.env.VITE_OBP_OAUTH2_CLIENT_ID) {
      this.strategies.set('obp-oidc', {
        clientId: process.env.VITE_OBP_OAUTH2_CLIENT_ID,
        clientSecret: process.env.VITE_OBP_OAUTH2_CLIENT_SECRET || '',
        redirectUri: sharedRedirectUri,
        scopes: ['openid', 'profile', 'email']
      })
      console.log('  OK OBP-OIDC strategy loaded')
    }

    // Keycloak Strategy
    if (process.env.VITE_KEYCLOAK_CLIENT_ID) {
      this.strategies.set('keycloak', {
        clientId: process.env.VITE_KEYCLOAK_CLIENT_ID,
        clientSecret: process.env.VITE_KEYCLOAK_CLIENT_SECRET || '',
        redirectUri: sharedRedirectUri,
        scopes: ['openid', 'profile', 'email']
      })
      console.log('  OK Keycloak strategy loaded')
    }

    // Google Strategy
    if (process.env.VITE_GOOGLE_CLIENT_ID) {
      this.strategies.set('google', {
        clientId: process.env.VITE_GOOGLE_CLIENT_ID,
        clientSecret: process.env.VITE_GOOGLE_CLIENT_SECRET || '',
        redirectUri: sharedRedirectUri,
        scopes: ['openid', 'profile', 'email']
      })
      console.log('  OK Google strategy loaded')
    }

    // GitHub Strategy
    if (process.env.VITE_GITHUB_CLIENT_ID) {
      this.strategies.set('github', {
        clientId: process.env.VITE_GITHUB_CLIENT_ID,
        clientSecret: process.env.VITE_GITHUB_CLIENT_SECRET || '',
        redirectUri: sharedRedirectUri,
        scopes: ['read:user', 'user:email']
      })
      console.log('  OK GitHub strategy loaded')
    }

    // Generic OIDC Strategy (for custom providers)
    if (process.env.VITE_CUSTOM_OIDC_CLIENT_ID) {
      const providerName = process.env.VITE_CUSTOM_OIDC_PROVIDER_NAME || 'custom-oidc'
      this.strategies.set(providerName, {
        clientId: process.env.VITE_CUSTOM_OIDC_CLIENT_ID,
        clientSecret: process.env.VITE_CUSTOM_OIDC_CLIENT_SECRET || '',
        redirectUri: sharedRedirectUri,
        scopes: ['openid', 'profile', 'email']
      })
      console.log(`  OK Custom OIDC strategy loaded: ${providerName}`)
    }

    console.log(`OAuth2ProviderFactory: Loaded ${this.strategies.size} provider strategies`)

    if (this.strategies.size === 0) {
      console.warn('OAuth2ProviderFactory: WARNING - No provider strategies configured!')
      console.warn('OAuth2ProviderFactory: Set environment variables for at least one provider')
      console.warn(
        'OAuth2ProviderFactory: Example: VITE_OBP_OAUTH2_CLIENT_ID, VITE_OBP_OAUTH2_CLIENT_SECRET'
      )
    }
  }

  /**
   * Initialize an OAuth2 client for a specific provider
   *
   * @param wellKnownUri - Provider information from OBP API
   * @returns Initialized OAuth2 client or null if no strategy exists or initialization fails
   *
   * @example
   * const client = await factory.initializeProvider({
   *   provider: 'obp-oidc',
   *   url: 'http://localhost:9000/obp-oidc/.well-known/openid-configuration'
   * })
   */
  async initializeProvider(wellKnownUri: WellKnownUri): Promise<OAuth2ClientWithConfig | null> {
    console.log(`OAuth2ProviderFactory: Initializing provider: ${wellKnownUri.provider}`)

    const strategy = this.strategies.get(wellKnownUri.provider)
    if (!strategy) {
      console.warn(
        `OAuth2ProviderFactory: No strategy found for provider: ${wellKnownUri.provider}`
      )
      console.warn(
        `OAuth2ProviderFactory: Available strategies: ${Array.from(this.strategies.keys()).join(', ')}`
      )
      return null
    }

    // Validate strategy configuration
    if (!strategy.clientId) {
      console.error(
        `OAuth2ProviderFactory: Missing clientId for provider: ${wellKnownUri.provider}`
      )
      return null
    }

    if (!strategy.clientSecret) {
      console.warn(
        `OAuth2ProviderFactory: Missing clientSecret for provider: ${wellKnownUri.provider}`
      )
      console.warn(`OAuth2ProviderFactory: Some providers require a client secret`)
    }

    try {
      const client = new OAuth2ClientWithConfig(
        strategy.clientId,
        strategy.clientSecret,
        strategy.redirectUri,
        wellKnownUri.provider
      )

      // Initialize OIDC configuration from discovery endpoint
      await client.initOIDCConfig(wellKnownUri.url)

      console.log(`OAuth2ProviderFactory: Successfully initialized ${wellKnownUri.provider}`)
      return client
    } catch (error) {
      console.error(`OAuth2ProviderFactory: Failed to initialize ${wellKnownUri.provider}:`, error)
      return null
    }
  }

  /**
   * Get list of configured provider names
   *
   * @returns Array of provider names that have strategies configured
   */
  getConfiguredProviders(): string[] {
    return Array.from(this.strategies.keys())
  }

  /**
   * Check if a provider strategy exists
   *
   * @param providerName - Name of the provider to check
   * @returns True if strategy exists for this provider
   */
  hasStrategy(providerName: string): boolean {
    return this.strategies.has(providerName)
  }

  /**
   * Get strategy for a specific provider (for debugging/testing)
   *
   * @param providerName - Name of the provider
   * @returns Provider strategy or undefined if not found
   */
  getStrategy(providerName: string): ProviderStrategy | undefined {
    return this.strategies.get(providerName)
  }

  /**
   * Get count of configured strategies
   *
   * @returns Number of provider strategies loaded
   */
  getStrategyCount(): number {
    return this.strategies.size
  }
}
