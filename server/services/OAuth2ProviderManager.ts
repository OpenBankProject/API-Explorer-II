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

import { Service, Container } from 'typedi'
import { OAuth2ProviderFactory } from './OAuth2ProviderFactory.js'
import { OAuth2ClientWithConfig } from './OAuth2ClientWithConfig.js'
import OBPClientService from './OBPClientService.js'
import type { WellKnownUri, WellKnownResponse, ProviderStatus } from '../types/oauth2.js'

/**
 * Manager for multiple OAuth2/OIDC providers
 *
 * Responsibilities:
 * - Fetch available OIDC providers from OBP API
 * - Initialize OAuth2 clients for each provider
 * - Track provider health status
 * - Perform periodic health checks
 * - Provide access to provider clients
 *
 * The manager automatically:
 * - Retries failed provider initializations
 * - Monitors provider availability (60s intervals by default)
 * - Updates provider status in real-time
 *
 * @example
 * const manager = Container.get(OAuth2ProviderManager)
 * await manager.initializeProviders()
 * const client = manager.getProvider('obp-oidc')
 */
@Service()
export class OAuth2ProviderManager {
  private providers: Map<string, OAuth2ClientWithConfig> = new Map()
  private providerStatus: Map<string, ProviderStatus> = new Map()
  private healthCheckInterval: NodeJS.Timeout | null = null
  private retryInterval: NodeJS.Timeout | null = null
  private factory: OAuth2ProviderFactory
  private obpClientService: OBPClientService
  private initialized: boolean = false

  constructor() {
    this.factory = Container.get(OAuth2ProviderFactory)
    this.obpClientService = Container.get(OBPClientService)
  }

  /**
   * Fetch well-known URIs from OBP API or legacy env variable
   *
   * Priority:
   * 1. VITE_OBP_OAUTH2_WELL_KNOWN_URL (legacy single-provider mode)
   * 2. VITE_OBP_API_HOST/obp/v5.1.0/well-known (multi-provider mode)
   *
   * @returns Array of well-known URIs with provider names
   */
  async fetchWellKnownUris(): Promise<WellKnownUri[]> {
    // Check for legacy single-provider configuration
    const legacyWellKnownUrl = process.env.VITE_OBP_OAUTH2_WELL_KNOWN_URL

    if (legacyWellKnownUrl) {
      console.log('OAuth2ProviderManager: Using legacy VITE_OBP_OAUTH2_WELL_KNOWN_URL...')
      console.log(`OAuth2ProviderManager: Well-known URL: ${legacyWellKnownUrl}`)

      // Return single provider configuration
      return [
        {
          provider: 'obp-oidc',
          url: legacyWellKnownUrl
        }
      ]
    }

    // Multi-provider mode: fetch from OBP API
    console.log('OAuth2ProviderManager: Fetching well-known URIs from OBP API...')
    console.log(
      `OAuth2ProviderManager: Target URL: ${this.obpClientService.getOBPClientConfig().baseUri}/obp/v5.1.0/well-known`
    )

    try {
      // Use OBPClientService to call the API
      const response = await this.obpClientService.get('/obp/v5.1.0/well-known', null)

      console.log(
        'OAuth2ProviderManager: Raw response from OBP API:',
        JSON.stringify(response, null, 2)
      )

      if (!response.well_known_uris || response.well_known_uris.length === 0) {
        console.warn('OAuth2ProviderManager: No well-known URIs found in OBP API response')
        console.warn('OAuth2ProviderManager: Response keys:', Object.keys(response))
        return []
      }

      console.log(`OAuth2ProviderManager: Found ${response.well_known_uris.length} providers:`)
      response.well_known_uris.forEach((uri: WellKnownUri) => {
        console.log(`  - ${uri.provider}: ${uri.url}`)
        console.log(`    Testing accessibility of: ${uri.url}`)
      })

      return response.well_known_uris
    } catch (error) {
      console.error('OAuth2ProviderManager: Failed to fetch well-known URIs:', error)
      console.error(
        'OAuth2ProviderManager: Error details:',
        error instanceof Error ? error.message : String(error)
      )
      console.warn('OAuth2ProviderManager: Falling back to no providers')
      return []
    }
  }

