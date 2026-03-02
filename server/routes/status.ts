/*
 * Open Bank Project -  API Explorer II
 * Copyright (C) 2023-2025, TESOBE GmbH
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

import { Router } from 'express'
import type { Request, Response } from 'express'
import { Container } from 'typedi'
import OBPClientService from '../services/OBPClientService.js'
import { OAuth2ProviderManager } from '../services/OAuth2ProviderManager.js'
import { commitId } from '../app.js'
import {
  RESOURCE_DOCS_API_VERSION,
  MESSAGE_DOCS_API_VERSION,
  API_VERSIONS_LIST_API_VERSION
} from '../../src/shared-constants.js'

const router = Router()

// Get services from container
const obpClientService = Container.get(OBPClientService)
const providerManager = Container.get(OAuth2ProviderManager)

const connectors = [
  'akka_vDec2018',
  'rest_vMar2019',
  'stored_procedure_vDec2019',
  'rabbitmq_vOct2024'
]

/**
 * Helper function to check if response contains an error
 */
function isCodeError(response: any, path: string): boolean {
  console.log(`Validating ${path} response...`)
  if (!response || Object.keys(response).length === 0) return true
  if (Object.keys(response).includes('code')) {
    const code = response['code']
    if (code >= 400) {
      console.log(response) // Log error response
      return true
    }
  }
  return false
}

/**
 * Check if resource docs are accessible
 */
async function checkResourceDocs(oauthConfig: any, version: string): Promise<boolean> {
  try {
    const path = `/obp/${RESOURCE_DOCS_API_VERSION}/resource-docs/${version}/obp`
    const resourceDocs = await obpClientService.get(path, oauthConfig)
    return !isCodeError(resourceDocs, path)
  } catch (error) {
    return false
  }
}

/**
 * Check if message docs are accessible
 */
async function checkMessageDocs(oauthConfig: any, version: string): Promise<boolean> {
  try {
    const messageDocsCodeResult = await Promise.all(
      connectors.map(async (connector) => {
        const path = `/obp/${MESSAGE_DOCS_API_VERSION}/message-docs/${connector}`
        return !isCodeError(await obpClientService.get(path, oauthConfig), path)
      })
    )
    return messageDocsCodeResult.every((isCodeError: boolean) => isCodeError)
  } catch (error) {
    return false
  }
}

/**
 * Check if API versions are accessible
 */
async function checkApiVersions(oauthConfig: any, version: string): Promise<boolean> {
  try {
    const path = `/obp/${API_VERSIONS_LIST_API_VERSION}/api/versions`
    const versions = await obpClientService.get(path, oauthConfig)
    return !isCodeError(versions, path)
  } catch (error) {
    return false
  }
}

/**
 * GET /status
 * Get application status and health checks
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const session = req.session as any
    const oauthConfig = session.clientConfig
    const version = obpClientService.getOBPVersion()

    // Check if user is authenticated
    const isAuthenticated = oauthConfig && oauthConfig.oauth2?.accessToken

    let currentUser = null
    let apiVersions = false
    let messageDocs = false
    let resourceDocs = false

    if (isAuthenticated) {
      try {
        currentUser = await obpClientService.get(`/obp/${version}/users/current`, oauthConfig)
        apiVersions = await checkApiVersions(oauthConfig, version)
        messageDocs = await checkMessageDocs(oauthConfig, version)
        resourceDocs = await checkResourceDocs(oauthConfig, version)
      } catch (error) {
        console.error('Status: Error fetching authenticated data:', error)
      }
    }

    res.json({
      status: apiVersions && messageDocs && resourceDocs,
      apiVersions,
      messageDocs,
      resourceDocs,
      currentUser,
      isAuthenticated,
      commitId
    })
  } catch (error) {
    console.error('Status: Error getting status:', error)
    res.status(500).json({
      status: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /status/providers
 * Get configured OAuth2 providers (for debugging)
 * Shows provider configuration with masked credentials
 */
