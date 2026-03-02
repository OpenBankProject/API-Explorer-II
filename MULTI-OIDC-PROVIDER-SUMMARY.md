# Multi-OIDC Provider Implementation - Executive Summary

## Overview

This document provides a high-level summary of implementing multiple OIDC provider support in API Explorer II, based on the proven architecture from OBP-Portal.

---

## Current State

**API Explorer II** currently supports OAuth2/OIDC authentication with a **single provider** configured via environment variables:

```bash
VITE_OBP_OAUTH2_WELL_KNOWN_URL=http://localhost:9000/obp-oidc/.well-known/openid-configuration
VITE_OBP_OAUTH2_CLIENT_ID=<client-id>
VITE_OBP_OAUTH2_CLIENT_SECRET=<client-secret>
```

**Limitations:**
- Only one OIDC provider supported at a time
- No user choice of authentication method
- Requires redeployment to switch providers
- No fallback if provider is unavailable

---

## Target State

**Multi-Provider Support** allows users to choose from multiple identity providers at login:

- **OBP-OIDC** - Open Bank Project's identity provider
- **Keycloak** - Enterprise identity management
- **Google** - Consumer identity (optional)
- **GitHub** - Developer identity (optional)
- **Custom** - Any OpenID Connect provider

---

## How OBP-Portal Does It

### 1. Dynamic Provider Discovery

OBP-Portal fetches available OIDC providers from the **OBP API**:

```
GET /obp/v5.1.0/well-known
```

**Response:**
```json
{
  "well_known_uris": [
    {
      "provider": "obp-oidc",
      "url": "http://localhost:9000/obp-oidc/.well-known/openid-configuration"
    },
    {
      "provider": "keycloak",
      "url": "http://localhost:8180/realms/obp/.well-known/openid-configuration"
    }
  ]
}
```

### 2. Provider Manager

**Key Component:** `OAuth2ProviderManager`

**Responsibilities:**
- Fetch well-known URIs from OBP API
- Initialize OAuth2 client for each provider
- Track provider health (available/unavailable)
- Perform periodic health checks (60s intervals)
- Provide access to specific providers

### 3. Provider Factory

**Key Component:** `OAuth2ProviderFactory`

**Responsibilities:**
- Strategy pattern for provider-specific configuration
- Load credentials from environment variables
- Create OAuth2 clients with OIDC discovery
- Support multiple provider types

**Strategy Pattern:**
```typescript
strategies.set('obp-oidc', {
  clientId: process.env.VITE_OBP_OAUTH2_CLIENT_ID,
  clientSecret: process.env.VITE_OBP_OAUTH2_CLIENT_SECRET,
  redirectUri: process.env.VITE_OBP_OAUTH2_REDIRECT_URL
})

strategies.set('keycloak', {
  clientId: process.env.VITE_KEYCLOAK_CLIENT_ID,
  clientSecret: process.env.VITE_KEYCLOAK_CLIENT_SECRET,
  redirectUri: process.env.VITE_KEYCLOAK_REDIRECT_URL
})
```

### 4. User Flow

```
1. User clicks "Login" 
   → Shows provider selection dialog

2. User selects provider (e.g., "OBP-OIDC")
   → GET /api/oauth2/connect?provider=obp-oidc

3. Server:
   - Retrieves OAuth2 client for "obp-oidc"
   - Generates PKCE parameters
   - Stores provider name in session
   - Redirects to provider's authorization endpoint

4. User authenticates on selected OIDC provider

5. Provider redirects back:
   → GET /api/oauth2/callback?code=xxx&state=yyy

6. Server:
   - Retrieves provider from session ("obp-oidc")
   - Gets corresponding OAuth2 client
   - Exchanges code for tokens
   - Stores tokens with provider name

7. User authenticated with selected provider
```

---

## Implementation Architecture for API Explorer II

### New Services

#### 1. **OAuth2ClientWithConfig** (extends `OAuth2Client` from arctic)
```typescript
class OAuth2ClientWithConfig extends OAuth2Client {
  public OIDCConfig?: OIDCConfiguration
  public provider: string
  
  async initOIDCConfig(oidcConfigUrl: string): Promise<void>
  getAuthorizationEndpoint(): string
  getTokenEndpoint(): string
  getUserInfoEndpoint(): string
}
```

#### 2. **OAuth2ProviderFactory**
```typescript
class OAuth2ProviderFactory {
  private strategies: Map<string, ProviderStrategy>
  
  async initializeProvider(wellKnownUri: WellKnownUri): Promise<OAuth2ClientWithConfig>
  getConfiguredProviders(): string[]
}
```

#### 3. **OAuth2ProviderManager**
```typescript
class OAuth2ProviderManager {
  private providers: Map<string, OAuth2ClientWithConfig>
  
  async fetchWellKnownUris(): Promise<WellKnownUri[]>
  async initializeProviders(): Promise<boolean>
  getProvider(providerName: string): OAuth2ClientWithConfig
  getAvailableProviders(): string[]
  startHealthCheck(intervalMs: number): void
}
```

### Updated Controllers

#### 1. **OAuth2ProvidersController** (NEW)
```typescript
GET /api/oauth2/providers
→ Returns: { providers: [...], count: 2, availableCount: 1 }
```

#### 2. **OAuth2ConnectController** (UPDATED)
```typescript
GET /api/oauth2/connect?provider=obp-oidc&redirect=/resource-docs
→ Redirects to selected provider's authorization endpoint
```

#### 3. **OAuth2CallbackController** (UPDATED)
```typescript
GET /api/oauth2/callback?code=xxx&state=yyy
→ Uses provider from session to exchange code for tokens
```