  /**
   * Initialize all OAuth2 providers from OBP API
   *
   * This method:
   * 1. Fetches well-known URIs from OBP API
   * 2. Initializes OAuth2 client for each provider
   * 3. Tracks successful and failed initializations
   * 4. Returns success status
   *
   * @returns True if at least one provider was initialized successfully
   */
  async initializeProviders(): Promise<boolean> {
    console.log('OAuth2ProviderManager: Initializing providers...')

    const wellKnownUris = await this.fetchWellKnownUris()

    if (wellKnownUris.length === 0) {
      console.warn('OAuth2ProviderManager: No providers to initialize')
      console.warn(
        'OAuth2ProviderManager: Check that OBP API is running and /obp/v5.1.0/well-known endpoint is available'
      )
      console.log('OAuth2ProviderManager: Will retry fetching providers every 30 seconds...')
      this.startRetryInterval()
      return false
    }

    let successCount = 0

    for (const providerUri of wellKnownUris) {
      try {
        const client = await this.factory.initializeProvider(providerUri)

        if (client && client.isInitialized()) {
          this.providers.set(providerUri.provider, client)
          this.providerStatus.set(providerUri.provider, {
            name: providerUri.provider,
            available: true,
            lastChecked: new Date()
          })
          successCount++
          console.log(`OAuth2ProviderManager: OK ${providerUri.provider} initialized`)
        } else {
          this.providerStatus.set(providerUri.provider, {
            name: providerUri.provider,
            available: false,
            lastChecked: new Date(),
            error: 'Failed to initialize client'
          })
          console.warn(`OAuth2ProviderManager: ERROR ${providerUri.provider} failed to initialize`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        this.providerStatus.set(providerUri.provider, {
          name: providerUri.provider,
          available: false,
          lastChecked: new Date(),
          error: errorMessage
        })
        console.error(`OAuth2ProviderManager: ERROR ${providerUri.provider} error:`, error)
      }
    }

    this.initialized = successCount > 0

    console.log(
      `OAuth2ProviderManager: Initialized ${successCount}/${wellKnownUris.length} providers`
    )

    if (successCount === 0) {
      console.error('OAuth2ProviderManager: ERROR - No providers were successfully initialized')
      console.error(
        'OAuth2ProviderManager: Users will not be able to log in until at least one provider is available'
      )
      console.log('OAuth2ProviderManager: Will retry initialization every 30 seconds...')
      this.startRetryInterval()
    } else if (successCount < wellKnownUris.length) {
      // Some providers failed - retry only the failed ones
      console.log(
        `OAuth2ProviderManager: ${wellKnownUris.length - successCount} provider(s) failed, will retry every 30 seconds...`
      )
      this.startRetryInterval()
    }

    return this.initialized
  }

  /**
   * Start periodic health checks for all providers
   *
   * @param intervalMs - Health check interval in milliseconds (default: 60000 = 1 minute)
   */
  startHealthCheck(intervalMs: number = 60000): void {
    if (this.healthCheckInterval) {
      console.log('OAuth2ProviderManager: Health check already running')
      return
    }

    console.log(
      `OAuth2ProviderManager: Starting health check (every ${intervalMs / 1000}s = ${intervalMs / 60000} minute(s))`
    )

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck()
    }, intervalMs)
  }

  /**
   * Stop periodic health checks
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
      console.log('OAuth2ProviderManager: Health check stopped')
    }
  }

  /**
   * Start periodic retry for failed providers
   *
   * @param intervalMs - Retry interval in milliseconds (default: 30000 = 30 seconds)
   */
  startRetryInterval(intervalMs: number = 30000): void {
    if (this.retryInterval) {
      console.log('OAuth2ProviderManager: Retry interval already running')
      return
    }

    console.log(`OAuth2ProviderManager: Starting retry interval (every ${intervalMs / 1000}s)`)

    this.retryInterval = setInterval(async () => {
      await this.retryFailedProviders()
    }, intervalMs)
  }

  /**
   * Stop periodic retry interval
   */
  stopRetryInterval(): void {
    if (this.retryInterval) {
      clearInterval(this.retryInterval)
      this.retryInterval = null
      console.log('OAuth2ProviderManager: Retry interval stopped')
    }
  }

  /**
   * Retry all failed providers
   */
  private async retryFailedProviders(): Promise<void> {
    const failedProviders: string[] = []

    this.providerStatus.forEach((status, name) => {
      if (!status.available) {
        failedProviders.push(name)
      }
    })

    // Also check if we have no providers at all (initial fetch may have failed)
    if (this.providerStatus.size === 0) {
      console.log(
        'OAuth2ProviderManager: No providers initialized yet, attempting full initialization...'
      )

      // Temporarily stop retry to prevent duplicate calls
      this.stopRetryInterval()

      const success = await this.initializeProviders()
      if (!success) {
        // Restart retry if initialization failed
        this.startRetryInterval()
      }
      return
    }

    if (failedProviders.length === 0) {
      console.log('OAuth2ProviderManager: All providers healthy, stopping retry interval')
      this.stopRetryInterval()
      return
    }

    console.log(`OAuth2ProviderManager: Retrying ${failedProviders.length} failed provider(s)...`)

    for (const providerName of failedProviders) {
      const success = await this.retryProvider(providerName)
      if (success) {
        console.log(`OAuth2ProviderManager: Successfully recovered provider: ${providerName}`)
      }
    }

    // Check if all providers are now healthy
    const stillFailed = Array.from(this.providerStatus.values()).filter((s) => !s.available)
    if (stillFailed.length === 0) {
      console.log('OAuth2ProviderManager: All providers recovered, stopping retry interval')
      this.stopRetryInterval()
    }
  }

