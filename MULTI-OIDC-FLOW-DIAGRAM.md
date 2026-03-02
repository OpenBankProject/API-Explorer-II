# Multi-OIDC Provider Flow Diagrams

## 1. System Initialization Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     SERVER STARTUP                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  Load Environment Variables              │
        │  - VITE_OBP_OAUTH2_CLIENT_ID            │
        │  - VITE_KEYCLOAK_CLIENT_ID              │
        │  - VITE_GOOGLE_CLIENT_ID (optional)     │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  Initialize OAuth2ProviderFactory        │
        │  - Load provider strategies             │
        │  - Configure client credentials         │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  Initialize OAuth2ProviderManager        │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  Fetch Well-Known URIs from OBP API     │
        │  GET /obp/v5.1.0/well-known             │
        └─────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
        ┌───────────────────┐  ┌───────────────────┐
        │   OBP-OIDC        │  │   Keycloak        │
        │   Well-Known URL  │  │   Well-Known URL  │
        └───────────────────┘  └───────────────────┘
                    │                   │
                    └─────────┬─────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  For Each Provider:                     │
        │  1. Get strategy from factory           │
        │  2. Create OAuth2ClientWithConfig       │
        │  3. Fetch .well-known/openid-config     │
        │  4. Store in providers Map              │
        │  5. Track status (available/unavailable)│
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  Start Health Check (60s intervals)     │
        │  - Monitor all providers                │
        │  - Update availability status           │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  Server Ready                           │
        │  - Multiple providers initialized       │
        │  - Health monitoring active             │
        └─────────────────────────────────────────┘
```

---

## 2. User Login Flow (Multi-Provider)

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Opens API Explorer II
                              ▼
        ┌─────────────────────────────────────────┐
        │  HeaderNav.vue                          │
        │  - Fetch available providers            │
        │  GET /api/oauth2/providers              │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  Display Login Button                   │
        │  (with dropdown if multiple providers)  │
        └─────────────────────────────────────────┘
                              │
                              │ User clicks "Login"
                              ▼
                    ┌─────────┴─────────┐
                    │                   │
          Single    │                   │   Multiple
          Provider  │                   │   Providers
                    ▼                   ▼
        ┌───────────────────┐  ┌───────────────────┐
        │  Direct Login     │  │  Show Provider    │
        │                   │  │  Selection Dialog │
        └───────────────────┘  └───────────────────┘
                    │                   │
                    │                   │ User selects provider
                    │                   │ (e.g., "obp-oidc")
                    │                   │
                    └─────────┬─────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  Redirect to:                           │
        │  /api/oauth2/connect?                   │
        │    provider=obp-oidc&                   │
        │    redirect=/resource-docs              │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  OAuth2ConnectController                │
        │  1. Get provider from query param       │
        │  2. Retrieve OAuth2Client from Manager  │
        │  3. Generate PKCE code_verifier         │
        │  4. Generate code_challenge (SHA256)    │
        │  5. Generate state (CSRF token)         │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  Store in Session:                      │
        │  - oauth2_provider: "obp-oidc"          │
        │  - oauth2_code_verifier: "..."          │
        │  - oauth2_state: "..."                  │
        │  - oauth2_redirect: "/resource-docs"    │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  Build Authorization URL:               │
        │  {provider_auth_endpoint}?              │
        │    client_id=...&                       │
        │    redirect_uri=...&                    │
        │    response_type=code&                  │
        │    scope=openid+profile+email&          │
        │    state=...&                           │
        │    code_challenge=...&                  │
        │    code_challenge_method=S256           │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  302 Redirect to OIDC Provider          │
        │  (e.g., OBP-OIDC or Keycloak)           │
        └─────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              OIDC PROVIDER (OBP-OIDC / Keycloak)                │
│  - User enters credentials                                       │
│  - User authenticates                                            │
│  - Provider validates credentials                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Authentication successful
                              ▼
        ┌─────────────────────────────────────────┐
        │  302 Redirect back to:                  │
        │  /api/oauth2/callback?                  │
        │    code=AUTHORIZATION_CODE&             │
        │    state=CSRF_TOKEN                     │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  OAuth2CallbackController               │
        │  1. Retrieve provider from session      │
        │  2. Validate state (CSRF protection)    │
        │  3. Get OAuth2Client for provider       │
        │  4. Retrieve code_verifier from session │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  Exchange Authorization Code for Tokens │
        │  POST {provider_token_endpoint}         │
        │  Body:                                  │
        │    grant_type=authorization_code        │
        │    code=...                             │
        │    redirect_uri=...                     │
        │    client_id=...                        │
        │    client_secret=...                    │
        │    code_verifier=... (PKCE)             │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  Receive Tokens:                        │
        │  - access_token                         │
        │  - refresh_token                        │
        │  - id_token (JWT)                       │
        │  - expires_in                           │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  Fetch User Info                        │
        │  GET {provider_userinfo_endpoint}       │
        │  Authorization: Bearer {access_token}   │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  Store in Session:                      │
        │  - oauth2_access_token                  │
        │  - oauth2_refresh_token                 │
        │  - oauth2_id_token                      │
        │  - oauth2_provider: "obp-oidc"          │
        │  - user: { username, email, name, ... } │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  302 Redirect to Original Page          │
        │  /resource-docs                         │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  User Logged In                         │
        │  - Username displayed in header         │
        │  - Access token available for API calls │
        └─────────────────────────────────────────┘
```

