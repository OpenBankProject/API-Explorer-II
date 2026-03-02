# OAuth2 Bearer Token Implementation
## API Explorer II - Complete OAuth2/OIDC Integration Summary

**Date:** December 2024  
**Status:** ✅ Completed and Tested

---

## 🎯 Overview

This document summarizes the complete OAuth2/OIDC integration with Bearer token authentication support for API Explorer II. The implementation allows users to authenticate via OAuth2/OIDC and make authenticated API calls to OBP-API using Bearer tokens.

---

## 🔧 Problem Solved

### Initial Issues

1. **Dependency Injection Problem**
   - TypeDI container was not properly injecting services into controllers and middlewares
   - `routing-controllers` was passing `ContainerInstance` instead of actual service instances
   - Error: `isInitialized is not a function`

2. **Wrong Login Endpoint**
   - Frontend components were using `/api/connect` 
   - Correct endpoint is `/api/oauth2/connect`

3. **Client Registration Mismatch**
   - Using client name (`obp-explorer-ii-client`) instead of client ID (UUID)
   - OBP-OIDC requires the actual CLIENT_ID UUID for authentication

4. **Missing Bearer Token Support**
   - After OAuth2 login, API calls were failing with 401 errors
   - `OBPClientService` only supported OAuth 1.0a
   - No mechanism to use OAuth2 access tokens for OBP-API calls

---

## 🛠️ Implementation Details

### 1. Fixed Dependency Injection

**Problem:** Constructor parameter injection not working with TypeDI and routing-controllers

**Solution:** Explicitly retrieve services from the Container in constructors

**Files Modified:**
- `server/middlewares/OAuth2AuthorizationMiddleware.ts`
- `server/middlewares/OAuth2CallbackMiddleware.ts`
- `server/controllers/StatusController.ts`
- `server/controllers/RequestController.ts`
- `server/controllers/OpeyIIController.ts`
- `server/controllers/UserController.ts`

**Pattern Used:**
```typescript
import { Service, Container } from 'typedi'

@Service()
export class MyController {
  private myService: MyService

  constructor() {
    // Explicitly get service from container
    this.myService = Container.get(MyService)
  }
}
```

**Why This Works:**
- Bypasses problematic parameter injection mechanism
- TypeDI correctly resolves services as singletons
- Same initialized instance is used throughout the application

---

### 2. Updated Frontend Login Links

**Files Modified:**
- `src/components/HeaderNav.vue`
- `src/components/ChatWidget.vue`
- `src/components/ChatWidgetOld.vue`

**Changes:**
```vue
<!-- Before -->
<a href="/api/connect">Login</a>

<!-- After -->
<a href="/api/oauth2/connect">Login</a>
```

---

### 3. Fixed ES Module Export

**Problem:** `shared-constants.js` was compiled as CommonJS, causing Vite import errors

**File Modified:** `shared-constants.js`

**Before:**
```javascript
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_OBP_API_VERSION = 'v6.0.0';
```

**After:**
```javascript
// ES Module format for Vite compatibility
export const DEFAULT_OBP_API_VERSION = 'v6.0.0'
```

---

### 4. Corrected OAuth2 Configuration

**File Modified:** `env_ai`

**Changes:**
```bash
# Use actual CLIENT_ID UUID from OBP-OIDC, not the client name
VITE_OBP_OAUTH2_CLIENT_ID=48ac28e9-9ee3-47fd-8448-69a62764b779

# Use actual CLIENT_SECRET from OBP-OIDC
VITE_OBP_OAUTH2_CLIENT_SECRET=fOTQF7jfg8C74u7ZhSjVQpoBYvD0KpWfM5UsEZBSFFM

# Include /api prefix in redirect URL
VITE_OBP_OAUTH2_REDIRECT_URL=http://localhost:5173/api/oauth2/callback
```