  /**
   * Perform health check on all providers
   *
   * This checks if each provider's issuer endpoint is reachable
   */
  private async performHealthCheck(): Promise<void> {
    console.log('OAuth2ProviderManager: Performing health check...')

    const checkPromises: Promise<void>[] = []

    this.providers.forEach((client, providerName) => {
      checkPromises.push(this.checkProviderHealth(providerName, client))
    })

    await Promise.allSettled(checkPromises)
  }

  /**
   * Check health of a single provider
   *
   * @param providerName - Name of the provider
   * @param client - OAuth2 client for the provider
   */
  private async checkProviderHealth(
    providerName: string,
    client: OAuth2ClientWithConfig
  ): Promise<void> {
    try {
      // Try to fetch OIDC well-known endpoint to verify provider is reachable
      const wellKnownUrl = client.wellKnownUri
      if (!wellKnownUrl) {
        throw new Error('No well-known URL configured')
      }

      console.log(`  Checking ${providerName} at: ${wellKnownUrl}`)

      // Use HEAD request as per HTTP standards - all endpoints supporting GET should support HEAD
      const response = await fetch(wellKnownUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })

      const isAvailable = response.ok
      this.providerStatus.set(providerName, {
        name: providerName,
        available: isAvailable,
        lastChecked: new Date(),
        error: isAvailable ? undefined : `HTTP ${response.status}`
      })

      console.log(`  ${providerName}: ${isAvailable ? 'healthy' : 'unhealthy'}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.providerStatus.set(providerName, {
        name: providerName,
        available: false,
        lastChecked: new Date(),
        error: errorMessage
      })
      console.log(`  ${providerName}: unhealthy (${errorMessage})`)
    }
  }

  /**
   * Get OAuth2 client for a specific provider
   *
   * @param providerName - Provider name (e.g., "obp-oidc", "keycloak")
   * @returns OAuth2 client or undefined if not found
   */
  getProvider(providerName: string): OAuth2ClientWithConfig | undefined {
    return this.providers.get(providerName)
  }

  /**
   * Get list of all available (initialized and healthy) provider names
   *
   * @returns Array of available provider names
   */
  getAvailableProviders(): string[] {
    const available: string[] = []

    this.providerStatus.forEach((status, name) => {
      if (status.available && this.providers.has(name)) {
        available.push(name)
      }
    })

    return available
  }

  /**
   * Get status for all providers
   *
   * @returns Array of provider status objects
   */
  getAllProviderStatus(): ProviderStatus[] {
    return Array.from(this.providerStatus.values())
  }

  /**
   * Get status for a specific provider
   *
   * @param providerName - Provider name
   * @returns Provider status or undefined if not found
   */
  getProviderStatus(providerName: string): ProviderStatus | undefined {
    return this.providerStatus.get(providerName)
  }

  /**
   * Check if the manager has been initialized
   *
   * @returns True if at least one provider was successfully initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get count of initialized providers
   *
   * @returns Number of providers in the map
   */
  getProviderCount(): number {
    return this.providers.size
  }

  /**
   * Get count of available (healthy) providers
   *
   * @returns Number of providers that are currently available
   */
  getAvailableProviderCount(): number {
    return this.getAvailableProviders().length
  }

  /**
   * Manually retry initialization for a failed provider
   *
   * @param providerName - Provider name to retry
   * @returns True if initialization succeeded
   */
  async retryProvider(providerName: string): Promise<boolean> {
    console.log(`OAuth2ProviderManager: Retrying initialization for ${providerName}`)

    try {
      // Fetch well-known URIs again to get latest configuration
      const wellKnownUris = await this.fetchWellKnownUris()
      const providerUri = wellKnownUris.find((uri) => uri.provider === providerName)

      if (!providerUri) {
        console.error(`OAuth2ProviderManager: Provider ${providerName} not found in OBP API`)
        return false
      }

      const client = await this.factory.initializeProvider(providerUri)

      if (client && client.isInitialized()) {
        this.providers.set(providerName, client)
        this.providerStatus.set(providerName, {
          name: providerName,
          available: true,
          lastChecked: new Date()
        })
        console.log(`OAuth2ProviderManager: OK ${providerName} retry successful`)
        return true
      } else {
        console.error(`OAuth2ProviderManager: ERROR ${providerName} retry failed`)
        return false
      }
    } catch (error) {
      console.error(`OAuth2ProviderManager: Error retrying ${providerName}:`, error)
      return false
    }
  }
}