---

## 3. API Request Flow (Authenticated)

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Makes API request
                              ▼
        ┌─────────────────────────────────────────┐
        │  Frontend                               │
        │  GET /obp/v5.1.0/banks                  │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  RequestController                      │
        │  - Retrieve access_token from session   │
        │  - Check if token is expired            │
        └─────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
          Token │                           │ Token
          Valid │                           │ Expired
                ▼                           ▼
    ┌───────────────────┐      ┌───────────────────┐
    │  Use Access Token │      │  Refresh Token    │
    └───────────────────┘      └───────────────────┘
                │                           │
                │                           ▼
                │              ┌───────────────────────────┐
                │              │  Get provider from session│
                │              │  Get refresh_token        │
                │              └───────────────────────────┘
                │                           │
                │                           ▼
                │              ┌───────────────────────────┐
                │              │  POST {token_endpoint}    │
                │              │  grant_type=refresh_token │
                │              │  refresh_token=...        │
                │              └───────────────────────────┘
                │                           │
                │                           ▼
                │              ┌───────────────────────────┐
                │              │  Receive new tokens       │
                │              │  - new access_token       │
                │              │  - new refresh_token      │
                │              │  Update session           │
                │              └───────────────────────────┘
                │                           │
                └─────────────┬─────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  Forward to OBP API                     │
        │  Authorization: Bearer {access_token}   │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  OBP API validates token with provider  │
        │  - Validates signature                  │
        │  - Checks expiration                    │
        │  - Verifies scopes                      │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  Return API Response                    │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  Display data to user                   │
        └─────────────────────────────────────────┘
```

---

## 4. Provider Health Check Flow

```
        ┌─────────────────────────────────────────┐
        │  Health Check Timer (60s intervals)     │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  OAuth2ProviderManager                  │
        │  performHealthCheck()                   │
        └─────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
        ┌───────────────────┐  ┌───────────────────┐
        │  Check OBP-OIDC   │  │  Check Keycloak   │
        │  HEAD {issuer}    │  │  HEAD {issuer}    │
        └───────────────────┘  └───────────────────┘
                    │                   │
            ┌───────┴───────┐   ┌───────┴───────┐
            ▼               ▼   ▼               ▼
        ┌──────┐      ┌──────┐ ┌──────┐      ┌──────┐
        │  OK  │      │ FAIL │ │  OK  │      │ FAIL │
        │ 200  │      │ 5xx  │ │ 200  │      │ 5xx  │
        └──────┘      └──────┘ └──────┘      └──────┘
            │               │       │               │
            └───────┬───────┘       └───────┬───────┘
                    │                       │
                    ▼                       ▼
        ┌───────────────────┐  ┌───────────────────┐
        │  Update Status    │  │  Update Status    │
        │  available: true  │  │  available: false │
        │  lastChecked: now │  │  lastChecked: now │
        │                   │  │  error: "..."     │
        └───────────────────┘  └───────────────────┘
                    │                       │
                    └───────────┬───────────┘
                                │
                                ▼
        ┌─────────────────────────────────────────┐
        │  Log Health Status                      │
        │  - obp-oidc: ✓ healthy                  │
        │  - keycloak: ✗ unhealthy (timeout)      │
        └─────────────────────────────────────────┘
                                │
                                ▼
        ┌─────────────────────────────────────────┐
        │  Frontend can query:                    │
        │  GET /api/oauth2/providers              │
        │  (Returns updated status)               │
        └─────────────────────────────────────────┘
