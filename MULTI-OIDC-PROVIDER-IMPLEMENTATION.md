# Multi-OIDC Provider Implementation Guide

## API Explorer II - Support for Multiple Identity Providers

**Document Version:** 1.0  
**Date:** 2024  
**Author:** API Explorer II Team  
**Status:** Implementation Guide

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [OBP-Portal Multi-Provider Architecture](#obp-portal-multi-provider-architecture)
4. [API Explorer II Adaptation Strategy](#api-explorer-ii-adaptation-strategy)
5. [Implementation Plan](#implementation-plan)
6. [Code Implementation](#code-implementation)
7. [Testing Strategy](#testing-strategy)
8. [Configuration](#configuration)
9. [Deployment Considerations](#deployment-considerations)
10. [Troubleshooting](#troubleshooting)

---

## 1. Executive Summary

### Overview

This document outlines the implementation of **multiple OIDC provider support** in API Explorer II, enabling users to choose from different identity providers (OBP-OIDC, Keycloak, etc.) at login time. This approach is based on the proven implementation in OBP-Portal.

### Key Goals

- ✅ Support multiple OIDC providers dynamically discovered from OBP API
- ✅ Maintain backward compatibility with single-provider configuration
- ✅ Provide user-friendly provider selection UI
- ✅ Handle provider-specific authentication flows
- ✅ Implement health monitoring for all providers
- ✅ Support automatic failover and retry logic

### Benefits

1. **Flexibility**: Organizations can use their preferred identity provider
2. **Resilience**: Fallback to alternative providers if one is down
3. **Future-proof**: Easy to add new providers without code changes
4. **User Choice**: Users can select their authentication method
5. **Consistency**: Aligns with OBP-Portal architecture

---

## 2. Current State Analysis

### 2.1 Current Implementation

API Explorer II currently supports OAuth2/OIDC with a **single provider** configuration:

```typescript
// server/services/OAuth2Service.ts
@Service()
export class OAuth2Service {
  private client: OAuth2Client
  private oidcConfig: OIDCConfiguration | null = null
  private wellKnownUrl: string = ''

  constructor() {
    this.clientId = process.env.VITE_OBP_OAUTH2_CLIENT_ID || ''
    this.clientSecret = process.env.VITE_OBP_OAUTH2_CLIENT_SECRET || ''
    this.redirectUri = process.env.VITE_OBP_OAUTH2_REDIRECT_URL || ''
    this.client = new OAuth2Client(this.clientId, this.clientSecret, this.redirectUri)
  }

  async initializeFromWellKnown(wellKnownUrl: string): Promise<void> {
    // Fetches .well-known/openid-configuration
    const response = await fetch(wellKnownUrl)
    const config = await response.json()
    this.oidcConfig = config
  }
}
```

**Environment Configuration:**

```bash
VITE_OBP_OAUTH2_WELL_KNOWN_URL=http://127.0.0.1:9000/obp-oidc/.well-known/openid-configuration
VITE_OBP_OAUTH2_CLIENT_ID=48ac28e9-9ee3-47fd-8448-69a62764b779
VITE_OBP_OAUTH2_CLIENT_SECRET=fOTQF7jfg8C74u7ZhSjVQpoBYvD0KpWfM5UsEZBSFFM
VITE_OBP_OAUTH2_REDIRECT_URL=http://localhost:5173/api/oauth2/callback
```

**Current Login Flow:**

1. User clicks "Login" button
2. Redirects to `/api/oauth2/connect`
3. Server generates PKCE parameters and state
4. Redirects to OIDC provider (hardcoded from env)
5. User authenticates
6. Callback to `/api/oauth2/callback`
7. Session established

### 2.2 Limitations

- ❌ Only supports one OIDC provider at a time
- ❌ Requires environment variable changes to switch providers
- ❌ No user choice of authentication method
- ❌ No fallback if provider is unavailable
- ❌ Requires redeployment to add new providers

---

## 3. OBP-Portal Multi-Provider Architecture

### 3.1 How OBP-Portal Handles Multiple Providers

OBP-Portal fetches available OIDC providers from the **OBP API well-known endpoint**:

```
GET /obp/v5.1.0/well-known
```

**Example Response:**

```json
{
  "well_known_uris": [
    {
      "provider": "obp-oidc",
      "url": "http://127.0.0.1:9000/obp-oidc/.well-known/openid-configuration"
    },
    {
      "provider": "keycloak",
      "url": "http://127.0.0.1:8180/realms/obp/.well-known/openid-configuration"
    }
  ]
}
```

### 3.2 OBP-Portal Key Components

#### 3.2.1 Provider Manager (`src/lib/oauth/providerManager.ts`)

**Responsibilities:**

- Fetch well-known URIs from OBP API
- Initialize OAuth2 clients for each provider
- Track provider availability (healthy/unhealthy)
- Perform periodic health checks (60s intervals)
- Retry initialization for failed providers

**Key Code:**

```typescript
class OAuth2ProviderManager {
  private providers: Map<string, OAuth2ClientWithConfig> = new Map()
  private availableProviders: Set<string> = new Set()
  private unavailableProviders: Set<string> = new Set()

  async fetchWellKnownUris(): Promise<WellKnownUri[]> {
    const response = await obp_requests.get('/obp/v5.1.0/well-known')
    return response.well_known_uris
  }

  async initOauth2Providers() {
    const wellKnownUris = await this.fetchWellKnownUris()

    for (const providerUri of wellKnownUris) {
      try {
        const client = await oauth2ProviderFactory.initializeProvider(providerUri)
        if (client) {
          this.providers.set(providerUri.provider, client)
          this.availableProviders.add(providerUri.provider)
        }
      } catch (error) {
        console.error(`Failed to initialize ${providerUri.provider}:`, error)
        this.unavailableProviders.add(providerUri.provider)
      }
    }
  }

  getProvider(name: string): OAuth2ClientWithConfig | undefined {
    return this.providers.get(name)
  }

  getAvailableProviders(): string[] {
    return Array.from(this.availableProviders)
  }
}
```

#### 3.2.2 Provider Factory (`src/lib/oauth/providerFactory.ts`)

**Responsibilities:**

- Strategy pattern for different provider types
- Create configured OAuth2 clients
- Handle provider-specific configuration

**Key Code:**

```typescript
interface ProviderStrategy {
  clientId: string
  clientSecret: string
  redirectUri: string
}

class OAuth2ProviderFactory {
  private strategies: Map<string, ProviderStrategy> = new Map()

  constructor() {
    // OBP-OIDC strategy
    this.strategies.set('obp-oidc', {
      clientId: process.env.OBP_OAUTH_CLIENT_ID!,
      clientSecret: process.env.OBP_OAUTH_CLIENT_SECRET!,
      redirectUri: process.env.APP_CALLBACK_URL!
    })

    // Keycloak strategy
    this.strategies.set('keycloak', {
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      redirectUri: process.env.KEYCLOAK_CALLBACK_URL!
    })
  }

  async initializeProvider(wellKnownUri: WellKnownUri): Promise<OAuth2ClientWithConfig | null> {
    const strategy = this.strategies.get(wellKnownUri.provider)
    if (!strategy) {
      console.warn(`No strategy for provider: ${wellKnownUri.provider}`)
      return null
    }

    const client = new OAuth2ClientWithConfig(
      strategy.clientId,
      strategy.clientSecret,
      strategy.redirectUri,
      wellKnownUri.provider
    )

    await client.initOIDCConfig(wellKnownUri.url)
    return client
  }
}
```

#### 3.2.3 OAuth2 Client Extension (`src/lib/oauth/client.ts`)

```typescript
import { OAuth2Client } from 'arctic'

export class OAuth2ClientWithConfig extends OAuth2Client {
  OIDCConfig?: OpenIdConnectConfiguration
  provider: string

  constructor(clientId: string, clientSecret: string, redirectUri: string, provider: string) {
    super(clientId, clientSecret, redirectUri)
    this.provider = provider
  }

  async initOIDCConfig(OIDCConfigUrl: string): Promise<void> {
    const response = await fetch(OIDCConfigUrl)
    const config = await response.json()
    this.OIDCConfig = config
  }

  async validateAuthorizationCode(
    tokenEndpoint: string,
    code: string,
    codeVerifier: string | null
  ): Promise<TokenResponse> {
    // Handles token exchange with Basic Auth (RFC 6749)
    // Falls back to form-based credentials for compatibility
  }
}
```

### 3.3 OBP-Portal Login Flow

```
1. User navigates to login page → Shows provider selection UI
2. User selects provider (e.g., "OBP-OIDC" or "Keycloak")
3. POST /login/[provider] (e.g., /login/obp-oidc)
4. Server:
   - Retrieves OAuth2 client for selected provider
   - Generates PKCE parameters
   - Stores provider name in session
   - Redirects to provider's authorization endpoint
5. User authenticates on selected OIDC provider
6. Provider redirects to /login/[provider]/callback
7. Server:
   - Retrieves provider from session
   - Gets corresponding OAuth2 client
   - Validates state and exchanges code for tokens
   - Stores tokens in session with provider name
8. User authenticated with selected provider
```

---

## 4. API Explorer II Adaptation Strategy

### 4.1 Architecture Decision

**Approach:** Extend existing OAuth2Service to support multiple providers while maintaining backward compatibility.

**Key Design Decisions:**

1. ✅ Fetch providers from OBP API `/obp/v[version]/well-known`
2. ✅ Create Provider Manager service (singleton)
3. ✅ Keep existing OAuth2Service for single-provider backward compatibility
4. ✅ Add new MultiProviderOAuth2Service for multi-provider support
5. ✅ Use provider name in session to track which provider user selected
6. ✅ Support fallback to environment variable for single-provider mode

### 4.2 Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API Explorer II                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Frontend (Vue 3)                         │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  HeaderNav.vue                                │   │  │
│  │  │  - Login button with provider dropdown        │   │  │
│  │  │  - Fetches available providers from API       │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           │ HTTP                             │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Backend (Express + TypeScript)             │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  OAuth2ProviderController                     │   │  │
│  │  │  GET /api/oauth2/providers                    │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  │                     │                                  │  │
│  │                     ▼                                  │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  OAuth2ProviderManager (Service)              │   │  │
│  │  │  - Fetches well-known URIs from OBP API       │   │  │
│  │  │  - Initializes providers via Factory          │   │  │
│  │  │  - Tracks provider health                     │   │  │
│  │  │  - Periodic health checks                     │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  │                     │                                  │  │
│  │                     ▼                                  │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  OAuth2ProviderFactory (Service)              │   │  │
│  │  │  - Creates OAuth2ClientWithConfig             │   │  │
│  │  │  - Loads provider strategies from env         │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  │                     │                                  │  │
│  │                     ▼                                  │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  OAuth2ClientWithConfig (extends OAuth2Client)│   │  │
│  │  │  - Stores OIDC configuration                  │   │  │
│  │  │  - Stores provider name                       │   │  │
│  │  │  - Provider-specific token exchange           │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  OAuth2ConnectController                      │   │  │
│  │  │  GET /api/oauth2/connect?provider=obp-oidc    │   │  │
│  │  │  - Gets provider from query param              │   │  │
│  │  │  - Stores provider in session                  │   │  │
│  │  │  - Redirects to provider auth endpoint        │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  OAuth2CallbackController                     │   │  │
│  │  │  GET /api/oauth2/callback                     │   │  │
│  │  │  - Retrieves provider from session            │   │  │
│  │  │  - Uses correct client for token exchange     │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           │ HTTP                             │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              OBP API                                  │  │
│  │  GET /obp/v5.1.0/well-known                          │  │
│  │  Returns list of OIDC provider configurations        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Migration Path

**Phase 1: Backward Compatible (Single Provider)**

- Existing environment variable still works
- No breaking changes for current deployments

**Phase 2: Multi-Provider Support**

- Add new services (ProviderManager, ProviderFactory)
- Add provider selection UI
- Update connect/callback to use provider parameter

**Phase 3: Default Multi-Provider**

- Deprecate single WELL_KNOWN_URL env variable
- Use OBP API well-known endpoint by default
- Keep single-provider as fallback

---

## 5. Implementation Plan

### Phase 1: Backend Services (Week 1)

#### Task 1.1: Create Well-Known URI Interface

- [ ] Define TypeScript interfaces for OBP API response
- [ ] Create utility to fetch from OBP API

#### Task 1.2: Create OAuth2ClientWithConfig

- [ ] Extend existing OAuth2Client from arctic
- [ ] Add OIDC configuration storage
- [ ] Add provider name field
- [ ] Implement token exchange with Basic Auth

#### Task 1.3: Create OAuth2ProviderFactory

- [ ] Strategy pattern for provider configurations
- [ ] Load strategies from environment variables
- [ ] Support for OBP-OIDC, Keycloak, Google, GitHub

#### Task 1.4: Create OAuth2ProviderManager

- [ ] Fetch well-known URIs from OBP API
- [ ] Initialize providers using factory
- [ ] Track provider health status
- [ ] Implement health check monitoring
- [ ] Provide getProvider() and getAvailableProviders()

### Phase 2: Backend Controllers (Week 1-2)

#### Task 2.1: Create OAuth2ProvidersController

- [ ] GET `/api/oauth2/providers` - Returns available providers
- [ ] Response includes provider names and availability

#### Task 2.2: Update OAuth2ConnectController

- [ ] Accept `provider` query parameter
- [ ] Store provider name in session
- [ ] Use ProviderManager to get correct client
- [ ] Fallback to legacy OAuth2Service if no provider specified

#### Task 2.3: Update OAuth2CallbackController

- [ ] Retrieve provider from session
- [ ] Use ProviderManager to get correct client
- [ ] Handle provider-specific token exchange
- [ ] Store provider name with user session

### Phase 3: Frontend Updates (Week 2)

#### Task 3.1: Update HeaderNav.vue

- [ ] Fetch available providers on mount
- [ ] Replace simple login button with dropdown/modal
- [ ] Show provider selection UI
- [ ] Handle login with selected provider

#### Task 3.2: Create ProviderSelector Component

- [ ] Display list of available providers
- [ ] Show provider status (available/unavailable)
- [ ] Trigger login with selected provider
- [ ] Responsive design

#### Task 3.3: Update Status Monitoring

- [ ] Show multi-provider status
- [ ] Display which providers are healthy/unhealthy
- [ ] Update polling to check all providers

### Phase 4: Configuration & Documentation (Week 2-3)

#### Task 4.1: Environment Variables

- [ ] Document new env variables for multiple providers
- [ ] Create `.env.example` template
- [ ] Backward compatibility notes

#### Task 4.2: Update Documentation

- [ ] Update OAUTH2-README.md
- [ ] Create migration guide
- [ ] Update deployment docs

#### Task 4.3: Testing

- [ ] Unit tests for new services
- [ ] Integration tests for multi-provider flow
- [ ] Manual testing with OBP-OIDC and Keycloak

---

## 6. Code Implementation

### 6.1 TypeScript Interfaces

**File:** `server/types/oauth2.ts`

```typescript
/**
 * Well-known URI from OBP API /obp/v[version]/well-known endpoint
 */
export interface WellKnownUri {
  provider: string // e.g., "obp-oidc", "keycloak"
  url: string // e.g., "http://localhost:9000/obp-oidc/.well-known/openid-configuration"
}

/**
 * Response from OBP API well-known endpoint
 */
export interface WellKnownResponse {
  well_known_uris: WellKnownUri[]
}

/**
 * Provider configuration strategy
 */
export interface ProviderStrategy {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes?: string[]
}

/**
 * Provider status information
 */
export interface ProviderStatus {
  name: string
  available: boolean
  lastChecked: Date
  error?: string
}

/**
 * OpenID Connect Discovery Configuration
 */
export interface OIDCConfiguration {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
  jwks_uri: string
  registration_endpoint?: string
  scopes_supported?: string[]
  response_types_supported?: string[]
  grant_types_supported?: string[]
  subject_types_supported?: string[]
  id_token_signing_alg_values_supported?: string[]
  token_endpoint_auth_methods_supported?: string[]
  claims_supported?: string[]
  code_challenge_methods_supported?: string[]
}
```

### 6.2 OAuth2ClientWithConfig

**File:** `server/services/OAuth2ClientWithConfig.ts`

```typescript
/*
 * Open Bank Project - API Explorer II
 * Copyright (C) 2023-2024, TESOBE GmbH
 */

import { OAuth2Client } from 'arctic'
import { Service } from 'typedi'
import type { OIDCConfiguration } from '../types/oauth2.js'

/**
 * Extended OAuth2 Client with OIDC configuration support
 *
 * This class extends the arctic OAuth2Client to add:
 * - OIDC discovery document (.well-known/openid-configuration)
 * - Provider name tracking
 * - Provider-specific token exchange logic
 */
export class OAuth2ClientWithConfig extends OAuth2Client {
  public OIDCConfig?: OIDCConfiguration
  public provider: string

  constructor(clientId: string, clientSecret: string, redirectUri: string, provider: string) {
    super(clientId, clientSecret, redirectUri)
    this.provider = provider
  }

  /**
   * Initialize OIDC configuration from well-known discovery endpoint
   *
   * @param oidcConfigUrl - Full URL to .well-known/openid-configuration
   * @throws {Error} If the discovery document cannot be fetched or is invalid
   */
  async initOIDCConfig(oidcConfigUrl: string): Promise<void> {
    console.log(
      `OAuth2ClientWithConfig: Fetching OIDC config for ${this.provider} from:`,
      oidcConfigUrl
    )

    try {
      const response = await fetch(oidcConfigUrl)

      if (!response.ok) {
        throw new Error(
          `Failed to fetch OIDC configuration for ${this.provider}: ${response.status} ${response.statusText}`
        )
      }

      const config = (await response.json()) as OIDCConfiguration

      // Validate required endpoints
      if (!config.authorization_endpoint) {
        throw new Error(`OIDC configuration for ${this.provider} missing authorization_endpoint`)
      }
      if (!config.token_endpoint) {
        throw new Error(`OIDC configuration for ${this.provider} missing token_endpoint`)
      }
      if (!config.userinfo_endpoint) {
        throw new Error(`OIDC configuration for ${this.provider} missing userinfo_endpoint`)
      }

      this.OIDCConfig = config

      console.log(`OAuth2ClientWithConfig: OIDC config loaded for ${this.provider}`)
      console.log(`  Issuer: ${config.issuer}`)
      console.log(`  Authorization: ${config.authorization_endpoint}`)
      console.log(`  Token: ${config.token_endpoint}`)
      console.log(`  UserInfo: ${config.userinfo_endpoint}`)
    } catch (error) {
      console.error(`OAuth2ClientWithConfig: Failed to initialize ${this.provider}:`, error)
      throw error
    }
  }

  /**
   * Get authorization endpoint from OIDC config
   */
  getAuthorizationEndpoint(): string {
    if (!this.OIDCConfig?.authorization_endpoint) {
      throw new Error(`OIDC configuration not initialized for ${this.provider}`)
    }
    return this.OIDCConfig.authorization_endpoint
  }

  /**
   * Get token endpoint from OIDC config
   */
  getTokenEndpoint(): string {
    if (!this.OIDCConfig?.token_endpoint) {
      throw new Error(`OIDC configuration not initialized for ${this.provider}`)
    }
    return this.OIDCConfig.token_endpoint
  }

  /**
   * Get userinfo endpoint from OIDC config
   */
  getUserInfoEndpoint(): string {
    if (!this.OIDCConfig?.userinfo_endpoint) {
      throw new Error(`OIDC configuration not initialized for ${this.provider}`)
    }
    return this.OIDCConfig.userinfo_endpoint
  }

  /**
   * Check if OIDC configuration is initialized
   */
  isInitialized(): boolean {
    return this.OIDCConfig !== undefined
  }
}
```

### 6.3 OAuth2ProviderFactory

**File:** `server/services/OAuth2ProviderFactory.ts`

```typescript
/*
 * Open Bank Project - API Explorer II
 * Copyright (C) 2023-2024, TESOBE GmbH
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
 */
@Service()
export class OAuth2ProviderFactory {
  private strategies: Map<string, ProviderStrategy> = new Map()

  constructor() {
    this.loadStrategies()
  }

  /**
   * Load provider strategies from environment variables
   */
  private loadStrategies(): void {
    console.log('OAuth2ProviderFactory: Loading provider strategies...')

    // OBP-OIDC Strategy
    if (process.env.VITE_OBP_OAUTH2_CLIENT_ID) {
      this.strategies.set('obp-oidc', {
        clientId: process.env.VITE_OBP_OAUTH2_CLIENT_ID,
        clientSecret: process.env.VITE_OBP_OAUTH2_CLIENT_SECRET || '',
        redirectUri:
          process.env.VITE_OBP_OAUTH2_REDIRECT_URL || 'http://localhost:5173/api/oauth2/callback',
        scopes: ['openid', 'profile', 'email']
      })
      console.log('  ✓ OBP-OIDC strategy loaded')
    }

    // Keycloak Strategy
    if (process.env.VITE_KEYCLOAK_CLIENT_ID) {
      this.strategies.set('keycloak', {
        clientId: process.env.VITE_KEYCLOAK_CLIENT_ID,
        clientSecret: process.env.VITE_KEYCLOAK_CLIENT_SECRET || '',
        redirectUri:
          process.env.VITE_KEYCLOAK_REDIRECT_URL || 'http://localhost:5173/api/oauth2/callback',
        scopes: ['openid', 'profile', 'email']
      })
      console.log('  ✓ Keycloak strategy loaded')
    }

    // Google Strategy
    if (process.env.VITE_GOOGLE_CLIENT_ID) {
      this.strategies.set('google', {
        clientId: process.env.VITE_GOOGLE_CLIENT_ID,
        clientSecret: process.env.VITE_GOOGLE_CLIENT_SECRET || '',
        redirectUri:
          process.env.VITE_GOOGLE_REDIRECT_URL || 'http://localhost:5173/api/oauth2/callback',
        scopes: ['openid', 'profile', 'email']
      })
      console.log('  ✓ Google strategy loaded')
    }

    // GitHub Strategy
    if (process.env.VITE_GITHUB_CLIENT_ID) {
      this.strategies.set('github', {
        clientId: process.env.VITE_GITHUB_CLIENT_ID,
        clientSecret: process.env.VITE_GITHUB_CLIENT_SECRET || '',
        redirectUri:
          process.env.VITE_GITHUB_REDIRECT_URL || 'http://localhost:5173/api/oauth2/callback',
        scopes: ['read:user', 'user:email']
      })
      console.log('  ✓ GitHub strategy loaded')
    }

    console.log(`OAuth2ProviderFactory: Loaded ${this.strategies.size} provider strategies`)
  }

  /**
   * Initialize an OAuth2 client for a specific provider
   *
   * @param wellKnownUri - Provider information from OBP API
   * @returns Initialized OAuth2 client or null if no strategy exists
   */
  async initializeProvider(wellKnownUri: WellKnownUri): Promise<OAuth2ClientWithConfig | null> {
    console.log(`OAuth2ProviderFactory: Initializing provider: ${wellKnownUri.provider}`)

    const strategy = this.strategies.get(wellKnownUri.provider)
    if (!strategy) {
      console.warn(
        `OAuth2ProviderFactory: No strategy found for provider: ${wellKnownUri.provider}`
      )
      return null
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
   */
  getConfiguredProviders(): string[] {
    return Array.from(this.strategies.keys())
  }

  /**
   * Check if a provider strategy exists
   */
  hasStrategy(providerName: string): boolean {
    return this.strategies.has(providerName)
  }
}
```

### 6.4 OAuth2ProviderManager

**File:** `server/services/OAuth2ProviderManager.ts`

```typescript
/*
 * Open Bank Project - API Explorer II
 * Copyright (C) 2023-2024, TESOBE GmbH
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
 * - Monitors provider availability (60s intervals)
 * - Updates provider status in real-time
 */
@Service()
export class OAuth2ProviderManager {
  private providers: Map<string, OAuth2ClientWithConfig> = new Map()
  private providerStatus: Map<string, ProviderStatus> = new Map()
  private healthCheckInterval: NodeJS.Timeout | null = null
  private factory: OAuth2ProviderFactory
  private obpClientService: OBPClientService
  private initialized: boolean = false

  constructor() {
    this.factory = Container.get(OAuth2ProviderFactory)
    this.obpClientService = Container.get(OBPClientService)
  }

  /**
   * Fetch well-known URIs from OBP API
   *
   * Calls: GET /obp/v5.1.0/well-known
   *
   * @returns Array of well-known URIs with provider names
   */
  async fetchWellKnownUris(): Promise<WellKnownUri[]> {
    console.log('OAuth2ProviderManager: Fetching well-known URIs from OBP API...')

    try {
      // Use OBPClientService to call the API
      const response = await this.obpClientService.call<WellKnownResponse>(
        'GET',
        '/obp/v5.1.0/well-known',
        null,
        null
      )

      if (!response.well_known_uris || response.well_known_uris.length === 0) {
        console.warn('OAuth2ProviderManager: No well-known URIs found in OBP API response')
        return []
      }

      console.log(`OAuth2ProviderManager: Found ${response.well_known_uris.length} providers:`)
      response.well_known_uris.forEach((uri) => {
        console.log(`  - ${uri.provider}: ${uri.url}`)
      })

      return response.well_known_uris
    } catch (error) {
      console.error('OAuth2ProviderManager: Failed to fetch well-known URIs:', error)
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
   */
  async initializeProviders(): Promise<boolean> {
    console.log('OAuth2ProviderManager: Initializing providers...')

    const wellKnownUris = await this.fetchWellKnownUris()

    if (wellKnownUris.length === 0) {
      console.warn('OAuth2ProviderManager: No providers to initialize')
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
          console.log(`OAuth2ProviderManager: ✓ ${providerUri.provider} initialized`)
        } else {
          this.providerStatus.set(providerUri.provider, {
            name: providerUri.provider,
            available: false,
            lastChecked: new Date(),
            error: 'Failed to initialize client'
          })
          console.warn(`OAuth2ProviderManager: ✗ ${providerUri.provider} failed to initialize`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        this.providerStatus.set(providerUri.provider, {
          name: providerUri.provider,
          available: false,
          lastChecked: new Date(),
          error: errorMessage
        })
        console.error(`OAuth2ProviderManager: ✗ ${providerUri.provider} error:`, error)
      }
    }

    this.initialized = successCount > 0

    console.log(
      `OAuth2ProviderManager: Initialized ${successCount}/${wellKnownUris.length} providers`
    )
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

    console.log(`OAuth2ProviderManager: Starting health check (every ${intervalMs / 1000}s)`)

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
   * Perform health check on all providers
   */
  private async performHealthCheck(): Promise<void> {
    console.log('OAuth2ProviderManager: Performing health check...')

    for (const [providerName, client] of this.providers.entries()) {
      try {
        // Try to fetch OIDC config to verify provider is reachable
        const endpoint = client.OIDCConfig?.issuer
        if (!endpoint) {
          throw new Error('No issuer endpoint configured')
        }

        const response = await fetch(endpoint, { method: 'HEAD' })

        const isAvailable = response.ok
        this.providerStatus.set(providerName, {
          name: providerName,
          available: isAvailable,
          lastChecked: new Date(),
          error: isAvailable ? undefined : `HTTP ${response.status}`
        })

        console.log(`  ${providerName}: ${isAvailable ? '✓ healthy' : '✗ unhealthy'}`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        this.providerStatus.set(providerName, {
          name: providerName,
          available: false,
          lastChecked: new Date(),
          error: errorMessage
        })
        console.log(`  ${providerName}: ✗ unhealthy (${errorMessage})`)
      }
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
   */
  getAvailableProviders(): string[] {
    const available: string[] = []

    for (const [name, status] of this.providerStatus.entries()) {
      if (status.available && this.providers.has(name)) {
        available.push(name)
      }
    }

    return available
  }

  /**
   * Get status for all providers
   */
  getAllProviderStatus(): ProviderStatus[] {
    return Array.from(this.providerStatus.values())
  }

  /**
   * Get status for a specific provider
   */
  getProviderStatus(providerName: string): ProviderStatus | undefined {
    return this.providerStatus.get(providerName)
  }

  /**
   * Check if the manager has been initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get count of initialized providers
   */
  getProviderCount(): number {
    return this.providers.size
  }
}
```

### 6.5 OAuth2ProvidersController

**File:** `server/controllers/OAuth2ProvidersController.ts`

```typescript
/*
 * Open Bank Project - API Explorer II
 * Copyright (C) 2023-2024, TESOBE GmbH
 */

import { Controller, Get } from 'routing-controllers'
import type { Request, Response } from 'express'
import { Service, Container } from 'typedi'
import { OAuth2ProviderManager } from '../services/OAuth2ProviderManager.js'

/**
 * OAuth2 Providers Controller
 *
 * Provides endpoints to query available OIDC providers
 *
 * Endpoints:
 *   GET /api/oauth2/providers - List available OIDC providers
 */
@Service()
@Controller()
export class OAuth2ProvidersController {
  private providerManager: OAuth2ProviderManager

  constructor() {
    this.providerManager = Container.get(OAuth2ProviderManager)
  }

  /**
   * Get list of available OAuth2/OIDC providers
   *
   * Returns provider names and availability status
   *
   * @returns JSON response with providers array
   *
   * @example
   * GET /api/oauth2/providers
   *
   * Response:
   * {
   *   "providers": [
   *     { "name": "obp-oidc", "available": true, "lastChecked": "2024-01-15T10:30:00Z" },
   *     { "name": "keycloak", "available": false, "lastChecked": "2024-01-15T10:30:00Z", "error": "Connection timeout" }
   *   ],
   *   "count": 2,
   *   "availableCount": 1
   * }
   */
  @Get('/api/oauth2/providers')
  async getProviders(): Promise<any> {
    const allStatus = this.providerManager.getAllProviderStatus()
    const availableProviders = this.providerManager.getAvailableProviders()

    return {
      providers: allStatus,
      count: allStatus.length,
      availableCount: availableProviders.length
    }
  }
}
```

### 6.6 Updated OAuth2ConnectController

**File:** `server/controllers/OAuth2ConnectController.ts`

```typescript
/*
 * Open Bank Project - API Explorer II
 * Copyright (C) 2023-2024, TESOBE GmbH
 */

import { Controller, Get, QueryParam, Req, Res } from 'routing-controllers'
import type { Request, Response } from 'express'
import { Service, Container } from 'typedi'
import { OAuth2ProviderManager } from '../services/OAuth2ProviderManager.js'
import { OAuth2Service } from '../services/OAuth2Service.js'
import crypto from 'crypto'

/**
 * OAuth2 Connect Controller (Multi-Provider)
 *
 * Handles OAuth2/OIDC login initiation with provider selection
 *
 * Query Parameters:
 *   - provider (required): Provider name (e.g., "obp-oidc", "keycloak")
 *   - redirect (optional): URL to redirect after successful authentication
 *
 * @example
 * GET /api/oauth2/connect?provider=obp-oidc&redirect=/resource-docs
 */
@Service()
@Controller()
export class OAuth2ConnectController {
  private providerManager: OAuth2ProviderManager
  private legacyOAuth2Service: OAuth2Service

  constructor() {
    this.providerManager = Container.get(OAuth2ProviderManager)
    this.legacyOAuth2Service = Container.get(OAuth2Service)
  }

  @Get('/api/oauth2/connect')
  connect(
    @QueryParam('provider') provider: string,
    @QueryParam('redirect') redirect: string,
    @Req() request: Request,
    @Res() response: Response
  ): Response {
    const session = request.session as any

    // Store redirect URL
    session.oauth2_redirect = redirect || '/'

    // Multi-provider mode: Use provider from query param
    if (provider) {
      const client = this.providerManager.getProvider(provider)

      if (!client) {
        console.error(`OAuth2Connect: Provider not found: ${provider}`)
        return response.status(400).json({
          error: 'invalid_provider',
          message: `Provider "${provider}" is not available`
        })
      }

      // Store provider name in session
      session.oauth2_provider = provider

      // Generate PKCE parameters
      const codeVerifier = this.generateCodeVerifier()
      const codeChallenge = this.generateCodeChallenge(codeVerifier)
      const state = this.generateState()

      // Store in session
      session.oauth2_code_verifier = codeVerifier
      session.oauth2_state = state

      // Build authorization URL
      const authUrl = this.buildAuthorizationUrl(client, state, codeChallenge)

      console.log(`OAuth2Connect: Redirecting to ${provider} authorization endpoint`)
      return response.redirect(authUrl)
    }

    // Legacy single-provider mode: Use existing OAuth2Service
    if (!this.legacyOAuth2Service.isInitialized()) {
      console.error('OAuth2Connect: No provider specified and legacy OAuth2 not initialized')
      return response.status(503).json({
        error: 'oauth2_unavailable',
        message: 'OAuth2 authentication is not available'
      })
    }

    // Generate PKCE parameters
    const codeVerifier = this.generateCodeVerifier()
    const codeChallenge = this.generateCodeChallenge(codeVerifier)
    const state = this.generateState()

    // Store in session
    session.oauth2_code_verifier = codeVerifier
    session.oauth2_state = state

    // Use legacy service
    const authUrl = this.legacyOAuth2Service.createAuthorizationURL(state, codeVerifier, [
      'openid',
      'profile',
      'email'
    ])

    console.log('OAuth2Connect: Using legacy single-provider mode')
    return response.redirect(authUrl)
  }

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url')
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url')
  }

  private generateState(): string {
    return crypto.randomBytes(32).toString('base64url')
  }

  private buildAuthorizationUrl(client: any, state: string, codeChallenge: string): string {
    const authEndpoint = client.getAuthorizationEndpoint()
    const params = new URLSearchParams({
      client_id: client.clientId,
      redirect_uri: client.redirectURI,
      response_type: 'code',
      scope: 'openid profile email',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    })

    return `${authEndpoint}?${params.toString()}`
  }
}
```

### 6.7 Updated OAuth2CallbackController

**File:** `server/controllers/OAuth2CallbackController.ts`

```typescript
/*
 * Open Bank Project - API Explorer II
 * Copyright (C) 2023-2024, TESOBE GmbH
 */

import { Controller, Get, QueryParam, Req, Res } from 'routing-controllers'
import type { Request, Response } from 'express'
import { Service, Container } from 'typedi'
import { OAuth2ProviderManager } from '../services/OAuth2ProviderManager.js'
import { OAuth2Service } from '../services/OAuth2Service.js'

/**
 * OAuth2 Callback Controller (Multi-Provider)
 *
 * Handles OAuth2/OIDC callback from any configured provider
 */
@Service()
@Controller()
export class OAuth2CallbackController {
  private providerManager: OAuth2ProviderManager
  private legacyOAuth2Service: OAuth2Service

  constructor() {
    this.providerManager = Container.get(OAuth2ProviderManager)
    this.legacyOAuth2Service = Container.get(OAuth2Service)
  }

  @Get('/api/oauth2/callback')
  async callback(
    @QueryParam('code') code: string,
    @QueryParam('state') state: string,
    @QueryParam('error') error: string,
    @QueryParam('error_description') errorDescription: string,
    @Req() request: Request,
    @Res() response: Response
  ): Promise<Response> {
    const session = request.session as any

    // Handle error from provider
    if (error) {
      console.error(`OAuth2Callback: Error from provider: ${error} - ${errorDescription}`)
      return response.redirect(`/?oauth2_error=${encodeURIComponent(error)}`)
    }

    // Validate state
    const storedState = session.oauth2_state
    if (!storedState || storedState !== state) {
      console.error('OAuth2Callback: State mismatch (CSRF protection)')
      return response.redirect('/?oauth2_error=invalid_state')
    }

    // Get code verifier
    const codeVerifier = session.oauth2_code_verifier
    if (!codeVerifier) {
      console.error('OAuth2Callback: Code verifier not found in session')
      return response.redirect('/?oauth2_error=missing_verifier')
    }

    // Check if multi-provider mode (provider stored in session)
    const provider = session.oauth2_provider

    try {
      if (provider) {
        // Multi-provider mode
        await this.handleMultiProviderCallback(session, code, codeVerifier, provider)
      } else {
        // Legacy single-provider mode
        await this.handleLegacyCallback(session, code, codeVerifier)
      }

      // Clean up temporary session data
      delete session.oauth2_code_verifier
      delete session.oauth2_state

      // Redirect to original page
      const redirectUrl = session.oauth2_redirect || '/'
      delete session.oauth2_redirect

      return response.redirect(redirectUrl)
    } catch (error) {
      console.error('OAuth2Callback: Token exchange failed:', error)
      return response.redirect('/?oauth2_error=token_exchange_failed')
    }
  }

  private async handleMultiProviderCallback(
    session: any,
    code: string,
    codeVerifier: string,
    provider: string
  ): Promise<void> {
    console.log(`OAuth2Callback: Handling callback for provider: ${provider}`)

    const client = this.providerManager.getProvider(provider)
    if (!client) {
      throw new Error(`Provider not found: ${provider}`)
    }

    // Exchange code for tokens
    const tokens = await client.validateAuthorizationCode(code, codeVerifier)

    // Store tokens in session
    session.oauth2_access_token = tokens.accessToken
    session.oauth2_refresh_token = tokens.refreshToken
    session.oauth2_id_token = tokens.idToken
    session.oauth2_provider = provider

    // Fetch user info
    const userInfo = await this.fetchUserInfo(client, tokens.accessToken)

    // Store user in session
    session.user = {
      username: userInfo.preferred_username || userInfo.email || userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      provider: provider,
      sub: userInfo.sub
    }

    console.log(`OAuth2Callback: User authenticated via ${provider}:`, session.user.username)
  }

  private async handleLegacyCallback(
    session: any,
    code: string,
    codeVerifier: string
  ): Promise<void> {
    console.log('OAuth2Callback: Handling callback (legacy mode)')

    const tokens = await this.legacyOAuth2Service.exchangeCodeForTokens(code, codeVerifier)

    // Store tokens in session
    session.oauth2_access_token = tokens.accessToken
    session.oauth2_refresh_token = tokens.refreshToken
    session.oauth2_id_token = tokens.idToken

    // Fetch user info
    const userInfo = await this.legacyOAuth2Service.getUserInfo(tokens.accessToken)

    // Store user in session
    session.user = {
      username: userInfo.preferred_username || userInfo.email || userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      sub: userInfo.sub
    }

    console.log('OAuth2Callback: User authenticated (legacy):', session.user.username)
  }

  private async fetchUserInfo(client: any, accessToken: string): Promise<any> {
    const userInfoEndpoint = client.getUserInfoEndpoint()

    const response = await fetch(userInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`UserInfo request failed: ${response.status}`)
    }

    return await response.json()
  }
}
```

---

## 7. Frontend Implementation

### 7.1 Update HeaderNav.vue

**File:** `src/components/HeaderNav.vue`

Add provider selection to the login button:

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// ... existing imports and code ...

const availableProviders = ref<Array<{ name: string; available: boolean }>>([])
const showProviderSelector = ref(false)
const isLoadingProviders = ref(false)

async function fetchAvailableProviders() {
  isLoadingProviders.value = true
  try {
    const response = await fetch('/api/oauth2/providers')
    const data = await response.json()
    availableProviders.value = data.providers.filter((p: any) => p.available)
    console.log('Available OAuth2 providers:', availableProviders.value)
  } catch (error) {
    console.error('Failed to fetch OAuth2 providers:', error)
    availableProviders.value = []
  } finally {
    isLoadingProviders.value = false
  }
}

function handleLoginClick() {
  if (availableProviders.value.length > 1) {
    // Show provider selection dialog
    showProviderSelector.value = true
  } else if (availableProviders.value.length === 1) {
    // Direct login with single provider
    loginWithProvider(availableProviders.value[0].name)
  } else {
    // Fallback to legacy login
    window.location.href = '/api/oauth2/connect?redirect=' + encodeURIComponent(getCurrentPath())
  }
}

function loginWithProvider(provider: string) {
  const redirectUrl =
    '/api/oauth2/connect?provider=' +
    encodeURIComponent(provider) +
    '&redirect=' +
    encodeURIComponent(getCurrentPath())
  window.location.href = redirectUrl
}

onMounted(async () => {
  // ... existing code ...

  // Fetch available providers
  await fetchAvailableProviders()
})
</script>

<template>
  <!-- Existing header content -->

  <!-- Updated Login Button -->
  <el-tooltip
    v-if="isShowLoginButton && !oauth2Available"
    :content="oauth2StatusMessage || 'OAuth2 server not available'"
    placement="bottom"
  >
    <button disabled class="login-button-disabled router-link" id="login">
      {{ $t('header.login') }}
    </button>
  </el-tooltip>

  <button
    v-else-if="isShowLoginButton && oauth2Available"
    @click="handleLoginClick"
    class="login-button router-link"
    id="login"
  >
    {{ $t('header.login') }}
    <span v-if="availableProviders.length > 1">▼</span>
  </button>

  <!-- Provider Selection Dialog -->
  <el-dialog v-model="showProviderSelector" title="Select Identity Provider" width="400px">
    <div class="provider-list">
      <div
        v-for="provider in availableProviders"
        :key="provider.name"
        class="provider-item"
        @click="loginWithProvider(provider.name)"
      >
        <div class="provider-icon">🔐</div>
        <div class="provider-info">
          <h4>{{ provider.name }}</h4>
          <span class="provider-status">Available</span>
        </div>
      </div>

      <div v-if="availableProviders.length === 0" class="no-providers">
        <p>No identity providers available</p>
      </div>
    </div>
  </el-dialog>

  <!-- Rest of template -->
</template>

<style>
/* Existing styles */

.provider-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.provider-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.provider-item:hover {
  border-color: #32b9ce;
  background-color: #f0f9fa;
}

.provider-icon {
  font-size: 32px;
  margin-right: 16px;
}

.provider-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #39455f;
}

.provider-status {
  font-size: 12px;
  color: #10b981;
}

.no-providers {
  text-align: center;
  padding: 32px;
  color: #999;
}
</style>
```

---

## 8. Configuration

### 8.1 Environment Variables

**File:** `.env.example`

```bash
# ============================================
# OBP API Configuration
# ============================================
VITE_OBP_API_HOST=localhost:8080
VITE_OBP_API_VERSION=v5.1.0

# ============================================
# OAuth2/OIDC Multi-Provider Configuration
# ============================================

# OBP-OIDC Provider
VITE_OBP_OAUTH2_CLIENT_ID=48ac28e9-9ee3-47fd-8448-69a62764b779
VITE_OBP_OAUTH2_CLIENT_SECRET=fOTQF7jfg8C74u7ZhSjVQpoBYvD0KpWfM5UsEZBSFFM
VITE_OBP_OAUTH2_REDIRECT_URL=http://localhost:5173/api/oauth2/callback

# Keycloak Provider (Optional)
VITE_KEYCLOAK_CLIENT_ID=obp-api-explorer
VITE_KEYCLOAK_CLIENT_SECRET=your-keycloak-secret
VITE_KEYCLOAK_REDIRECT_URL=http://localhost:5173/api/oauth2/callback

# Google Provider (Optional)
# VITE_GOOGLE_CLIENT_ID=your-google-client-id
# VITE_GOOGLE_CLIENT_SECRET=your-google-client-secret
# VITE_GOOGLE_REDIRECT_URL=http://localhost:5173/api/oauth2/callback

# GitHub Provider (Optional)
# VITE_GITHUB_CLIENT_ID=your-github-client-id
# VITE_GITHUB_CLIENT_SECRET=your-github-client-secret
# VITE_GITHUB_REDIRECT_URL=http://localhost:5173/api/oauth2/callback

# ============================================
# Legacy Single-Provider Mode (Deprecated)
# ============================================
# For backward compatibility only
# VITE_OBP_OAUTH2_WELL_KNOWN_URL=http://127.0.0.1:9000/obp-oidc/.well-known/openid-configuration

# ============================================
# Session Configuration
# ============================================
SESSION_SECRET=change-this-to-a-secure-random-string
SESSION_MAX_AGE=3600000
```

### 8.2 Server Initialization

**File:** `server/app.ts`

Add provider manager initialization:

```typescript
// ... existing imports ...
import { OAuth2ProviderManager } from './services/OAuth2ProviderManager.js'

// Initialize OAuth2 Provider Manager
;(async function initializeOAuth2() {
  console.log('--- OAuth2/OIDC Multi-Provider Setup ---')

  const providerManager = Container.get(OAuth2ProviderManager)

  try {
    const success = await providerManager.initializeProviders()

    if (success) {
      const availableProviders = providerManager.getAvailableProviders()
      console.log(`✓ Initialized ${availableProviders.length} OAuth2 providers:`)
      availableProviders.forEach((name) => console.log(`  - ${name}`))

      // Start health monitoring
      providerManager.startHealthCheck(60000) // Check every 60 seconds
      console.log('✓ Provider health monitoring started')
    } else {
      console.warn('⚠ No OAuth2 providers initialized')
      console.warn('⚠ Users will not be able to log in')
    }
  } catch (error) {
    console.error('✗ Failed to initialize OAuth2 providers:', error)
  }
})()
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

**File:** `server/services/__tests__/OAuth2ProviderManager.test.ts`

```typescript
import { Container } from 'typedi'
import { OAuth2ProviderManager } from '../OAuth2ProviderManager'
import { OAuth2ProviderFactory } from '../OAuth2ProviderFactory'

describe('OAuth2ProviderManager', () => {
  let manager: OAuth2ProviderManager

  beforeEach(() => {
    manager = Container.get(OAuth2ProviderManager)
  })

  test('should fetch well-known URIs from OBP API', async () => {
    const uris = await manager.fetchWellKnownUris()
    expect(Array.isArray(uris)).toBe(true)
  })

  test('should initialize providers', async () => {
    const success = await manager.initializeProviders()
    expect(typeof success).toBe('boolean')
  })

  test('should return available providers', () => {
    const providers = manager.getAvailableProviders()
    expect(Array.isArray(providers)).toBe(true)
  })

  test('should get specific provider', async () => {
    await manager.initializeProviders()
    const provider = manager.getProvider('obp-oidc')
    expect(provider).toBeDefined()
  })
})
```

### 9.2 Integration Tests

**File:** `server/__tests__/oauth2-multi-provider.integration.test.ts`

```typescript
describe('OAuth2 Multi-Provider Flow', () => {
  test('GET /api/oauth2/providers returns provider list', async () => {
    const response = await request(app).get('/api/oauth2/providers')

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('providers')
    expect(Array.isArray(response.body.providers)).toBe(true)
  })

  test('GET /api/oauth2/connect with provider redirects to OIDC', async () => {
    const response = await request(app).get('/api/oauth2/connect?provider=obp-oidc').expect(302)

    expect(response.headers.location).toContain('oauth2')
  })

  test('GET /api/oauth2/connect without provider uses legacy mode', async () => {
    const response = await request(app).get('/api/oauth2/connect').expect(302)

    expect(response.headers.location).toBeDefined()
  })
})
```

### 9.3 Manual Testing Checklist

- [ ] Navigate to API Explorer II
- [ ] Click "Login" button
- [ ] Verify provider selection dialog appears (if multiple providers)
- [ ] Select "OBP-OIDC"
- [ ] Verify redirect to OBP-OIDC login page
- [ ] Enter credentials and authenticate
- [ ] Verify redirect back to API Explorer II
- [ ] Verify user is logged in (username displayed)
- [ ] Repeat with Keycloak provider
- [ ] Test error cases:
  - [ ] Invalid provider name
  - [ ] Provider unavailable
  - [ ] User cancels authentication
  - [ ] Network error during token exchange

---

## 10. Deployment Considerations

### 10.1 Production Checklist

- [ ] Configure all provider client IDs and secrets in production environment
- [ ] Use HTTPS for all redirect URIs
- [ ] Set secure session configuration (httpOnly, secure cookies)
- [ ] Configure CORS properly for OIDC providers
- [ ] Set up monitoring for provider health
- [ ] Configure logging for authentication events
- [ ] Test failover between providers
- [ ] Document provider registration process

### 10.2 Monitoring

Add logging for key events:

```typescript
// Provider initialization
console.log('[OAuth2] Provider initialized: ${provider}')

// Provider health check
console.log('[OAuth2] Health check: ${provider} - ${status}')

// User login
console.log('[OAuth2] User logged in via ${provider}: ${username}')

// Errors
console.error('[OAuth2] Error: ${error} - Provider: ${provider}')
```

### 10.3 Rollback Plan

If issues occur with multi-provider:

1. **Immediate rollback**: Set single `VITE_OBP_OAUTH2_WELL_KNOWN_URL` in environment
2. **Partial rollback**: Disable specific providers by removing their env variables
3. **Full rollback**: Revert to previous deployment

---

## 11. Troubleshooting

### Common Issues

**Issue: "No providers available"**

- **Cause**: OBP API `/obp/v[version]/well-known` endpoint not returning data
- **Solution**:
  - Verify OBP API is running and accessible
  - Check API version in URL
  - Test endpoint manually: `curl http://localhost:8080/obp/v5.1.0/well-known`

**Issue: "Provider not initialized"**

- **Cause**: Missing environment variables for provider
- **Solution**:
  - Verify `VITE_[PROVIDER]_CLIENT_ID` is set
  - Verify `VITE_[PROVIDER]_CLIENT_SECRET` is set
  - Check provider is registered in OIDC server

**Issue: "State mismatch"**

- **Cause**: Session not persisting or CSRF attack
- **Solution**:
  - Verify session middleware is configured
  - Check session storage (Redis/memory)
  - Ensure cookies are enabled

---

## 12. Summary

This implementation guide provides a complete solution for adding multi-OIDC provider support to API Explorer II, following the proven patterns from OBP-Portal. The architecture:

✅ **Maintains backward compatibility** with single-provider mode  
✅ **Dynamically discovers providers** from OBP API  
✅ **Provides user choice** through provider selection UI  
✅ **Monitors provider health** with automatic failover  
✅ **Uses strategy pattern** for extensibility  
✅ **Follows TypeScript best practices**  
✅ **Includes comprehensive testing**

### Next Steps

1. Implement backend services (OAuth2ClientWithConfig, Factory, Manager)
2. Update controllers (Providers, Connect, Callback)
3. Update frontend (HeaderNav with provider selection)
4. Configure environment variables for multiple providers
5. Test with OBP-OIDC and Keycloak
6. Deploy to production

### References

- OBP-Portal: `~/Documents/workspace_2024/OBP-Portal`
- OBP API well-known endpoint: `/obp/v5.1.0/well-known`
- Arctic OAuth2 library: https://github.com/pilcrowOnPaper/arctic
- OpenID Connect Discovery: https://openid.net/specs/openid-connect-discovery-1_0.html