**OBP-OIDC Registration:**
```
CLIENT_NAME: obp-explorer-ii-client
CLIENT_ID: 48ac28e9-9ee3-47fd-8448-69a62764b779
CLIENT_SECRET: fOTQF7jfg8C74u7ZhSjVQpoBYvD0KpWfM5UsEZBSFFM
REDIRECT_URIS: http://localhost:5173/api/oauth2/callback
```

---

### 5. Implemented Bearer Token Support

#### A. Updated OAuth2CallbackMiddleware

**File:** `server/middlewares/OAuth2CallbackMiddleware.ts`

**Added:** Creation of `clientConfig` with OAuth2 access token

```typescript
// Create clientConfig for OBP API calls with OAuth2 Bearer token
session['clientConfig'] = {
  baseUri: process.env.VITE_OBP_API_HOST || 'http://localhost:8080',
  version: process.env.VITE_OBP_API_VERSION || 'v5.1.0',
  oauth2: {
    accessToken: tokenResponse.accessToken,
    tokenType: tokenResponse.tokenType || 'Bearer'
  }
}
```

**Why This Matters:**
- Makes OAuth2 sessions compatible with existing controller code
- Controllers expect `session['clientConfig']` for API calls
- Enables seamless transition from OAuth 1.0a to OAuth2

#### B. Enhanced OBPClientService

**File:** `server/services/OBPClientService.ts`

**Added:**
1. Extended type definition for OAuth2 support
2. Detection logic for OAuth2 vs OAuth 1.0a
3. Four new private methods for Bearer token authentication

**Type Extension:**
```typescript
interface ExtendedAPIClientConfig extends APIClientConfig {
  oauth2?: {
    accessToken: string
    tokenType: string
  }
}
```

**Detection Logic:**
```typescript
async get(path: string, clientConfig: any): Promise<any> {
  const config = this.getSessionConfig(clientConfig) as ExtendedAPIClientConfig
  
  // Check if OAuth2 Bearer token authentication should be used
  if (config.oauth2?.accessToken) {
    return await this.getWithBearer(path, config.oauth2.accessToken)
  }
  
  // Fall back to OAuth 1.0a
  return await get<API.Any>(config, Any)(GetAny)(path)
}
```

**New Bearer Token Methods:**
- `getWithBearer()` - GET requests with Bearer token
- `createWithBearer()` - POST requests with Bearer token
- `updateWithBearer()` - PUT requests with Bearer token
- `discardWithBearer()` - DELETE requests with Bearer token

**Implementation Example:**
```typescript
private async getWithBearer(path: string, accessToken: string): Promise<any> {
  const url = `${this.clientConfig.baseUri}${path}`
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
    console.error('OBPClientService: GET request failed:', response.status, errorText)
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }

  return await response.json()
}
```

---

## 🔄 Authentication Flow

### Complete OAuth2/OIDC Flow with Bearer Token

```
1. User clicks "Login" button
   ↓
2. Redirected to /api/oauth2/connect
   ↓
3. OAuth2AuthorizationMiddleware:
   - Generates PKCE parameters (code_verifier, code_challenge)
   - Generates state for CSRF protection
   - Stores in session
   - Redirects to OBP-OIDC authorization endpoint
   ↓
4. User authenticates at OBP-OIDC
   ↓
5. OBP-OIDC redirects back to /api/oauth2/callback?code=XXX&state=YYY
   ↓
6. OAuth2CallbackMiddleware:
   - Validates state parameter
   - Exchanges authorization code for tokens using PKCE code_verifier
   - Retrieves user info from UserInfo endpoint
   - Stores in session:
     * oauth2_access_token
     * oauth2_refresh_token
     * oauth2_id_token
     * oauth2_user (user info)
     * clientConfig (with oauth2.accessToken for API calls)
   - Redirects to original page
   ↓
7. User makes API call (e.g., GET /obp/v5.1.0/banks)
   ↓
8. Controller gets session['clientConfig']
   ↓
9. OBPClientService.get() called
   ↓
10. Service detects config.oauth2.accessToken exists
   ↓
11. Calls getWithBearer() with access token
   ↓
12. Makes HTTP request to OBP-API with:
    Authorization: Bearer {access_token}
   ↓
13. OBP-API validates token and returns data
   ↓
14. Response returned to frontend
```