### Frontend Updates

#### **HeaderNav.vue** (UPDATED)

**Before:**
```vue
<a href="/api/oauth2/connect">Login</a>
```

**After:**
```vue
<button @click="handleLoginClick">
  Login 
  <span v-if="availableProviders.length > 1">▼</span>
</button>

<!-- Provider Selection Dialog -->
<el-dialog v-model="showProviderSelector">
  <div v-for="provider in availableProviders">
    <div @click="loginWithProvider(provider.name)">
      {{ provider.name }}
    </div>
  </div>
</el-dialog>
```

---

## Configuration

### Environment Variables

```bash
# OBP-OIDC Provider
VITE_OBP_OAUTH2_CLIENT_ID=48ac28e9-9ee3-47fd-8448-69a62764b779
VITE_OBP_OAUTH2_CLIENT_SECRET=fOTQF7jfg8C74u7ZhSjVQpoBYvD0KpWfM5UsEZBSFFM
VITE_OBP_OAUTH2_REDIRECT_URL=http://localhost:5173/api/oauth2/callback

# Keycloak Provider
VITE_KEYCLOAK_CLIENT_ID=obp-api-explorer
VITE_KEYCLOAK_CLIENT_SECRET=your-keycloak-secret
VITE_KEYCLOAK_REDIRECT_URL=http://localhost:5173/api/oauth2/callback

# Google Provider (Optional)
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_GOOGLE_CLIENT_SECRET=your-google-client-secret
VITE_GOOGLE_REDIRECT_URL=http://localhost:5173/api/oauth2/callback
```

**Note:** No need to specify well-known URLs - they are fetched from OBP API!

---

## Key Benefits

### 1. **Dynamic Discovery**
- Providers are discovered from OBP API at runtime
- No hardcoded provider list
- Easy to add new providers without code changes

### 2. **User Choice**
- Users select their preferred authentication method
- Better user experience
- Support for organizational identity preferences

### 3. **Resilience**
- Health monitoring detects provider outages
- Can fallback to alternative providers
- Automatic retry for failed initializations

### 4. **Extensibility**
- Strategy pattern makes adding providers trivial
- Just add environment variables
- No code changes needed

### 5. **Backward Compatibility**
- Existing single-provider mode still works
- Gradual migration path
- No breaking changes

---

## Implementation Phases

### **Phase 1: Backend Services** (Week 1)
- [ ] Create `OAuth2ClientWithConfig`
- [ ] Create `OAuth2ProviderFactory`
- [ ] Create `OAuth2ProviderManager`
- [ ] Create TypeScript interfaces

### **Phase 2: Backend Controllers** (Week 1-2)
- [ ] Create `OAuth2ProvidersController`
- [ ] Update `OAuth2ConnectController` with provider parameter
- [ ] Update `OAuth2CallbackController` to use provider from session

### **Phase 3: Frontend** (Week 2)
- [ ] Update `HeaderNav.vue` to fetch providers
- [ ] Add provider selection UI (dialog/dropdown)
- [ ] Update login flow to include provider selection

### **Phase 4: Configuration & Testing** (Week 2-3)
- [ ] Configure environment variables for multiple providers
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Manual testing with OBP-OIDC and Keycloak
- [ ] Update documentation

---

## Migration Path

### **Step 1: Deploy with Backward Compatibility**
- Implement new services
- Keep existing single-provider mode working
- Test thoroughly

### **Step 2: Enable Multi-Provider**
- Add provider environment variables
- Enable provider selection UI
- Monitor for issues

### **Step 3: Deprecate Single-Provider**
- Update documentation
- Remove `VITE_OBP_OAUTH2_WELL_KNOWN_URL` env variable
- Use OBP API well-known endpoint by default

---

## Testing Strategy

### Unit Tests
- `OAuth2ProviderFactory.test.ts` - Strategy creation
- `OAuth2ProviderManager.test.ts` - Provider initialization
- `OAuth2ClientWithConfig.test.ts` - OIDC config loading

### Integration Tests
- Multi-provider login flow
- Provider selection
- Token exchange with different providers
- Callback handling

### Manual Testing
- Login with OBP-OIDC
- Login with Keycloak
- Provider unavailable scenarios
- Network error handling
- User cancellation

---

## Success Criteria

- ✅ Users can choose from multiple OIDC providers
- ✅ Providers are discovered from OBP API automatically
- ✅ Health monitoring detects provider outages
- ✅ Backward compatible with single-provider mode
- ✅ No code changes needed to add new providers (only env vars)
- ✅ Comprehensive test coverage (>80%)
- ✅ Documentation updated

---

## References

- **Full Implementation Guide:** `MULTI-OIDC-PROVIDER-IMPLEMENTATION.md`
- **OBP-Portal Reference:** `~/Documents/workspace_2024/OBP-Portal`
- **OBP API Well-Known Endpoint:** `/obp/v5.1.0/well-known`
- **Current OAuth2 Docs:** `OAUTH2-README.md`, `OAUTH2-OIDC-INTEGRATION-PREP.md`
- **Arctic OAuth2 Library:** https://github.com/pilcrowOnPaper/arctic
- **OpenID Connect Discovery:** https://openid.net/specs/openid-connect-discovery-1_0.html

---

## Questions?

For detailed implementation instructions, see **MULTI-OIDC-PROVIDER-IMPLEMENTATION.md**

For OBP-Portal reference implementation, see:
- `OBP-Portal/src/lib/oauth/providerManager.ts`
- `OBP-Portal/src/lib/oauth/providerFactory.ts`
- `OBP-Portal/src/lib/oauth/client.ts`