router.get('/status/providers', (req: Request, res: Response) => {
  try {
    // Helper function to mask sensitive data (show first 2 and last 2 chars)
    const maskCredential = (value: string | undefined): string => {
      if (!value || value.length < 6) {
        return value ? '***masked***' : 'not configured'
      }
      return `${value.substring(0, 2)}...${value.substring(value.length - 2)}`
    }

    // Get providers from manager
    const availableProviders = providerManager.getAvailableProviders()
    const allProviderStatus = providerManager.getAllProviderStatus()

    // Shared redirect URL
    const sharedRedirectUrl = process.env.VITE_OAUTH2_REDIRECT_URL || 'not configured'

    // Get env configuration (masked)
    const envConfig = {
      obpOidc: {
        consumerId: process.env.VITE_OBP_CONSUMER_KEY || 'not configured',
        clientId: maskCredential(process.env.VITE_OBP_OIDC_CLIENT_ID)
      },
      keycloak: {
        clientId: maskCredential(process.env.VITE_KEYCLOAK_CLIENT_ID)
      },
      google: {
        clientId: maskCredential(process.env.VITE_GOOGLE_CLIENT_ID)
      },
      github: {
        clientId: maskCredential(process.env.VITE_GITHUB_CLIENT_ID)
      },
      custom: {
        providerName: process.env.VITE_CUSTOM_OIDC_PROVIDER_NAME || 'not configured',
        clientId: maskCredential(process.env.VITE_CUSTOM_OIDC_CLIENT_ID)
      }
    }

    res.json({
      summary: {
        totalConfigured: availableProviders.length,
        availableProviders: availableProviders,
        obpApiHost: process.env.VITE_OBP_API_HOST || 'not configured',
        sharedRedirectUrl: sharedRedirectUrl
      },
      providerStatus: allProviderStatus,
      environmentConfig: envConfig,
      note: 'Credentials are masked for security. Format: first2...last2'
    })
  } catch (error) {
    console.error('Status: Error getting provider status:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /status/providers/:providerName/retry
 * Manually retry initialization for a failed provider
 */
router.post('/status/providers/:providerName/retry', async (req: Request, res: Response) => {
  try {
    const { providerName } = req.params
    console.log(`Status: Retrying provider: ${providerName}`)

    const success = await providerManager.retryProvider(providerName)

    if (success) {
      const status = providerManager.getProviderStatus(providerName)
      res.json({
        success: true,
        message: `Provider ${providerName} successfully initialized`,
        status
      })
    } else {
      res.status(400).json({
        success: false,
        message: `Failed to initialize provider ${providerName}`,
        error: 'Initialization failed'
      })
    }
  } catch (error) {
    console.error('Status: Error retrying provider:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /status/oidc-debug
 * Get detailed OIDC discovery information for debugging
 * Shows the full discovery process and configuration for all providers
 */
router.get('/status/oidc-debug', async (req: Request, res: Response) => {
  try {
    console.log('OIDC Debug: Starting detailed discovery process...')

    // Step 1: Get OBP API well-known endpoint info
    const obpApiHost = obpClientService.getOBPClientConfig().baseUri
    const wellKnownEndpoint = `${obpApiHost}/obp/v5.1.0/well-known`

    const step1 = {
      description: 'Discovery of OIDC providers from OBP API',
      endpoint: wellKnownEndpoint,
      success: false,
      response: null as any,
      error: null as string | null,
      providers: [] as any[]
    }

    try {
      console.log(`OIDC Debug: Fetching from ${wellKnownEndpoint}`)
      const wellKnownResponse = await obpClientService.get('/obp/v5.1.0/well-known', null)
      step1.response = wellKnownResponse
      step1.success = !!(wellKnownResponse && wellKnownResponse.well_known_uris)
      step1.providers = wellKnownResponse.well_known_uris || []
      console.log(`OIDC Debug: Found ${step1.providers.length} providers`)
    } catch (error) {
      step1.error = error instanceof Error ? error.message : 'Unknown error'
      console.error('OIDC Debug: Error fetching OBP well-known:', error)
    }

    // Step 2: For each provider, fetch their OIDC configuration
    const providerDetails = []

    for (const provider of step1.providers) {
      console.log(`OIDC Debug: Fetching OIDC config for ${provider.provider}`)
      const detail = {
        providerName: provider.provider,
        wellKnownUrl: provider.url,
        success: false,
        oidcConfiguration: null as any,
        error: null as string | null,
        endpoints: {
          authorization: null as string | null,
          token: null as string | null,
          userinfo: null as string | null,
          jwks: null as string | null
        },
        issuer: null as string | null,
        supportedFeatures: {
          pkce: false,
          scopes: [] as string[],
          responseTypes: [] as string[],
          grantTypes: [] as string[]
        }
      }

      try {
        const response = await fetch(provider.url)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const config = await response.json()
        detail.oidcConfiguration = config
        detail.success = true
        detail.issuer = config.issuer

        // Extract endpoints
        detail.endpoints.authorization = config.authorization_endpoint
        detail.endpoints.token = config.token_endpoint
        detail.endpoints.userinfo = config.userinfo_endpoint
        detail.endpoints.jwks = config.jwks_uri

        // Extract supported features
        detail.supportedFeatures.pkce =
          config.code_challenge_methods_supported?.includes('S256') || false
        detail.supportedFeatures.scopes = config.scopes_supported || []
        detail.supportedFeatures.responseTypes = config.response_types_supported || []
        detail.supportedFeatures.grantTypes = config.grant_types_supported || []

        console.log(`OIDC Debug: Successfully fetched config for ${provider.provider}`)
      } catch (error) {
        detail.error = error instanceof Error ? error.message : 'Unknown error'
        console.error(`OIDC Debug: Error fetching config for ${provider.provider}:`, error)
      }

      providerDetails.push(detail)
    }

    // Step 3: Get current provider status from manager
    const currentStatus = providerManager.getAllProviderStatus()
    const availableProviders = providerManager.getAvailableProviders()

    // Step 4: Get environment configuration
    const maskCredential = (value: string | undefined): string => {
      if (!value || value.length < 6) {
        return value ? '***masked***' : 'not configured'
      }
      return `${value.substring(0, 2)}...${value.substring(value.length - 2)}`
    }

    const envConfig = {
      obpOidc: {
        clientId: maskCredential(process.env.VITE_OBP_OIDC_CLIENT_ID),
        clientSecret: process.env.VITE_OBP_OIDC_CLIENT_SECRET ? 'configured' : 'not configured',
        configured: !!(
          process.env.VITE_OBP_OIDC_CLIENT_ID && process.env.VITE_OBP_OIDC_CLIENT_SECRET
        )
      },
      keycloak: {
        clientId: maskCredential(process.env.VITE_KEYCLOAK_CLIENT_ID),
        clientSecret: process.env.VITE_KEYCLOAK_CLIENT_SECRET ? 'configured' : 'not configured',
        configured: !!(
          process.env.VITE_KEYCLOAK_CLIENT_ID && process.env.VITE_KEYCLOAK_CLIENT_SECRET
        )
      },
      google: {
        clientId: maskCredential(process.env.VITE_GOOGLE_CLIENT_ID),
        clientSecret: process.env.VITE_GOOGLE_CLIENT_SECRET ? 'configured' : 'not configured',
        configured: !!(process.env.VITE_GOOGLE_CLIENT_ID && process.env.VITE_GOOGLE_CLIENT_SECRET)
      },
      github: {
        clientId: maskCredential(process.env.VITE_GITHUB_CLIENT_ID),
        clientSecret: process.env.VITE_GITHUB_CLIENT_SECRET ? 'configured' : 'not configured',
        configured: !!(process.env.VITE_GITHUB_CLIENT_ID && process.env.VITE_GITHUB_CLIENT_SECRET)
      },
      custom: {
        providerName: process.env.VITE_CUSTOM_OIDC_PROVIDER_NAME || 'not configured',
        clientId: maskCredential(process.env.VITE_CUSTOM_OIDC_CLIENT_ID),
        clientSecret: process.env.VITE_CUSTOM_OIDC_CLIENT_SECRET ? 'configured' : 'not configured',
        configured: !!(
          process.env.VITE_CUSTOM_OIDC_CLIENT_ID && process.env.VITE_CUSTOM_OIDC_CLIENT_SECRET
        )
      },
      shared: {
        redirectUrl: process.env.VITE_OAUTH2_REDIRECT_URL || 'not configured',
        obpApiHost: process.env.VITE_OBP_API_HOST || 'not configured'
      }
    }

    // Compile summary
    const summary = {
      timestamp: new Date().toISOString(),
      obpApiReachable: step1.success,
      totalProvidersDiscovered: step1.providers.length,
      successfulConfigurations: providerDetails.filter((p) => p.success).length,
      failedConfigurations: providerDetails.filter((p) => !p.success).length,
      currentlyAvailable: availableProviders.length,
      configuredInEnvironment: Object.values(envConfig).filter(
        (c) => typeof c === 'object' && 'configured' in c && c.configured
      ).length
    }

    res.json({
      summary,
      discoveryProcess: {
        step1_obpApiDiscovery: step1,
        step2_providerConfigurations: providerDetails,
        step3_currentStatus: currentStatus
      },
      environment: envConfig,
      recommendations: generateRecommendations(step1, providerDetails, envConfig, currentStatus),
      note: 'This debug information shows the complete OIDC discovery process for troubleshooting'
    })

    console.log('OIDC Debug: Response sent successfully')
  } catch (error) {
    console.error('OIDC Debug: Error generating debug info:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
  }
})

/**
 * Generate troubleshooting recommendations based on the discovery results
 */
function generateRecommendations(
  step1: any,
  providerDetails: any[],
  envConfig: any,
  currentStatus: any[]
): string[] {
  const recommendations: string[] = []

  // Check if OBP API is reachable
  if (!step1.success) {
    recommendations.push(
      '❌ OBP API well-known endpoint is not reachable. Check that VITE_OBP_API_HOST is correct and the API server is running.'
    )
    recommendations.push(`   Current endpoint: ${step1.endpoint}`)
    if (step1.error) {
      recommendations.push(`   Error: ${step1.error}`)
    }
  } else {
    recommendations.push('✅ OBP API well-known endpoint is reachable')
  }

  // Check if any providers were discovered
  if (step1.providers.length === 0) {
    recommendations.push(
      '⚠️  No OIDC providers found in OBP API response. The OBP API may not have any providers configured.'
    )
  } else {
    recommendations.push(`✅ Found ${step1.providers.length} provider(s) from OBP API`)
  }

  // Check each provider's configuration
  providerDetails.forEach((provider) => {
    if (!provider.success) {
      recommendations.push(
        `❌ Provider '${provider.providerName}' OIDC configuration failed to load`
      )
      recommendations.push(`   Well-known URL: ${provider.wellKnownUrl}`)
      if (provider.error) {
        recommendations.push(`   Error: ${provider.error}`)
      }
      recommendations.push(
        `   Check that the provider's well-known endpoint is accessible and returning valid JSON`
      )
    } else {
      recommendations.push(
        `✅ Provider '${provider.providerName}' OIDC configuration loaded successfully`
      )
    }

    // Check if provider has environment credentials
    const envKey = provider.providerName.replace('-', '')
    const providerEnv = envConfig[envKey] || envConfig[provider.providerName]
    if (providerEnv && !providerEnv.configured) {
      recommendations.push(
        `⚠️  Provider '${provider.providerName}' is missing environment credentials`
      )
      const upperName = provider.providerName.toUpperCase().replace('-', '_')
      recommendations.push(`   Set VITE_${upperName}_CLIENT_ID and VITE_${upperName}_CLIENT_SECRET`)
    }
  })

  // Check current provider status
  currentStatus.forEach((status) => {
    if (!status.available) {
      recommendations.push(`⚠️  Provider '${status.name}' is currently unavailable`)
      if (status.error) {
        recommendations.push(`   Error: ${status.error}`)
      }
    }
  })

  if (recommendations.length === 0) {
    recommendations.push('✅ All checks passed! OIDC configuration looks good.')
  }

  return recommendations
}

export default router