---

## 📋 Session Data Structure

### OAuth2 Session Data

```typescript
{
  // OAuth2 tokens
  oauth2_access_token: string,
  oauth2_refresh_token: string,
  oauth2_id_token: string,
  oauth2_token_type: "Bearer",
  oauth2_expires_in: number,
  oauth2_token_timestamp: number,
  
  // User information
  oauth2_user: {
    sub: string,
    email: string,
    username: string,
    name: string,
    given_name: string,
    family_name: string,
    preferred_username: string,
    email_verified: boolean,
    picture: string,
    provider: "oauth2"
  },
  
  // User info from OIDC UserInfo endpoint
  oauth2_user_info: {
    // Full UserInfo response
  },
  
  // Compatible config for OBP API calls
  clientConfig: {
    baseUri: "http://localhost:8080",
    version: "v5.1.0",
    oauth2: {
      accessToken: string,
      tokenType: "Bearer"
    }
  }
}
```

---

## 🧪 Testing

### Manual Testing Checklist

- [x] OAuth2 login flow completes successfully
- [x] User is redirected back to original page after login
- [x] Session persists across page refreshes
- [x] GET /obp/v5.1.0/users/current returns authenticated user
- [x] GET /obp/v5.1.0/banks returns bank list
- [x] POST requests work with Bearer token
- [x] PUT requests work with Bearer token
- [x] DELETE requests work with Bearer token
- [x] Logout clears all OAuth2 session data
- [x] Token refresh works when access token expires

### Test Commands

```bash
# 1. Check current user (should return user data, not 401)
curl http://localhost:8085/api/status \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"

# 2. Verify Bearer token is used in logs
# Look for: "OBPClientService: GET request with Bearer token to:"

# 3. Test API Explorer GUI
# - Login via OAuth2
# - Navigate to Messages or Banks tab
# - Verify data loads without 401 errors
```

---

## 🎓 Key Learnings

### 1. TypeDI and routing-controllers Integration

**Issue:** Constructor parameter injection doesn't work reliably with routing-controllers

**Solution:** Use explicit `Container.get()` in constructors

**Lesson:** When integrating multiple frameworks, always verify DI behavior

### 2. Client ID vs Client Name

**Issue:** OAuth2 providers use UUIDs as client IDs, not friendly names

**Solution:** Always use the UUID from provider, store name for documentation

**Lesson:** Check provider logs to confirm exact client registration format

### 3. Session Compatibility

**Issue:** Different auth methods need different session structures

**Solution:** Create compatible session structure that works for both patterns

**Lesson:** When migrating auth systems, maintain backward compatibility in session data

### 4. Bearer Token Authentication

**Issue:** OBP API supports both OAuth 1.0a and OAuth2 Bearer tokens

**Solution:** Detect auth type and route to appropriate implementation

**Lesson:** Support multiple auth methods during transition period

---

## 📚 Related Documentation

- [OAUTH2-README.md](./OAUTH2-README.md) - Main OAuth2/OIDC documentation
- [OAUTH2-QUICK-START.md](./OAUTH2-QUICK-START.md) - Quick start guide
- [OAUTH2-DEPENDENCY-INJECTION-FIX.md](./OAUTH2-DEPENDENCY-INJECTION-FIX.md) - DI issue details
- [OAUTH2-IMPLEMENTATION-STATUS.md](./OAUTH2-IMPLEMENTATION-STATUS.md) - Implementation status

---

## 🚀 Production Considerations

### Security

1. **Token Storage**
   - Access tokens stored in Redis-backed sessions
   - HttpOnly cookies prevent XSS attacks
   - Secure flag should be enabled in production

2. **Token Refresh**
   - Refresh tokens are stored and can be used
   - `UserController.current()` checks token expiry
   - Automatic refresh implemented for expired tokens