```

---

## 5. Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Vue 3)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  HeaderNav.vue                                          │    │
│  │  - fetchAvailableProviders()                            │    │
│  │  - handleLoginClick()                                   │    │
│  │  - loginWithProvider(provider)                          │    │
│  └────────────────────────────────────────────────────────┘    │
│                         │                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │ HTTP
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  OAuth2ProvidersController                              │    │
│  │  GET /api/oauth2/providers                              │    │
│  └────────┬───────────────────────────────────────────────┘    │
│           │                                                      │
│           ▼                                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  OAuth2ProviderManager                                  │    │
│  │  - providers: Map<string, OAuth2ClientWithConfig>       │    │
│  │  - providerStatus: Map<string, ProviderStatus>          │    │
│  │  - fetchWellKnownUris()                                 │    │
│  │  - initializeProviders()                                │    │
│  │  - getProvider(name)                                    │    │
│  │  - getAvailableProviders()                              │    │
│  │  - startHealthCheck()                                   │    │
│  └────────┬───────────────────────────────┬────────────────┘    │
│           │                               │                      │
│           │ uses                          │ creates              │
│           │                               │                      │
│           ▼                               ▼                      │
│  ┌─────────────────────┐      ┌─────────────────────────┐      │
│  │  OBPClientService   │      │  OAuth2ProviderFactory   │      │
│  │  - Fetch well-known │      │  - strategies: Map       │      │
│  │    from OBP API     │      │  - initializeProvider()  │      │
│  └─────────────────────┘      └──────────┬──────────────┘      │
│                                           │                      │
│                                           │ creates              │
│                                           ▼                      │
│                               ┌─────────────────────────┐       │
│                               │ OAuth2ClientWithConfig  │       │
│                               │ - OIDCConfig            │       │
│                               │ - provider: string      │       │
│                               │ - initOIDCConfig()      │       │
│                               │ - getAuthEndpoint()     │       │
│                               │ - getTokenEndpoint()    │       │
│                               │ - getUserInfoEndpoint() │       │
│                               └─────────────────────────┘       │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  OAuth2ConnectController                                │    │
│  │  GET /api/oauth2/connect?provider=obp-oidc              │    │
│  │  1. Get provider from ProviderManager                   │    │
│  │  2. Generate PKCE                                       │    │
│  │  3. Store in session                                    │    │
│  │  4. Redirect to provider                                │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  OAuth2CallbackController                               │    │
│  │  GET /api/oauth2/callback?code=xxx&state=yyy            │    │
│  │  1. Get provider from session                           │    │
│  │  2. Get OAuth2Client from ProviderManager               │    │
│  │  3. Exchange code for tokens                            │    │
│  │  4. Fetch user info                                     │    │
│  │  5. Store in session                                    │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTP
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OBP API                                     │
├─────────────────────────────────────────────────────────────────┤
│  GET /obp/v5.1.0/well-known                                     │
│  → Returns list of OIDC provider configurations                 │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  OIDC PROVIDERS                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐     ┌──────────────────┐                 │
│  │   OBP-OIDC       │     │   Keycloak       │                 │
│  │   localhost:9000 │     │   localhost:8180 │                 │
│  └──────────────────┘     └──────────────────┘                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Data Flow: Session Storage

```
┌─────────────────────────────────────────────────────────────────┐
│                    SESSION DATA LIFECYCLE                        │
└─────────────────────────────────────────────────────────────────┘

Step 1: Login Initiation
┌──────────────────────────────────────┐
│  Session                              │
│  ┌────────────────────────────────┐  │
│  │ oauth2_provider: "obp-oidc"    │  │ ← Store provider choice
│  │ oauth2_code_verifier: "..."    │  │ ← Store for PKCE
│  │ oauth2_state: "..."            │  │ ← Store for CSRF protection
│  │ oauth2_redirect: "/resource-docs"│ │ ← Store redirect URL
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘

Step 2: After Token Exchange
┌──────────────────────────────────────┐
│  Session                              │
│  ┌────────────────────────────────┐  │
│  │ oauth2_provider: "obp-oidc"    │  │ ← Provider used
│  │ oauth2_access_token: "..."     │  │ ← For API calls
│  │ oauth2_refresh_token: "..."    │  │ ← For token refresh
│  │ oauth2_id_token: "..."         │  │ ← User identity (JWT)
│  │ user: {                        │  │ ← User profile
│  │   username: "john.doe"         │  │
│  │   email: "john@example.com"    │  │
│  │   name: "John Doe"             │  │
│  │   provider: "obp-oidc"         │  │
│  │   sub: "uuid-1234"             │  │
│  │ }                              │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
         (oauth2_code_verifier deleted)
         (oauth2_state deleted)
         (oauth2_redirect deleted)
```

---

## 7. Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ERROR SCENARIOS                               │
└─────────────────────────────────────────────────────────────────┘

Scenario 1: Provider Not Available
    User clicks login
         │
         ▼
    Fetch providers → No providers available
         │
         ▼
    Show error: "Authentication not available"

Scenario 2: Invalid Provider
    User selects provider → GET /api/oauth2/connect?provider=invalid
         │
         ▼
    ProviderManager.getProvider("invalid") → undefined
         │
         ▼
    Return 400: "Provider not available"

Scenario 3: State Mismatch (CSRF Attack)
    Callback received → state parameter doesn't match session
         │
         ▼
    Reject request → Redirect with error
         │
         ▼
    Display: "Invalid state (CSRF protection)"

Scenario 4: Token Exchange Failure
    Exchange code for tokens → 401 Unauthorized
         │
         ▼
    Log error → Redirect with error
         │
         ▼
    Display: "Authentication failed"

Scenario 5: Provider Health Check Failure
    Health check → Provider unreachable
         │
         ▼
    Mark as unavailable → Update status
         │
         ▼
    Frontend queries providers → Shows as unavailable
         │
         ▼
    User cannot select unavailable provider
```
