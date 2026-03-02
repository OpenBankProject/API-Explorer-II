# OAuth2/OIDC Integration Preparation Document

## API Explorer II with OBP-OIDC

**Version:** 1.0  
**Date:** 2024  
**Author:** TESOBE Development Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Target Architecture](#target-architecture)
4. [OBP-OIDC Overview](#obp-oidc-overview)
5. [OBP-Portal Reference Implementation](#obp-portal-reference-implementation)
6. [Implementation Phases](#implementation-phases)
7. [Technical Requirements](#technical-requirements)
8. [Configuration Changes](#configuration-changes)
9. [Code Changes Required](#code-changes-required)
10. [Testing Strategy](#testing-strategy)
11. [Deployment Considerations](#deployment-considerations)
12. [Rollback Plan](#rollback-plan)
13. [References](#references)

---

## 1. Executive Summary

This document outlines the preparation and implementation plan for migrating **API Explorer II** from OAuth 1.0a authentication to OAuth2/OpenID Connect (OIDC) using the **OBP-OIDC** provider. The OBP-Portal serves as the reference implementation for this integration.

### Key Goals

- Replace OAuth 1.0a (`oauth` npm package) with OAuth2/OIDC
- Integrate with OBP-OIDC provider for authentication
- Maintain backward compatibility during transition
- Follow OBP-Portal's proven implementation patterns
- Support multiple OIDC providers (OBP-OIDC, Keycloak, etc.)

### Benefits

- **Modern Authentication**: OAuth2/OIDC is the industry standard
- **Better Security**: Improved token management and refresh mechanisms
- **User Experience**: Single sign-on capabilities
- **Maintainability**: Aligns with OBP ecosystem (Portal, API)
- **Flexibility**: Support for multiple identity providers

---

## 2. Current State Analysis

### 2.1 Current Authentication Flow (OAuth 1.0a)

API Explorer II currently uses OAuth 1.0a with the following flow:

```
User → /api/connect → OauthRequestTokenMiddleware
    → OBP-API /oauth/authorize
    → User Login/Authorization
    → /api/callback → OauthAccessTokenMiddleware
    → Session Storage → Authenticated State
```

### 2.2 Current Implementation Components

#### Backend (Express/TypeScript)

- **Package**: `oauth` (v0.10.0) - OAuth 1.0a library
- **Middlewares**:
  - `OauthRequestTokenMiddleware.ts` - Handles request token generation
  - `OauthAccessTokenMiddleware.ts` - Handles access token exchange
- **Services**:
  - `OauthInjectedService.ts` - OAuth consumer management
  - `OBPClientService.ts` - OBP API client wrapper
- **Controllers**:
  - `ConnectController.ts` - Initiates OAuth flow
  - `CallbackController.ts` - Handles OAuth callback
- **Session Management**: Express-session with Redis store

#### Frontend (Vue 3)

- **Login Flow**: Redirects to `/api/connect?redirect=<current_path>`
- **User State**: Fetched via `getCurrentUser()` API call
- **Components**:
  - `HeaderNav.vue` - Login/Logoff buttons
  - `ChatWidget.vue` - Checks authentication for Opey access
  - `Preview.vue` - Shows login prompts for restricted features

#### Environment Configuration

```bash
VITE_OBP_CONSUMER_KEY=<consumer_key>
VITE_OBP_CONSUMER_SECRET=<consumer_secret>
VITE_OBP_REDIRECT_URL=http://localhost:5173/api/callback
VITE_OBP_API_HOST=http://127.0.0.1:8080
```

### 2.3 Current Limitations

1. **OAuth 1.0a is deprecated** - Industry has moved to OAuth2
2. **No refresh token support** - Users must re-authenticate frequently
3. **Single provider only** - Cannot support multiple identity providers
4. **Complex signature generation** - OAuth 1.0a requires HMAC-SHA1 signatures
5. **Limited ecosystem support** - Most modern services use OAuth2/OIDC

---

## 3. Target Architecture

### 3.1 OAuth2/OIDC Flow

```
User → Login Button → /login/obp → OAuth2 Authorization Endpoint (OBP-OIDC)
    → User Authentication (OBP-OIDC Login Page)
    → Authorization Code → /login/obp/callback
    → Token Exchange → Access Token + Refresh Token + ID Token
    → Session Storage → Authenticated State
```

### 3.2 Key Differences from Current Implementation

| Aspect             | OAuth 1.0a (Current)  | OAuth2/OIDC (Target)                    |
| ------------------ | --------------------- | --------------------------------------- |
| **Flow**           | 3-legged OAuth        | Authorization Code Flow with PKCE       |
| **Tokens**         | Access Token + Secret | Access Token + Refresh Token + ID Token |
| **Token Type**     | Opaque strings        | JWT (JSON Web Tokens)                   |
| **Signatures**     | HMAC-SHA1 per request | Bearer token in header                  |
| **User Info**      | From API calls        | From ID token claims                    |
| **Refresh**        | Not supported         | Refresh token flow                      |
| **Discovery**      | Manual configuration  | `.well-known/openid-configuration`      |
| **Multi-Provider** | No                    | Yes (via provider manager)              |

---

## 4. OBP-OIDC Overview

### 4.1 About OBP-OIDC

**OBP-OIDC** is a bare-bones OpenID Connect provider built with http4s and functional programming in Scala. It's designed specifically for the OBP ecosystem.

- **Repository**: `~/Documents/workspace_2024/OBP-OIDC`
- **Technology**: Scala, http4s, PostgreSQL
- **Purpose**: Development/testing OIDC provider for OBP apps
- **Production Note**: For production, use Keycloak or Hydra

### 4.2 OBP-OIDC Features

✅ **Core OIDC Endpoints**:

- Authorization endpoint: `/obp-oidc/auth`
- Token endpoint: `/obp-oidc/token`
- UserInfo endpoint: `/obp-oidc/userinfo`
- JWKS endpoint: `/obp-oidc/jwks`
- Discovery: `/obp-oidc/.well-known/openid-configuration`

✅ **Supported Flows**:

- Authorization Code Flow
- Client Credentials Flow
- Refresh Token Flow

✅ **Database Integration**:

- Reads from OBP database views
- Authenticates against OBP users (`v_oidc_users`)
- Manages clients via `v_oidc_clients` and `v_oidc_admin_clients`

✅ **Security Features**:

- RS256 JWT signing
- BCrypt password verification
- Configurable token expiration
- PKCE support (recommended)

### 4.3 OBP-OIDC Configuration

Default configuration from `run-server.example.sh`:

```bash
# Server Configuration
OIDC_HOST=localhost
OIDC_PORT=9000

# Explorer II Client (Pre-configured)
OIDC_CLIENT_EXPLORER_ID=obp-explorer-ii-client
OIDC_CLIENT_EXPLORER_SECRET=CHANGE_THIS_TO_EXPLORER_SECRET_2024
OIDC_CLIENT_EXPLORER_REDIRECTS=http://localhost:3001/callback,http://localhost:3001/oauth/callback

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sandbox
OIDC_USER_USERNAME=oidc_user
OIDC_USER_PASSWORD=<secure_password>
```

### 4.4 OBP-OIDC Endpoints

**Discovery Document**:

```
GET http://localhost:9000/obp-oidc/.well-known/openid-configuration
```

**Authorization**:

```
GET http://localhost:9000/obp-oidc/auth
  ?response_type=code
  &client_id=obp-explorer-ii-client
  &redirect_uri=http://localhost:5173/login/obp/callback
  &scope=openid%20profile%20email
  &state=<random_state>
  &code_challenge=<pkce_challenge>
  &code_challenge_method=S256
```

**Token Exchange**:

```
POST http://localhost:9000/obp-oidc/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic <base64(client_id:client_secret)>

grant_type=authorization_code
&code=<auth_code>
&redirect_uri=http://localhost:5173/login/obp/callback
&code_verifier=<pkce_verifier>
```

**UserInfo**:

```
GET http://localhost:9000/obp-oidc/userinfo
Authorization: Bearer <access_token>
```

---

## 5. OBP-Portal Reference Implementation

### 5.1 OBP-Portal Architecture

The OBP-Portal (`~/Documents/workspace_2024/OBP-Portal`) provides the reference implementation using:

- **Framework**: SvelteKit (but patterns are framework-agnostic)
- **OAuth2 Library**: `arctic` - Modern OAuth2/OIDC client
- **Session Management**: `svelte-kit-sessions` with Redis
- **Language**: TypeScript

### 5.2 Key Components from OBP-Portal

#### 5.2.1 OAuth2 Client (`src/lib/oauth/client.ts`)

```typescript
import { OAuth2Client } from 'arctic'

export class OAuth2ClientWithConfig extends OAuth2Client {
  OIDCConfig?: OpenIdConnectConfiguration

  async initOIDCConfig(OIDCConfigUrl: string): Promise<void> {
    // Fetches .well-known/openid-configuration
    const response = await fetch(OIDCConfigUrl)
    const config = await response.json()
    this.OIDCConfig = config
  }

  async validateAuthorizationCode(
    tokenEndpoint: string,
    code: string,
    codeVerifier: string | null
  ): Promise<TokenResponse> {
    // Handles token exchange with Basic Auth
    // Falls back to credentials in body if needed
    // Supports both OBP-OIDC and Keycloak
  }
}
```

**Key Features**:

- Automatic OIDC discovery document parsing
- Basic Authentication for client credentials (RFC 6749)
- Fallback to form-based credentials for compatibility
- Token expiration checking via JWT decoding

#### 5.2.2 Provider Manager (`src/lib/oauth/providerManager.ts`)

```typescript
class OAuth2ProviderManager {
  async fetchWellKnownUris(): Promise<WellKnownUri[]> {
    // Fetches from OBP API: /obp/v5.1.0/well-known
    const response = await obp_requests.get('/obp/v5.1.0/well-known')
    return response.well_known_uris
  }

  async initOauth2Providers() {
    const wellKnownUris = await this.fetchWellKnownUris()

    for (const providerUri of wellKnownUris) {
      const oauth2Client = await oauth2ProviderFactory.initializeProvider(providerUri)
      // Track available/unavailable providers
    }
  }
}
```

**Key Features**:

- Automatic provider discovery from OBP API
- Multi-provider support (OBP-OIDC, Keycloak, etc.)
- Provider status tracking (available/unavailable)
- Automatic retry on initialization failure
- Periodic health checks (60 second intervals)

#### 5.2.3 Provider Factory (`src/lib/oauth/providerFactory.ts`)

```typescript
class OAuth2ProviderFactory {
  private strategies: Map<string, ProviderStrategy>

  async initializeProvider(wellKnownUri: WellKnownUri): Promise<OAuth2ClientWithConfig | null> {
    const strategy = this.strategies.get(wellKnownUri.provider)
    if (!strategy) return null

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

**Key Features**:

- Strategy pattern for different providers
- Supports: OBP-OIDC, Keycloak, Google, GitHub, etc.
- Extensible for new providers

#### 5.2.4 Session Helper (`src/lib/oauth/sessionHelper.ts`)

```typescript
export class SessionOAuthHelper {
  static async handleCallback(
    session: Session,
    code: string,
    state: string,
    provider: string
  ): Promise<void> {
    // Validate state
    // Exchange code for tokens
    // Store tokens in session
    // Fetch user info
  }

  static async refreshAccessToken(session: Session, provider: string): Promise<void> {
    // Use refresh token to get new access token
    // Update session with new tokens
  }
}
```

### 5.3 OBP-Portal Configuration (`.env.example`)

```bash
# OIDC Configuration
OBP_OAUTH_CLIENT_ID=2a47cc56-0db1-409d-8f0b-131e4f94a212
OBP_OAUTH_CLIENT_SECRET=OR04Ga8uQjdzFmNXDI5QrEXHN30Fk4u6lbtbrrMsj8g
OBP_OAUTH_WELL_KNOWN_URL=http://127.0.0.1:9000/obp-oidc/.well-known/openid-configuration
APP_CALLBACK_URL=http://localhost:5174/login/obp/callback

# OBP API Configuration
PUBLIC_OBP_BASE_URL=http://localhost:8080
OBP_API_HOST=localhost:8080
OBP_API_URL=http://localhost:8080

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 5.4 OBP-Portal Login Flow

```
1. User clicks "Login" → Navigate to /login/obp
2. Server-side:
   - Generate PKCE challenge/verifier
   - Generate state parameter
   - Store in session
   - Redirect to OBP-OIDC /auth endpoint
3. User authenticates on OBP-OIDC
4. OBP-OIDC redirects to /login/obp/callback?code=XXX&state=YYY
5. Server-side:
   - Validate state
   - Exchange code for tokens (with PKCE verifier)
   - Store tokens in session
   - Fetch user info from /userinfo
   - Store user info in session
   - Redirect to application
6. Client-side: Authenticated state
```

### 5.5 OBP-Portal Hooks Implementation

From `src/hooks.server.ts`:

```typescript
// Initialize OAuth providers on startup
await oauth2ProviderManager.start()

// Check session validity for protected routes
const checkSessionValidity: Handle = async ({ event, resolve }) => {
  const session = event.locals.session

  if (session.data.user) {
    // Check if access token is expired
    const isExpired = await checkAccessTokenExpiration(session.data.accessToken)

    if (isExpired && session.data.refreshToken) {
      // Attempt to refresh
      await SessionOAuthHelper.refreshAccessToken(session, session.data.provider)
    }
  }

  return resolve(event)
}
```

---

## 6. Implementation Phases

### Phase 1: Preparation & Setup (Week 1)

**Goals**: Set up OBP-OIDC and understand integration requirements

**Tasks**:

1. ✅ Set up OBP-OIDC server locally

   - Install dependencies (Java 11+, Maven, PostgreSQL)
   - Configure database views (see OBP-API scripts)
   - Copy `run-server.example.sh` to `run-server.sh`
   - Update database credentials
   - Start OIDC server: `./run-server.sh`
   - Verify: `curl http://localhost:9000/obp-oidc/.well-known/openid-configuration`

2. ✅ Register API Explorer II client in OBP-OIDC

   - Update `run-server.sh`:
     ```bash
     export OIDC_CLIENT_EXPLORER_ID=obp-explorer-ii-client
     export OIDC_CLIENT_EXPLORER_SECRET=<generate_secure_secret>
     export OIDC_CLIENT_EXPLORER_REDIRECTS=http://localhost:5173/login/obp/callback
     ```
   - Restart OBP-OIDC
   - Copy client credentials

3. ✅ Study OBP-Portal implementation

   - Review OAuth2 client implementation
   - Understand provider manager pattern
   - Study session management approach
   - Document key differences from current implementation

4. ⬜ Add OAuth2 dependencies
   ```bash
   npm install arctic jsonwebtoken @types/jsonwebtoken
   ```
   - `arctic`: Modern OAuth2/OIDC client library
   - `jsonwebtoken`: JWT parsing and validation

**Deliverables**:

- Running OBP-OIDC instance
- API Explorer II client registered
- Dependencies added to `package.json`
- This preparation document

---

### Phase 2: Backend OAuth2 Implementation (Week 2-3)

**Goals**: Implement OAuth2/OIDC backend while maintaining OAuth 1.0a

**Tasks**:

#### 2.1 Create OAuth2 Service Layer

**File**: `server/services/OAuth2Service.ts`

```typescript
import { OAuth2Client } from 'arctic'
import { Service } from 'typedi'

export interface OIDCConfiguration {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
  jwks_uri: string
}

@Service()
export class OAuth2Service {
  private client: OAuth2Client
  private oidcConfig: OIDCConfiguration | null = null

  constructor() {
    const clientId = process.env.VITE_OBP_OAUTH2_CLIENT_ID
    const clientSecret = process.env.VITE_OBP_OAUTH2_CLIENT_SECRET
    const redirectUri = process.env.VITE_OBP_OAUTH2_REDIRECT_URL

    this.client = new OAuth2Client(clientId, clientSecret, redirectUri)
  }

  async initializeFromWellKnown(wellKnownUrl: string): Promise<void> {
    const response = await fetch(wellKnownUrl)
    this.oidcConfig = await response.json()
  }

  createAuthorizationURL(state: string, codeChallenge: string): URL {
    if (!this.oidcConfig) {
      throw new Error('OIDC configuration not initialized')
    }

    return this.client.createAuthorizationURL(this.oidcConfig.authorization_endpoint, state, [
      'openid',
      'profile',
      'email'
    ])
  }

  async exchangeCodeForTokens(code: string, codeVerifier: string): Promise<TokenResponse> {
    if (!this.oidcConfig) {
      throw new Error('OIDC configuration not initialized')
    }

    return await this.client.validateAuthorizationCode(
      this.oidcConfig.token_endpoint,
      code,
      codeVerifier
    )
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    // Implement refresh token flow
  }

  async getUserInfo(accessToken: string): Promise<UserInfo> {
    if (!this.oidcConfig) {
      throw new Error('OIDC configuration not initialized')
    }

    const response = await fetch(this.oidcConfig.userinfo_endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    return await response.json()
  }
}
```

#### 2.2 Create PKCE Utility

**File**: `server/utils/pkce.ts`

```typescript
import crypto from 'crypto'

export class PKCEUtils {
  static generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url')
  }

  static generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url')
  }

  static generateState(): string {
    return crypto.randomBytes(32).toString('hex')
  }
}
```

#### 2.3 Create OAuth2 Middlewares

**File**: `server/middlewares/OAuth2AuthorizationMiddleware.ts`

```typescript
import { ExpressMiddlewareInterface } from 'routing-controllers'
import { Request, Response } from 'express'
import { Service } from 'typedi'
import { OAuth2Service } from '../services/OAuth2Service'
import { PKCEUtils } from '../utils/pkce'

@Service()
export default class OAuth2AuthorizationMiddleware implements ExpressMiddlewareInterface {
  constructor(private oauth2Service: OAuth2Service) {}

  async use(request: Request, response: Response): Promise<void> {
    const session = request.session
    const redirectPage = request.query.redirect

    // Store redirect page in session
    if (redirectPage) {
      session['redirectPage'] = redirectPage
    }

    // Generate PKCE parameters
    const codeVerifier = PKCEUtils.generateCodeVerifier()
    const codeChallenge = PKCEUtils.generateCodeChallenge(codeVerifier)
    const state = PKCEUtils.generateState()

    // Store in session for callback validation
    session['oauth2_state'] = state
    session['oauth2_code_verifier'] = codeVerifier

    // Create authorization URL
    const authUrl = this.oauth2Service.createAuthorizationURL(state, codeChallenge)

    // Add PKCE challenge to URL
    authUrl.searchParams.set('code_challenge', codeChallenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')

    console.log('Redirecting to OAuth2 authorization:', authUrl.toString())
    response.redirect(authUrl.toString())
  }
}
```

**File**: `server/middlewares/OAuth2CallbackMiddleware.ts`

```typescript
import { ExpressMiddlewareInterface } from 'routing-controllers'
import { Request, Response } from 'express'
import { Service } from 'typedi'
import { OAuth2Service } from '../services/OAuth2Service'
import jwt from 'jsonwebtoken'

@Service()
export default class OAuth2CallbackMiddleware implements ExpressMiddlewareInterface {
  constructor(private oauth2Service: OAuth2Service) {}

  async use(request: Request, response: Response): Promise<void> {
    const session = request.session
    const code = request.query.code as string
    const state = request.query.state as string

    // Validate state
    const storedState = session['oauth2_state']
    if (!state || state !== storedState) {
      console.error('State validation failed')
      return response.status(400).send('Invalid state parameter')
    }

    // Get code verifier from session
    const codeVerifier = session['oauth2_code_verifier']
    if (!codeVerifier) {
      console.error('Code verifier not found in session')
      return response.status(400).send('Invalid session state')
    }

    try {
      // Exchange authorization code for tokens
      const tokens = await this.oauth2Service.exchangeCodeForTokens(code, codeVerifier)

      // Get user info
      const userInfo = await this.oauth2Service.getUserInfo(tokens.accessToken)

      // Store in session
      session['oauth2_access_token'] = tokens.accessToken
      session['oauth2_refresh_token'] = tokens.refreshToken
      session['oauth2_id_token'] = tokens.idToken
      session['oauth2_user_info'] = userInfo

      // Decode ID token for user info
      const idTokenPayload = jwt.decode(tokens.idToken)
      session['oauth2_user'] = {
        sub: idTokenPayload.sub,
        email: idTokenPayload.email,
        name: idTokenPayload.name,
        username: idTokenPayload.preferred_username || idTokenPayload.sub
      }

      // Clear OAuth2 flow parameters
      delete session['oauth2_state']
      delete session['oauth2_code_verifier']

      // Redirect to original page or home
      const redirectPage = session['redirectPage'] || process.env.VITE_OBP_API_EXPLORER_HOST
      delete session['redirectPage']

      console.log('OAuth2 authentication successful, redirecting to:', redirectPage)
      response.redirect(redirectPage)
    } catch (error) {
      console.error('OAuth2 token exchange failed:', error)
      response.status(500).send('Authentication failed: ' + error.message)
    }
  }
}
```

#### 2.4 Create OAuth2 Controllers

**File**: `server/controllers/OAuth2ConnectController.ts`

```typescript
import { Controller, Req, Res, Get, UseBefore } from 'routing-controllers'
import { Request, Response } from 'express'
import { Service } from 'typedi'
import OAuth2AuthorizationMiddleware from '../middlewares/OAuth2AuthorizationMiddleware'

@Service()
@Controller()
@UseBefore(OAuth2AuthorizationMiddleware)
export class OAuth2ConnectController {
  @Get('/oauth2/connect')
  connect(@Req() request: Request, @Res() response: Response): Response {
    return response
  }
}
```

**File**: `server/controllers/OAuth2CallbackController.ts`

```typescript
import { Controller, Req, Res, Get, UseBefore } from 'routing-controllers'
import { Request, Response } from 'express'
import { Service } from 'typedi'
import OAuth2CallbackMiddleware from '../middlewares/OAuth2CallbackMiddleware'

@Service()
@Controller()
@UseBefore(OAuth2CallbackMiddleware)
export class OAuth2CallbackController {
  @Get('/oauth2/callback')
  callback(@Req() request: Request, @Res() response: Response): Response {
    return response
  }
}
```

#### 2.5 Update Server Application

**File**: `server/app.ts`

Add OAuth2 service initialization:

```typescript
import { OAuth2Service } from './services/OAuth2Service'
import Container from 'typedi'

// Initialize OAuth2 service
const oauth2Service = Container.get(OAuth2Service)
const wellKnownUrl = process.env.VITE_OBP_OAUTH2_WELL_KNOWN_URL

if (wellKnownUrl) {
  oauth2Service
    .initializeFromWellKnown(wellKnownUrl)
    .then(() => {
      console.log('OAuth2 service initialized from well-known URL:', wellKnownUrl)
    })
    .catch((error) => {
      console.error('Failed to initialize OAuth2 service:', error)
    })
}
```

#### 2.6 Add Current User Endpoint for OAuth2

**File**: `server/controllers/UserController.ts`

Update to support both OAuth 1.0a and OAuth2:

```typescript
@Get('/user/current')
async getCurrentUser(@Session() session: any, @Res() response: Response): Promise<Response> {
  // Check OAuth2 session first
  if (session['oauth2_user']) {
    return response.json({
      username: session['oauth2_user'].username,
      email: session['oauth2_user'].email,
      name: session['oauth2_user'].name,
      provider: 'oauth2'
    });
  }

  // Fall back to OAuth 1.0a (existing code)
  if (session['clientConfig']) {
    // ... existing OAuth 1.0a logic
  }

  return response.json({});
}
```

**Deliverables**:

- OAuth2Service with OIDC discovery
- PKCE utilities
- OAuth2 middlewares (authorization + callback)
- OAuth2 controllers
- Updated user endpoint supporting both auth methods

---

### Phase 3: Environment Configuration (Week 3)

**Goals**: Add OAuth2 configuration alongside OAuth 1.0a

**File**: `env_ai` (update)

Add new OAuth2 variables:

```bash
### OAuth 1.0a Configuration (Legacy) ###
VITE_OBP_CONSUMER_KEY=0xzsimlrhdguiiuuj1ncykcxzjrogxibjff3dthl
VITE_OBP_CONSUMER_SECRET=ikf5wykke1oonykb33kmx3deh5ukbdak44ieg1l5
VITE_OBP_REDIRECT_URL=http://localhost:5173/api/callback

### OAuth2/OIDC Configuration (New) ###
# Set to 'true' to use OAuth2 instead of OAuth 1.0a
VITE_USE_OAUTH2=false

# OAuth2 Client Credentials (from OBP-OIDC)
VITE_OBP_OAUTH2_CLIENT_ID=obp-explorer-ii-client
VITE_OBP_OAUTH2_CLIENT_SECRET=<your_secure_secret>
VITE_OBP_OAUTH2_REDIRECT_URL=http://localhost:5173/oauth2/callback

# OIDC Well-Known Configuration URL
VITE_OBP_OAUTH2_WELL_KNOWN_URL=http://127.0.0.1:9000/obp-oidc/.well-known/openid-configuration

# Optional: Direct OIDC endpoints (if not using well-known)
# VITE_OBP_OAUTH2_AUTHORIZATION_URL=http://127.0.0.1:9000/obp-oidc/auth
# VITE_OBP_OAUTH2_TOKEN_URL=http://127.0.0.1:9000/obp-oidc/token
# VITE_OBP_OAUTH2_USERINFO_URL=http://127.0.0.1:9000/obp-oidc/userinfo

### API Configuration ###
VITE_OBP_API_HOST=http://127.0.0.1:8080
VITE_OBP_API_VERSION=v5.1.0
VITE_OBP_API_EXPLORER_HOST=http://localhost:5173
```

**Deliverables**:

- Updated `env_ai` with OAuth2 configuration
- Documentation on environment variables

---

### Phase 4: Frontend Updates (Week 4)

**Goals**: Update frontend to support OAuth2 login flow

#### 4.1 Update Login Links

**File**: `src/components/HeaderNav.vue`

Update login button to use OAuth2 when enabled:

```vue
<template>
  <a v-bind:href="loginUrl" v-show="isShowLoginButton" class="login-button router-link" id="login">
    {{ $t('header.login') }}
  </a>
</template>

<script setup lang="ts">
const useOAuth2 = import.meta.env.VITE_USE_OAUTH2 === 'true'
const loginUrl = computed(() => {
  const currentPath = getCurrentPath()
  return useOAuth2
    ? `/oauth2/connect?redirect=${encodeURIComponent(currentPath)}`
    : `/api/connect?redirect=${encodeURIComponent(currentPath)}`
})
</script>
```

#### 4.2 Update Logoff Handling

**File**: `server/controllers/UserController.ts`

```typescript
@Get('/user/logoff')
async logoff(@Session() session: any, @Req() request: Request, @Res() response: Response): Promise<Response> {
  const redirectPage = request.query.redirect || process.env.VITE_OBP_API_EXPLORER_HOST;

  // Clear OAuth2 session
  delete session['oauth2_access_token'];
  delete session['oauth2_refresh_token'];
  delete session['oauth2_id_token'];
  delete session['oauth2_user_info'];
  delete session['oauth2_user'];

  // Clear OAuth 1.0a session (backward compatibility)
  delete session['clientConfig'];

  // Destroy session
  session.destroy((err: any) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
  });

  return response.redirect(redirectPage);
}
```

#### 4.3 Add OAuth2 Status Indicator (Optional)

Add visual indicator showing which auth method is active:

```vue
<!-- In HeaderNav.vue or a settings component -->
<el-tag v-if="import.meta.env.VITE_USE_OAUTH2 === 'true'" type="info" size="small">
  OAuth2
</el-tag>
```

**Deliverables**:

- Updated login/logoff buttons
- OAuth2-aware user state management
- Optional status indicators

---

### Phase 5: Testing (Week 5)

**Goals**: Comprehensive testing of OAuth2 implementation

#### 5.1 Unit Tests

**File**: `server/test/OAuth2Service.test.ts`

```typescript
import { OAuth2Service } from '../services/OAuth2Service'
import { PKCEUtils } from '../utils/pkce'

describe('OAuth2Service', () => {
  let service: OAuth2Service

  beforeEach(() => {
    service = new OAuth2Service()
  })

  test('should initialize from well-known URL', async () => {
    await service.initializeFromWellKnown(
      'http://localhost:9000/obp-oidc/.well-known/openid-configuration'
    )
    // Assert configuration is loaded
  })

  test('should create valid authorization URL', () => {
    const state = PKCEUtils.generateState()
    const codeChallenge = PKCEUtils.generateCodeChallenge('test-verifier')
    const authUrl = service.createAuthorizationURL(state, codeChallenge)

    expect(authUrl.searchParams.get('response_type')).toBe('code')
    expect(authUrl.searchParams.get('state')).toBe(state)
  })
})
```

**File**: `server/test/pkce.test.ts`

```typescript
import { PKCEUtils } from '../utils/pkce'

describe('PKCEUtils', () => {
  test('should generate valid code verifier', () => {
    const verifier = PKCEUtils.generateCodeVerifier()
    expect(verifier).toHaveLength(43) // Base64url encoded 32 bytes
  })

  test('should generate valid code challenge', () => {
    const verifier = 'test-verifier'
    const challenge = PKCEUtils.generateCodeChallenge(verifier)
    expect(challenge).toBeTruthy()
    expect(typeof challenge).toBe('string')
  })

  test('should generate unique states', () => {
    const state1 = PKCEUtils.generateState()
    const state2 = PKCEUtils.generateState()
    expect(state1).not.toBe(state2)
  })
})
```

#### 5.2 Integration Tests

Create integration test suite:

```typescript
import request from 'supertest'
import { app } from '../app'

describe('OAuth2 Integration Flow', () => {
  test('GET /oauth2/connect should redirect to OIDC provider', async () => {
    const response = await request(app).get('/oauth2/connect').expect(302)

    expect(response.header.location).toContain('obp-oidc/auth')
    expect(response.header.location).toContain('code_challenge')
  })

  test('GET /oauth2/callback should exchange code for tokens', async () => {
    // Mock OIDC server responses
    // Test callback flow
  })
})
```

#### 5.3 Manual Testing Checklist

**OAuth2 Login Flow**:

- [ ] User clicks login button
- [ ] Redirected to OBP-OIDC login page
- [ ] Enter valid credentials
- [ ] Successfully redirected back to API Explorer
- [ ] User info displayed in header
- [ ] Session persists across page refreshes
- [ ] Access token works for API calls

**Token Refresh**:

- [ ] Access token expires after configured time
- [ ] Refresh token automatically obtains new access token
- [ ] User remains logged in without re-authentication

**Logout Flow**:

- [ ] User clicks logout button
- [ ] Session cleared
- [ ] Redirected to appropriate page
- [ ] Cannot access protected resources

**Error Handling**:

- [ ] Invalid authorization code
- [ ] Expired authorization code
- [ ] State parameter mismatch
- [ ] OIDC provider unavailable
- [ ] Network errors during token exchange

#### 5.4 Security Testing

- [ ] PKCE challenge/verifier validation
- [ ] State parameter prevents CSRF attacks
- [ ] Tokens stored securely (not in localStorage)
- [ ] HTTPS required in production
- [ ] Token expiration enforced
- [ ] Refresh tokens rotated (if supported)

**Deliverables**:

- Unit test suite
- Integration test suite
- Manual testing report
- Security audit report

---

### Phase 6: Documentation & Migration (Week 6)

**Goals**: Document changes and prepare migration guide

#### 6.1 Update README.md

Add OAuth2 section:

````markdown
## Authentication

API Explorer II supports two authentication methods:

### OAuth 1.0a (Legacy)

Traditional OAuth 1.0a flow with OBP-API.

**Configuration**:

```bash
VITE_USE_OAUTH2=false
VITE_OBP_CONSUMER_KEY=<your_consumer_key>
VITE_OBP_CONSUMER_SECRET=<your_consumer_secret>
VITE_OBP_REDIRECT_URL=http://localhost:5173/api/callback
```
````

### OAuth2/OIDC (Recommended)

Modern OAuth2 with OpenID Connect support.

**Configuration**:

```bash
VITE_USE_OAUTH2=true
VITE_OBP_OAUTH2_CLIENT_ID=obp-explorer-ii-client
VITE_OBP_OAUTH2_CLIENT_SECRET=<your_client_secret>
VITE_OBP_OAUTH2_REDIRECT_URL=http://localhost:5173/oauth2/callback
VITE_OBP_OAUTH2_WELL_KNOWN_URL=http://127.0.0.1:9000/obp-oidc/.well-known/openid-configuration
```

**Setting up OBP-OIDC**:

1. Clone and setup OBP-OIDC:

   ```bash
   cd ~/Documents/workspace_2024/OBP-OIDC
   cp run-server.example.sh run-server.sh
   # Edit run-server.sh with your database credentials
   ./run-server.sh
   ```

2. Copy client credentials from OBP-OIDC startup output

3. Update API Explorer II `.env` file

4. Restart API Explorer II

````

#### 6.2 Create Migration Guide

**File**: `docs/OAUTH2_MIGRATION_GUIDE.md`

```markdown
# OAuth2 Migration Guide

## For Developers

### Prerequisites
- OBP-OIDC server running (or other OIDC provider)
- Client credentials (ID and Secret)
- Database views configured in OBP database

### Step-by-Step Migration

1. **Update Dependencies**
   ```bash
   npm install arctic jsonwebtoken @types/jsonwebtoken
````

2. **Configure Environment**
   Update `.env`:

   ```bash
   VITE_USE_OAUTH2=true
   VITE_OBP_OAUTH2_CLIENT_ID=obp-explorer-ii-client
   VITE_OBP_OAUTH2_CLIENT_SECRET=<secret>
   VITE_OBP_OAUTH2_REDIRECT_URL=http://localhost:5173/oauth2/callback
   VITE_OBP_OAUTH2_WELL_KNOWN_URL=http://127.0.0.1:9000/obp-oidc/.well-known/openid-configuration
   ```

3. **Test Authentication**

   - Start server: `npm run dev`
   - Click login
   - Verify redirect to OIDC provider
   - Login with valid credentials
   - Verify successful callback

4. **Verify API Calls**
   - Test protected endpoints
   - Verify Bearer token in requests
   - Check token refresh on expiration

### Rollback Procedure

If issues occur:

1. Set `VITE_USE_OAUTH2=false`
2. Restart server
3. System reverts to OAuth 1.0a

## For System Administrators

### Production Deployment

1. **Use Production OIDC Provider**

   - Don't use OBP-OIDC in production
   - Recommended: Keycloak, Auth0, Okta
   - Configure provider in OBP-API well-known endpoints

2. **Security Requirements**

   - HTTPS only for all endpoints
   - Secure Redis with password
   - Rotate client secrets regularly
   - Monitor for suspicious activity

3. **Configuration**

   ```bash
   VITE_USE_OAUTH2=true
   VITE_OBP_OAUTH2_CLIENT_ID=<production_client_id>
   VITE_OBP_OAUTH2_CLIENT_SECRET=<production_secret>
   VITE_OBP_OAUTH2_REDIRECT_URL=https://explorer.yourdomain.com/oauth2/callback
   VITE_OBP_OAUTH2_WELL_KNOWN_URL=https://auth.yourdomain.com/.well-known/openid-configuration
   ```

4. **Monitoring**
   - Track authentication success/failure rates
   - Monitor token refresh failures
   - Alert on OIDC provider downtime

````

#### 6.3 Create Troubleshooting Guide

**File**: `docs/OAUTH2_TROUBLESHOOTING.md`

```markdown
# OAuth2 Troubleshooting Guide

## Common Issues

### 1. "State validation failed"

**Cause**: State parameter mismatch or session timeout

**Solution**:
- Clear browser cookies
- Check Redis connection
- Verify session configuration in `server/app.ts`

### 2. "Code verifier not found in session"

**Cause**: Session not persisting between requests

**Solution**:
- Check Redis is running: `redis-cli ping`
- Verify `VITE_OBP_REDIS_URL` in `.env`
- Check session cookie settings (secure, httpOnly)

### 3. "Token request failed: 401"

**Cause**: Client credentials invalid

**Solution**:
- Verify `VITE_OBP_OAUTH2_CLIENT_ID` and `VITE_OBP_OAUTH2_CLIENT_SECRET`
- Check client is registered in OBP-OIDC
- Verify redirect URI matches exactly

### 4. "OIDC configuration not initialized"

**Cause**: Well-known URL not accessible

**Solution**:
- Check OBP-OIDC is running
- Verify `VITE_OBP_OAUTH2_WELL_KNOWN_URL`
- Test URL: `curl http://localhost:9000/obp-oidc/.well-known/openid-configuration`

### 5. Redirect Loop

**Cause**: Cookie not being set or read

**Solution**:
- Check `X-Forwarded-Proto` header in nginx config
- Set `app.set('trust proxy', 1)` in production
- Verify cookie domain settings

## Debug Mode

Enable detailed logging:

```bash
DEBUG=express-session npm run dev
````

Check session data in Redis:

```bash
redis-cli
> KEYS sess:*
> GET sess:<session_id>
```

## Testing OIDC Provider

Test discovery:

```bash
curl http://localhost:9000/obp-oidc/.well-known/openid-configuration
```

Test authorization (should return HTML login form):

```bash
curl "http://localhost:9000/obp-oidc/auth?response_type=code&client_id=obp-explorer-ii-client&redirect_uri=http://localhost:5173/oauth2/callback&scope=openid&state=test123"
```

````

**Deliverables**:
- Updated README with OAuth2 documentation
- Migration guide for developers
- Troubleshooting guide
- Admin deployment guide

---

## 7. Technical Requirements

### 7.1 System Requirements

**Development**:
- Node.js >= 16.14
- npm >= 8.0.0
- Redis >= 6.0
- PostgreSQL >= 12 (for OBP database)
- Java 11+ (for OBP-OIDC)
- Maven 3.6+ (for OBP-OIDC)

**Production**:
- Same as development, plus:
- HTTPS/TLS certificates
- Production-grade OIDC provider (Keycloak, Auth0, Okta)
- Load balancer with session affinity
- Monitoring and alerting

### 7.2 Dependencies

**New NPM Packages**:
```json
{
  "dependencies": {
    "arctic": "^1.0.0",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.6"
  }
}
````

**Existing Dependencies** (no changes):

- express
- express-session
- connect-redis
- redis
- routing-controllers
- typedi

### 7.3 Database Requirements

**OBP Database Views** (required for OBP-OIDC):

- `v_oidc_users` - User authentication
- `v_oidc_clients` - Client registration
- `v_oidc_admin_clients` - Client management

See: `OBP-API/obp-api/src/main/scripts/sql/OIDC/`

### 7.4 Network Requirements

**Development**:

- API Explorer II: `http://localhost:5173`
- OBP-API: `http://localhost:8080`
- OBP-OIDC: `http://localhost:9000`
- Redis: `localhost:6379`

**Production**:

- HTTPS required for all endpoints
- CORS properly configured
- Firewall rules for service communication

---

## 8. Configuration Changes

### 8.1 Environment Variables

**New Variables**:

```bash
# OAuth2 Feature Flag
VITE_USE_OAUTH2=false  # Set to 'true' to enable OAuth2

# OAuth2 Client Configuration
VITE_OBP_OAUTH2_CLIENT_ID=obp-explorer-ii-client
VITE_OBP_OAUTH2_CLIENT_SECRET=<secure_secret>
VITE_OBP_OAUTH2_REDIRECT_URL=http://localhost:5173/oauth2/callback

# OIDC Provider Configuration
VITE_OBP_OAUTH2_WELL_KNOWN_URL=http://127.0.0.1:9000/obp-oidc/.well-known/openid-configuration

# Optional: Manual endpoint configuration (if not using well-known)
VITE_OBP_OAUTH2_AUTHORIZATION_URL=http://127.0.0.1:9000/obp-oidc/auth
VITE_OBP_OAUTH2_TOKEN_URL=http://127.0.0.1:9000/obp-oidc/token
VITE_OBP_OAUTH2_USERINFO_URL=http://127.0.0.1:9000/obp-oidc/userinfo
VITE_OBP_OAUTH2_JWKS_URL=http://127.0.0.1:9000/obp-oidc/jwks

# Token Configuration
VITE_OBP_OAUTH2_TOKEN_REFRESH_THRESHOLD=300  # Refresh 5 minutes before expiry
```

**Existing Variables** (keep unchanged):

```bash
# OAuth 1.0a (Legacy) - Still needed for backward compatibility
VITE_OBP_CONSUMER_KEY=<consumer_key>
VITE_OBP_CONSUMER_SECRET=<consumer_secret>
VITE_OBP_REDIRECT_URL=http://localhost:5173/api/callback

# API Configuration
VITE_OBP_API_HOST=http://127.0.0.1:8080
VITE_OBP_API_VERSION=v5.1.0
VITE_OBP_API_EXPLORER_HOST=http://localhost:5173

# Redis Configuration
VITE_OBP_REDIS_URL=redis://127.0.0.1:6379
VITE_OPB_SERVER_SESSION_PASSWORD=<session_secret>

# Opey Configuration
VITE_CHATBOT_ENABLED=true
VITE_CHATBOT_URL=http://localhost:5000
```

### 8.2 Session Configuration

No changes needed - existing Redis session store works with OAuth2.

**Verify** in `server/app.ts`:

```typescript
cookie: {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
  maxAge: 24 * 60 * 60 * 1000  // 24 hours
}
```

### 8.3 OBP-OIDC Configuration

**File**: `OBP-OIDC/run-server.sh`

Update Explorer II client section:

```bash
export OIDC_CLIENT_EXPLORER_ID=obp-explorer-ii-client
export OIDC_CLIENT_EXPLORER_SECRET=<generate_secure_secret>
export OIDC_CLIENT_EXPLORER_REDIRECTS=http://localhost:5173/oauth2/callback,https://production-domain.com/oauth2/callback
```

**Multiple Environments**:
Add comma-separated redirect URIs for dev, staging, production.

---

## 9. Code Changes Required

### 9.1 File Structure

**New Files**:

```
server/
  ├── services/
  │   └── OAuth2Service.ts          # OAuth2/OIDC client service
  ├── middlewares/
  │   ├── OAuth2AuthorizationMiddleware.ts   # Authorization flow
  │   └── OAuth2CallbackMiddleware.ts        # Callback handling
  ├── controllers/
  │   ├── OAuth2ConnectController.ts         # /oauth2/connect endpoint
  │   └── OAuth2CallbackController.ts        # /oauth2/callback endpoint
  ├── utils/
  │   └── pkce.ts                   # PKCE helper functions
  └── test/
      ├── OAuth2Service.test.ts     # Service tests
      └── pkce.test.ts              # PKCE tests

docs/
  ├── OAUTH2_MIGRATION_GUIDE.md     # Migration documentation
  └── OAUTH2_TROUBLESHOOTING.md     # Troubleshooting guide
```

**Modified Files**:

```
server/
  ├── app.ts                        # Initialize OAuth2Service
  └── controllers/
      └── UserController.ts         # Support both auth methods

src/
  └── components/
      └── HeaderNav.vue             # Dual login button support
```

**Unchanged Files** (keep for backward compatibility):

```
server/
  ├── services/
  │   ├── OauthInjectedService.ts   # OAuth 1.0a service
  │   └── OBPClientService.ts       # OBP API client
  ├── middlewares/
  │   ├── OauthRequestTokenMiddleware.ts
  │   └── OauthAccessTokenMiddleware.ts
  └── controllers/
      ├── ConnectController.ts       # /api/connect endpoint
      └── CallbackController.ts      # /api/callback endpoint
```

### 9.2 Breaking Changes

**None** - Implementation is additive:

- OAuth 1.0a code remains functional
- New OAuth2 code runs in parallel
- Feature flag controls which is active
- No breaking API changes

### 9.3 API Changes

**New Endpoints**:

- `GET /oauth2/connect?redirect=<url>` - Start OAuth2 flow
- `GET /oauth2/callback?code=<code>&state=<state>` - OAuth2 callback

**Modified Endpoints**:

- `GET /user/current` - Returns user info from OAuth2 or OAuth 1.0a session
- `GET /user/logoff` - Clears both OAuth2 and OAuth 1.0a sessions

**Unchanged Endpoints**:

- `GET /api/connect` - OAuth 1.0a flow (still works)
- `GET /api/callback` - OAuth 1.0a callback (still works)

---

## 10. Testing Strategy

### 10.1 Test Pyramid

```
                  /\
                 /  \
                /    \
               / E2E  \
              /  Tests \
             /----------\
            /            \
           / Integration  \
          /     Tests      \
         /------------------\
        /                    \
       /     Unit Tests       \
      /________________________\
```

### 10.2 Unit Tests (Target: 80% coverage)

**Files to Test**:

- `OAuth2Service.ts`
- `pkce.ts`
- `OAuth2AuthorizationMiddleware.ts`
- `OAuth2CallbackMiddleware.ts`

**Test Cases**:

- PKCE code verifier generation
- PKCE code challenge generation
- State parameter generation
- OIDC configuration initialization
- Authorization URL creation
- Token exchange logic
- Error handling

### 10.3 Integration Tests

**Test Scenarios**:

1. Full OAuth2 authentication flow
2. Token refresh flow
3. Logout flow
4. Error cases (invalid code, state mismatch)
5. Session persistence
6. Concurrent user sessions

### 10.4 End-to-End Tests

Use Playwright for browser automation:

```typescript
test('OAuth2 login flow', async ({ page }) => {
  // Navigate to API Explorer
  await page.goto('http://localhost:5173')

  // Click login
  await page.click('#login')

  // Should redirect to OBP-OIDC
  await page.waitForURL(/obp-oidc\/auth/)

  // Fill login form
  await page.fill('[name="username"]', 'test@example.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('[type="submit"]')

  // Should redirect back to Explorer
  await page.waitForURL('http://localhost:5173')

  // Verify logged in
  await expect(page.locator('.login-user')).toBeVisible()
})
```

### 10.5 Security Tests

**Test Cases**:

- CSRF protection via state parameter
- PKCE validation
- Token expiration enforcement
- Secure cookie attributes
- HTTPS enforcement in production
- XSS prevention in redirect URLs

### 10.6 Performance Tests

**Metrics to Track**:

- OAuth2 flow completion time (should be < 2 seconds)
- Token refresh time (should be < 500ms)
- Session lookup time (Redis)
- Memory usage with multiple sessions

### 10.7 Compatibility Tests

**Browsers**:

- Chrome/Chromium
- Firefox
- Safari
- Edge

**Platforms**:

- Linux
- macOS
- Windows

**OIDC Providers**:

- OBP-OIDC
- Keycloak
- (Future: Auth0, Okta, etc.)

---

## 11. Deployment Considerations

### 11.1 Phased Rollout Strategy

**Phase 1: Internal Testing**

- Deploy to development environment
- Enable OAuth2 for internal team only
- Collect feedback
- Fix issues

**Phase 2: Beta Testing**

- Deploy to staging environment
- Enable OAuth2 for beta users
- Monitor metrics (login success rate, errors)
- Refine implementation

**Phase 3: Production Rollout**

- Deploy to production
- Keep OAuth 1.0a as default (`VITE_USE_OAUTH2=false`)
- Allow users to opt-in to OAuth2
- Monitor metrics

**Phase 4: Full Migration**

- Make OAuth2 default (`VITE_USE_OAUTH2=true`)
- Keep OAuth 1.0a as fallback
- Announce deprecation timeline for OAuth 1.0a

**Phase 5: OAuth 1.0a Removal** (6+ months later)

- Remove OAuth 1.0a code
- Remove oauth npm package dependency
- Update documentation

### 11.2 Production Configuration

**Nginx Example**:

```nginx
server {
    listen 443 ssl http2;
    server_name explorer.yourdomain.com;

    ssl_certificate /etc/ssl/certs/explorer.crt;
    ssl_certificate_key /etc/ssl/private/explorer.key;

    # Frontend
    location / {
        root /var/www/api-explorer/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8085;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;  # Important for secure cookies
    }

    # OAuth2 endpoints
    location /oauth2 {
        proxy_pass http://localhost:8085;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;  # Important for secure cookies
    }
}
```

### 11.3 Environment-Specific Settings

**Development**:

```bash
VITE_USE_OAUTH2=true
VITE_OBP_OAUTH2_CLIENT_ID=obp-explorer-ii-client-dev
VITE_OBP_OAUTH2_REDIRECT_URL=http://localhost:5173/oauth2/callback
VITE_OBP_OAUTH2_WELL_KNOWN_URL=http://localhost:9000/obp-oidc/.well-known/openid-configuration
NODE_ENV=development
```

**Staging**:

```bash
VITE_USE_OAUTH2=true
VITE_OBP_OAUTH2_CLIENT_ID=obp-explorer-ii-client-staging
VITE_OBP_OAUTH2_REDIRECT_URL=https://staging-explorer.yourdomain.com/oauth2/callback
VITE_OBP_OAUTH2_WELL_KNOWN_URL=https://staging-auth.yourdomain.com/.well-known/openid-configuration
NODE_ENV=production
```

**Production**:

```bash
VITE_USE_OAUTH2=true
VITE_OBP_OAUTH2_CLIENT_ID=obp-explorer-ii-client-prod
VITE_OBP_OAUTH2_REDIRECT_URL=https://explorer.yourdomain.com/oauth2/callback
VITE_OBP_OAUTH2_WELL_KNOWN_URL=https://auth.yourdomain.com/.well-known/openid-configuration
NODE_ENV=production
```

### 11.4 Monitoring & Alerting

**Metrics to Monitor**:

- OAuth2 login success rate
- OAuth2 login failure rate (by error type)
- Token refresh success rate
- Token refresh failure rate
- Average login duration
- Session count (active users)
- OIDC provider response times
- Redis connection status

**Alerts to Configure**:

- OAuth2 failure rate > 5%
- OIDC provider unreachable
- Redis connection lost
- Token refresh failures spike
- Session store full

**Logging**:

```typescript
// Add structured logging
logger.info('OAuth2 login attempt', {
  userId: session.oauth2_user?.sub,
  provider: 'obp-oidc',
  timestamp: new Date().toISOString()
})

logger.error('OAuth2 token exchange failed', {
  error: error.message,
  code: authCode,
  provider: 'obp-oidc'
})
```

### 11.5 Backup & Recovery

**Session Backup** (Redis):

```bash
# Enable RDB snapshots
save 900 1
save 300 10
save 60 10000

# Enable AOF for durability
appendonly yes
appendfsync everysec
```

**Configuration Backup**:

- Store client secrets in secure vault (HashiCorp Vault, AWS Secrets Manager)
- Version control all configuration files
- Document manual configuration steps

---

## 12. Rollback Plan

### 12.1 Immediate Rollback (< 5 minutes)

**If OAuth2 causes critical issues**:

1. **Update environment variable**:

   ```bash
   export VITE_USE_OAUTH2=false
   ```

2. **Restart application**:

   ```bash
   pm2 restart api-explorer
   # OR
   systemctl restart api-explorer
   ```

3. **Verify**:
   - Login button points to `/api/connect`
   - OAuth 1.0a flow works
   - Existing sessions remain valid

**No code changes needed** - feature flag handles rollback.

### 12.2 Partial Rollback (Specific Users)

**If issues affect some users but not others**:

1. Keep OAuth2 enabled globally
2. Add user-specific override in session:

   ```typescript
   if (session.forceOAuth1) {
     // Use OAuth 1.0a for this user
   }
   ```

3. Or implement A/B testing:
   ```typescript
   const useOAuth2 = (userId) => {
     return userId % 10 < 5 // 50% of users
   }
   ```

### 12.3 Full Rollback (Remove OAuth2 Code)

**If OAuth2 needs to be completely removed**:

1. Delete new files:

   ```bash
   rm server/services/OAuth2Service.ts
   rm server/middlewares/OAuth2*.ts
   rm server/controllers/OAuth2*.ts
   rm server/utils/pkce.ts
   ```

2. Remove dependencies:

   ```bash
   npm uninstall arctic jsonwebtoken
   ```

3. Revert modified files:

   ```bash
   git checkout server/app.ts
   git checkout server/controllers/UserController.ts
   git checkout src/components/HeaderNav.vue
   ```

4. Remove environment variables from `.env`

5. Rebuild and deploy:
   ```bash
   npm run build
   npm run build-server
   # Deploy
   ```

### 12.4 Data Migration Rollback

**OAuth2 sessions → OAuth 1.0a sessions**:

No data migration needed because:

- OAuth 1.0a and OAuth2 use separate session keys
- Rolling back doesn't affect OAuth 1.0a sessions
- Users will need to re-authenticate (acceptable)

### 12.5 Communication Plan

**If rollback is needed**:

1. **Internal notification** (immediate):

   - Alert development team
   - Document the issue
   - Perform rollback

2. **User notification** (if service interruption):

   - Status page update
   - Email to affected users
   - Estimated time to resolution

3. **Post-mortem** (after rollback):
   - Root cause analysis
   - Timeline of events
   - Lessons learned
   - Action items to prevent recurrence

---

## 13. References

### 13.1 OAuth2/OIDC Standards

- **RFC 6749**: OAuth 2.0 Authorization Framework
  - https://datatracker.ietf.org/doc/html/rfc6749
- **RFC 7636**: Proof Key for Code Exchange (PKCE)
  - https://datatracker.ietf.org/doc/html/rfc7636
- **OpenID Connect Core 1.0**
  - https://openid.net/specs/openid-connect-core-1_0.html
- **OpenID Connect Discovery 1.0**
  - https://openid.net/specs/openid-connect-discovery-1_0.html

### 13.2 Libraries & Tools

**Arctic** (OAuth2/OIDC client):

- Documentation: https://arctic.js.org/
- GitHub: https://github.com/pilcrowonpaper/arctic
- Used by: OBP-Portal

**jsonwebtoken** (JWT handling):

- Documentation: https://github.com/auth0/node-jsonwebtoken
- NPM: https://www.npmjs.com/package/jsonwebtoken

**Express Session**:

- Documentation: https://github.com/expressjs/session
- Used for: Session management with Redis

### 13.3 OBP Projects

**OBP-OIDC**:

- Location: `~/Documents/workspace_2024/OBP-OIDC`
- README: See project README.md for setup instructions
- GitHub: (Internal repository)

**OBP-Portal** (Reference Implementation):

- Location: `~/Documents/workspace_2024/OBP-Portal`
- Key files:
  - `src/lib/oauth/client.ts` - OAuth2 client wrapper
  - `src/lib/oauth/providerManager.ts` - Multi-provider support
  - `src/lib/oauth/providerFactory.ts` - Provider strategy pattern
  - `src/lib/oauth/sessionHelper.ts` - Session management
  - `src/hooks.server.ts` - Server initialization

**OBP-API**:

- Database scripts: `OBP-API/obp-api/src/main/scripts/sql/OIDC/`
- Well-known endpoint: `/obp/v5.1.0/well-known`

### 13.4 Additional Resources

**OIDC Debugger**:

- https://oidcdebugger.com/
- Tool for testing OIDC flows

**JWT.io**:

- https://jwt.io/
- Tool for decoding and inspecting JWTs

**OAuth 2.0 Playground**:

- https://www.oauth.com/playground/
- Interactive OAuth2 flow demonstration

### 13.5 Security Best Practices

**OWASP OAuth 2.0 Security**:

- https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheatsheet.html

**OAuth 2.0 Security Best Current Practice**:

- https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics

**Key Recommendations**:

1. Always use PKCE for authorization code flow
2. Use state parameter to prevent CSRF
3. Validate redirect URIs strictly
4. Use HTTPS in production
5. Store tokens securely (never in localStorage)
6. Implement token refresh before expiration
7. Use short-lived access tokens
8. Rotate refresh tokens when possible
9. Log authentication events for audit
10. Monitor for suspicious activity

---

## Appendix A: Quick Reference

### A.1 OAuth2 vs OAuth 1.0a Comparison

| Feature                | OAuth 1.0a              | OAuth2/OIDC                 |
| ---------------------- | ----------------------- | --------------------------- |
| **Signature**          | HMAC-SHA1 required      | Bearer token (no signature) |
| **Request Complexity** | Complex (6+ parameters) | Simple (2-3 parameters)     |
| **Token Types**        | Access token + secret   | Access + Refresh + ID token |
| **Token Format**       | Opaque string           | JWT (structured)            |
| **User Info**          | Separate API call       | Embedded in ID token        |
| **Refresh**            | Not supported           | Built-in refresh token      |
| **Mobile Support**     | Difficult               | Native support              |
| **Browser Support**    | Limited                 | Full support                |
| **Standard**           | Deprecated              | Current standard            |

### A.2 Key Environment Variables

```bash
# Feature Flag
VITE_USE_OAUTH2=true|false

# Client Credentials
VITE_OBP_OAUTH2_CLIENT_ID=<client_id>
VITE_OBP_OAUTH2_CLIENT_SECRET=<client_secret>

# Endpoints
VITE_OBP_OAUTH2_REDIRECT_URL=<callback_url>
VITE_OBP_OAUTH2_WELL_KNOWN_URL=<discovery_url>

# API Configuration
VITE_OBP_API_HOST=<obp_api_url>
VITE_OBP_API_EXPLORER_HOST=<explorer_url>

# Session
VITE_OBP_REDIS_URL=<redis_connection_string>
VITE_OPB_SERVER_SESSION_PASSWORD=<session_secret>
```

### A.3 Common Commands

**Start OBP-OIDC**:

```bash
cd ~/Documents/workspace_2024/OBP-OIDC
./run-server.sh
```

**Start API Explorer II**:

```bash
cd ~/Documents/workspace_2024/API-Explorer-II
npm run dev
```

**Test OIDC Discovery**:

```bash
curl http://localhost:9000/obp-oidc/.well-known/openid-configuration | jq
```

**Check Redis**:

```bash
redis-cli ping
redis-cli KEYS "sess:*"
```

**Run Tests**:

```bash
npm test                    # Unit tests
npm run test:integration    # Integration tests
npx playwright test         # E2E tests
```

### A.4 Troubleshooting Checklist

**Before Starting**:

- [ ] OBP-OIDC is running
- [ ] Redis is running
- [ ] OBP-API is running
- [ ] Database views are created
- [ ] Client is registered in OBP-OIDC
- [ ] Environment variables are set

**If Login Fails**:

- [ ] Check browser console for errors
- [ ] Verify redirect URI matches exactly
- [ ] Check session cookie is set
- [ ] Verify OIDC provider is accessible
- [ ] Check server logs for errors
- [ ] Verify client credentials

**If Tokens Fail**:

- [ ] Check token expiration
- [ ] Verify refresh token exists
- [ ] Check token format (valid JWT)
- [ ] Verify signing algorithm (RS256)
- [ ] Check JWKS endpoint

### A.5 File Checklist

**New Files to Create**:

- [ ] `server/services/OAuth2Service.ts`
- [ ] `server/utils/pkce.ts`
- [ ] `server/middlewares/OAuth2AuthorizationMiddleware.ts`
- [ ] `server/middlewares/OAuth2CallbackMiddleware.ts`
- [ ] `server/controllers/OAuth2ConnectController.ts`
- [ ] `server/controllers/OAuth2CallbackController.ts`
- [ ] `server/test/OAuth2Service.test.ts`
- [ ] `server/test/pkce.test.ts`
- [ ] `docs/OAUTH2_MIGRATION_GUIDE.md`
- [ ] `docs/OAUTH2_TROUBLESHOOTING.md`

**Files to Modify**:

- [ ] `server/app.ts`
- [ ] `server/controllers/UserController.ts`
- [ ] `src/components/HeaderNav.vue`
- [ ] `package.json`
- [ ] `env_ai`
- [ ] `README.md`

**Files to Keep (Don't Delete)**:

- [ ] `server/services/OauthInjectedService.ts`
- [ ] `server/services/OBPClientService.ts`
- [ ] `server/middlewares/OauthRequestTokenMiddleware.ts`
- [ ] `server/middlewares/OauthAccessTokenMiddleware.ts`
- [ ] `server/controllers/ConnectController.ts`
- [ ] `server/controllers/CallbackController.ts`

---

## Appendix B: Testing Scenarios

### B.1 Happy Path Testing

1. **New User Login**

   - User clicks login
   - Redirects to OBP-OIDC
   - User enters credentials
   - Successfully redirected back
   - User info displayed
   - Session persists

2. **Returning User**

   - User has valid session
   - Page refresh maintains login
   - API calls include Bearer token
   - Token auto-refreshes before expiry

3. **Logout**
   - User clicks logout
   - Session cleared
   - Redirected appropriately
   - Cannot access protected resources

### B.2 Error Scenarios

1. **Invalid Credentials**

   - User enters wrong password
   - OBP-OIDC shows error
   - User can retry

2. **State Mismatch**

   - Tampered state parameter
   - Shows error message
   - User can restart flow

3. **Expired Code**

   - Authorization code expires
   - Shows error message
   - User can retry login

4. **Network Errors**

   - OIDC provider unreachable
   - Shows user-friendly error
   - Option to retry

5. **Token Expired**
   - Access token expires
   - Refresh token used automatically
   - User stays logged in

### B.3 Edge Cases

1. **Concurrent Logins**

   - User logs in from multiple browsers
   - Each session independent
   - Logout affects only current session

2. **Session Timeout**

   - User inactive for extended period
   - Session expires
   - Prompted to log in again

3. **Browser Refresh During Flow**

   - User refreshes during authorization
   - Flow restarts gracefully
   - No error shown

4. **Multiple Redirect URIs**
   - Different environments
   - Correct URI used per environment
   - No cross-environment issues

---

## Appendix C: Production Readiness Checklist

### C.1 Security

- [ ] HTTPS enabled for all endpoints
- [ ] Client secret stored securely (vault/secrets manager)
- [ ] Session secret is strong and rotated
- [ ] PKCE enabled and enforced
- [ ] State parameter validated
- [ ] CSRF protection enabled
- [ ] XSS protection in place
- [ ] Redirect URI whitelist enforced
- [ ] Token storage secure (httpOnly cookies)
- [ ] Rate limiting implemented
- [ ] Audit logging enabled

### C.2 Performance

- [ ] Redis configured for high availability
- [ ] Session expiration tuned
- [ ] Token refresh threshold optimized
- [ ] Connection pooling configured
- [ ] Caching strategy implemented
- [ ] Load testing completed
- [ ] Performance benchmarks met

### C.3 Monitoring

- [ ] Application monitoring (APM)
- [ ] Log aggregation configured
- [ ] Metrics dashboard created
- [ ] Alerts configured
- [ ] Health checks in place
- [ ] Uptime monitoring enabled
- [ ] Error tracking configured

### C.4 Documentation

- [ ] API documentation updated
- [ ] Admin guide created
- [ ] User guide updated
- [ ] Troubleshooting guide complete
- [ ] Runbook for common issues
- [ ] Architecture diagrams created
- [ ] Configuration documented

### C.5 Operations

- [ ] Deployment automation tested
- [ ] Rollback procedure documented
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan
- [ ] On-call procedures defined
- [ ] Incident response plan
- [ ] Change management process

### C.6 Testing

- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Security tests completed
- [ ] Performance tests passed
- [ ] Load tests completed
- [ ] Penetration testing done (if required)

---

## Document History

| Version | Date | Author          | Changes                   |
| ------- | ---- | --------------- | ------------------------- |
| 1.0     | 2024 | TESOBE Dev Team | Initial document creation |

---

## Contact & Support

**For Technical Questions**:

- Development Team: dev@tesobe.com
- Internal Slack: #obp-development

**For Security Issues**:

- Security Team: security@tesobe.com
- Follow responsible disclosure guidelines

**For Production Issues**:

- On-call Team: oncall@tesobe.com
- Status Page: status.openbankproject.com

---

**END OF DOCUMENT**