3. **HTTPS Required**
   - All OAuth2 flows should use HTTPS in production
   - Update `VITE_OBP_OAUTH2_REDIRECT_URL` to https://
   - Configure nginx/reverse proxy for SSL termination

### Configuration

**Production Environment Variables:**
```bash
# Use production OIDC provider
VITE_OBP_OAUTH2_WELL_KNOWN_URL=https://auth.yourdomain.com/.well-known/openid-configuration

# Use production client credentials
VITE_OBP_OAUTH2_CLIENT_ID=<production-client-uuid>
VITE_OBP_OAUTH2_CLIENT_SECRET=<production-secret>

# Use HTTPS redirect URL
VITE_OBP_OAUTH2_REDIRECT_URL=https://explorer.yourdomain.com/api/oauth2/callback

# Enable secure cookies
NODE_ENV=production

# Use secure Redis connection
VITE_OBP_REDIS_URL=rediss://production-redis:6379
```

### Monitoring

**Log Messages to Monitor:**
- `OAuth2Service: Initialization successful` - Startup check
- `OAuth2CallbackMiddleware: Authentication flow complete` - Successful logins
- `OBPClientService: GET request with Bearer token to:` - API calls using OAuth2
- `UserController: Token refresh successful` - Automatic token refresh
- Token exchange failures (indicate provider issues)
- Bearer token authentication failures (indicate token issues)

### Performance

- Redis session store provides fast session lookup
- Bearer token requests are stateless at OBP-API level
- Consider implementing token caching if needed
- Monitor OBP-API response times with Bearer tokens

---

## 🔍 Debugging Tips

### Check Session Data
```javascript
// In browser console
document.cookie

// In Redis CLI
redis-cli
> KEYS sess:*
> GET sess:YOUR_SESSION_ID
```

### Enable Debug Logging
```bash
# Server logs
DEBUG=express-session npm run dev

# Check OAuth2 flow
# Look for logs prefixed with "OAuth2"
```

### Common Issues

**Issue: 401 errors after login**
- Check: `session['clientConfig']` exists
- Check: `clientConfig.oauth2.accessToken` is set
- Check: Token not expired
- Solution: Verify OAuth2CallbackMiddleware creates clientConfig

**Issue: "Client validation failed"**
- Check: Using CLIENT_ID UUID, not client name
- Check: CLIENT_SECRET matches OBP-OIDC
- Check: REDIRECT_URI matches OBP-OIDC registration
- Solution: Update env_ai with correct values

**Issue: PKCE validation failed**
- Check: Redis is running (session persistence)
- Check: Session cookie is being set
- Check: code_verifier stored in session
- Solution: Verify Redis connection and session config

---

## ✅ Success Criteria

All criteria met:

1. ✅ User can log in via OAuth2/OIDC
2. ✅ User info displayed in header after login
3. ✅ API calls succeed with Bearer token authentication
4. ✅ `/obp/v5.1.0/users/current` returns authenticated user
5. ✅ `/obp/v5.1.0/banks` returns bank data
6. ✅ No 401 errors for authenticated users
7. ✅ Session persists across page refreshes
8. ✅ Logout clears all session data
9. ✅ Token refresh works automatically
10. ✅ Both OAuth 1.0a and OAuth2 supported (during transition)

---

## 🎉 Conclusion

The OAuth2/OIDC integration with Bearer token support is now fully functional. Users can authenticate via OAuth2 and make authenticated API calls to OBP-API using Bearer tokens. The implementation maintains backward compatibility with OAuth 1.0a during the transition period.

**Key Achievement:** Complete OAuth2 authentication flow with automatic Bearer token injection for OBP API calls, eliminating 401 errors and providing seamless user experience.

**Next Steps:**
1. Deploy to staging environment
2. Conduct thorough testing with real users
3. Monitor logs for any issues
4. Plan migration from OAuth 1.0a to OAuth2 only
5. Update all documentation with production URLs

---

**Status:** ✅ COMPLETE AND WORKING  
**Date Completed:** December 2024  
**Tested By:** Development Team  
**Ready For:** Staging Deployment
