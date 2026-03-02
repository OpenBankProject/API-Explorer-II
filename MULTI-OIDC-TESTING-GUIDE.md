# Multi-OIDC Provider Testing Guide

**Branch:** `multi-login`  
**Date:** 2024  
**Status:** Ready for Testing

---

## Overview

This guide provides step-by-step instructions for testing the multi-OIDC provider login implementation in API Explorer II.

---

## Prerequisites

### 1. OBP API Setup

Ensure your OBP API is running and configured to return well-known URIs:

```bash
# Test the endpoint
curl http://localhost:8080/obp/v5.1.0/well-known

# Expected response:
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

### 2. OIDC Providers Running

Ensure at least one OIDC provider is running:

**OBP-OIDC:**
```bash
# Check if OBP-OIDC is running
curl http://127.0.0.1:9000/obp-oidc/.well-known/openid-configuration
```

**Keycloak (optional):**
```bash
# Check if Keycloak is running
curl http://127.0.0.1:8180/realms/obp/.well-known/openid-configuration
```

### 3. Environment Configuration

Set up your `.env` file with provider credentials:

```bash
# OBP API
VITE_OBP_API_HOST=localhost:8080

# OBP-OIDC Provider
VITE_OBP_OAUTH2_CLIENT_ID=48ac28e9-9ee3-47fd-8448-69a62764b779
VITE_OBP_OAUTH2_CLIENT_SECRET=fOTQF7jfg8C74u7ZhSjVQpoBYvD0KpWfM5UsEZBSFFM
VITE_OBP_OAUTH2_REDIRECT_URL=http://localhost:5173/api/oauth2/callback

# Keycloak Provider (optional)
# VITE_KEYCLOAK_CLIENT_ID=obp-api-explorer
# VITE_KEYCLOAK_CLIENT_SECRET=your-keycloak-secret
# VITE_KEYCLOAK_REDIRECT_URL=http://localhost:5173/api/oauth2/callback

# Session Secret
SESSION_SECRET=your-secure-session-secret

# Redis (if using)
# VITE_OBP_REDIS_URL=redis://localhost:6379
```

---

## Starting the Application

### 1. Switch to Multi-Login Branch

```bash
git checkout multi-login
```

### 2. Install Dependencies (if needed)

```bash
npm install
```

### 3. Start the Backend

```bash
# Terminal 1
npm run dev:backend
```

**Expected output:**
```
--- OAuth2 Multi-Provider Setup ---------------------------------
OAuth2ProviderManager: Fetching well-known URIs from OBP API...
OAuth2ProviderManager: Found 2 providers:
  - obp-oidc: http://127.0.0.1:9000/obp-oidc/.well-known/openid-configuration
  - keycloak: http://127.0.0.1:8180/realms/obp/.well-known/openid-configuration
OAuth2ProviderManager: Initializing providers...
OAuth2ProviderFactory: Loading provider strategies...
  ✓ OBP-OIDC strategy loaded
  ✓ Keycloak strategy loaded
OAuth2ProviderFactory: Loaded 2 provider strategies
OAuth2ProviderFactory: Initializing provider: obp-oidc
OAuth2ClientWithConfig: Fetching OIDC config for obp-oidc from: http://127.0.0.1:9000/obp-oidc/.well-known/openid-configuration
OAuth2ClientWithConfig: OIDC config loaded for obp-oidc
OAuth2ProviderManager: ✓ obp-oidc initialized
OAuth2ProviderFactory: Initializing provider: keycloak
OAuth2ProviderManager: ✓ keycloak initialized
OAuth2ProviderManager: Initialized 2/2 providers
✓ Initialized 2 OAuth2 providers:
  - obp-oidc
  - keycloak
✓ Provider health monitoring started (every 60s)
-----------------------------------------------------------------
Backend is running. You can check a status at http://localhost:8085/api/status
```

### 4. Start the Frontend

```bash
# Terminal 2
npm run dev
```

### 5. Open Browser

Navigate to: http://localhost:5173

---

## Test Scenarios

### Test 1: Provider Discovery

**Objective:** Verify that providers are fetched from OBP API

**Steps:**
1. Open browser developer console
2. Navigate to http://localhost:5173
3. Look for log messages in console

**Expected Console Output:**
```
Available OAuth2 providers: [
  { name: "obp-oidc", available: true, lastChecked: "..." },
  { name: "keycloak", available: true, lastChecked: "..." }
]
Total: 2, Available: 2
```

**✅ Pass Criteria:**
- Providers are logged in console
- `availableCount` matches number of running providers

---

### Test 2: Backend API Endpoint

**Objective:** Test the `/api/oauth2/providers` endpoint

**Steps:**
1. Open a new terminal
2. Run: `curl http://localhost:5173/api/oauth2/providers`

**Expected Response:**
```json
{
  "providers": [
    {
      "name": "obp-oidc",
      "available": true,
      "lastChecked": "2024-01-15T10:30:00.000Z"
    },
    {
      "name": "keycloak",
      "available": true,
      "lastChecked": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 2,
  "availableCount": 2
}
```

**✅ Pass Criteria:**
- HTTP 200 status
- JSON response with providers array
- Each provider has `name`, `available`, `lastChecked` fields

---

### Test 3: Login Button - Multiple Providers

**Objective:** Test provider selection dialog appears

**Steps:**
1. Navigate to http://localhost:5173
2. Ensure you're logged out
3. Look at the "Login" button in the header
4. Click the "Login" button

**Expected Behavior:**
- Login button shows a small down arrow (▼)
- Provider selection dialog appears
- Dialog shows all available providers (OBP-OIDC, Keycloak)
- Each provider shows icon, name, and "Available" status

**✅ Pass Criteria:**
- Dialog opens smoothly
- All available providers are listed
- Provider names are formatted nicely (e.g., "OBP OIDC", "Keycloak")
- Hover effect works (border turns blue, slight translate)

---

### Test 4: Login with OBP-OIDC

**Objective:** Complete login flow with OBP-OIDC provider

**Steps:**
1. Click "Login" button
2. Select "OBP OIDC" from the dialog
3. You should be redirected to OBP-OIDC login page
4. Enter credentials (if prompted)
5. After authentication, you should be redirected back

**Expected URL Flow:**
```
1. http://localhost:5173
2. Click login → Provider selection dialog
3. Select provider → http://localhost:5173/api/oauth2/connect?provider=obp-oidc&redirect=/
4. Server redirects → http://127.0.0.1:9000/obp-oidc/auth?client_id=...&state=...&code_challenge=...
5. After auth → http://localhost:5173/api/oauth2/callback?code=xxx&state=yyy
6. Final redirect → http://localhost:5173/
```

**Expected Console Output (Backend):**
```
OAuth2ConnectController: Starting authentication flow
  Provider: obp-oidc
  Redirect: /
OAuth2ConnectController: Multi-provider mode - obp-oidc
OAuth2ConnectController: Redirecting to obp-oidc authorization endpoint

OAuth2CallbackController: Processing OAuth2 callback
OAuth2CallbackController: Multi-provider mode - obp-oidc
OAuth2CallbackController: Exchanging authorization code for tokens
OAuth2ClientWithConfig: Exchanging authorization code for obp-oidc
OAuth2CallbackController: Tokens received and stored
OAuth2CallbackController: Fetching user info
OAuth2CallbackController: User authenticated via obp-oidc: username
OAuth2CallbackController: Authentication successful, redirecting to: /
```

**✅ Pass Criteria:**
- User is redirected to OBP-OIDC
- After authentication, user is redirected back
- Username appears in header (top right)
- Login button changes to username + logoff button
- Session persists (refresh page, still logged in)

---

### Test 5: Login with Keycloak

**Objective:** Test login with different provider

**Steps:**
1. Log out (if logged in)
2. Click "Login" button
3. Select "Keycloak" from the dialog
4. Complete Keycloak authentication
5. Verify successful login

**Expected Behavior:**
- Same as Test 4, but with Keycloak provider
- Session should store `oauth2_provider: "keycloak"`

**✅ Pass Criteria:**
- Login succeeds with Keycloak
- Username displayed in header
- Session persists

---

### Test 6: Single Provider Mode

**Objective:** Test fallback when only one provider is available

**Steps:**
1. Stop Keycloak (or configure only OBP-OIDC)
2. Restart backend
3. Log out
4. Click "Login" button

**Expected Behavior:**
- No provider selection dialog
- Direct redirect to OBP-OIDC (the only available provider)

**✅ Pass Criteria:**
- No dialog appears
- Immediate redirect to single provider

---

### Test 7: No Providers Available

**Objective:** Test error handling when no providers are available

**Steps:**
1. Stop all OIDC providers (OBP-OIDC, Keycloak)
2. Restart backend
3. Wait 60 seconds for health check
4. Refresh frontend
5. Click "Login" button

**Expected Behavior:**
- Login button might be disabled or show error
- Dialog shows "No identity providers available"

**✅ Pass Criteria:**
- Graceful error handling
- User-friendly error message

---

### Test 8: Provider Health Monitoring

**Objective:** Test real-time health monitoring

**Steps:**
1. Start with all providers running
2. Log in successfully
3. Stop OBP-OIDC (but keep backend running)
4. Wait 60 seconds (health check interval)
5. Check backend console

**Expected Console Output:**
```
OAuth2ProviderManager: Performing health check...
  obp-oidc: ✗ unhealthy (Connection refused)
  keycloak: ✓ healthy
```

**Test frontend:**
6. Log out
7. Click "Login" button
8. Verify only Keycloak appears in provider list

**✅ Pass Criteria:**
- Health check detects provider outage
- Unhealthy providers removed from selection
- Backend logs show health status

---

### Test 9: Session Persistence

**Objective:** Verify session data is stored correctly

**Steps:**
1. Log in with OBP-OIDC
2. Open browser developer tools
3. Go to Application → Cookies → localhost:5173
4. Find session cookie

**Expected Session Data (Backend):**
```javascript
session = {
  oauth2_provider: "obp-oidc",
  oauth2_access_token: "...",
  oauth2_refresh_token: "...",
  oauth2_id_token: "...",
  user: {
    username: "john.doe",
    email: "john@example.com",
    name: "John Doe",
    provider: "obp-oidc",
    sub: "uuid-1234"
  }
}
```

**✅ Pass Criteria:**
- Session cookie exists
- Session contains provider name
- Session contains tokens and user info

---

### Test 10: API Requests with Token

**Objective:** Verify access token is used for API requests

**Steps:**
1. Log in successfully
2. Navigate to API Explorer (resource docs)
3. Try to make an API request (e.g., GET /banks)
4. Check network tab in developer tools

**Expected Behavior:**
- API request includes `Authorization: Bearer <token>` header
- Request succeeds (200 OK)

**✅ Pass Criteria:**
- Authorization header present
- Token matches session token
- API request succeeds

---

### Test 11: Logout Flow

**Objective:** Test logout clears session

**Steps:**
1. Log in successfully
2. Click "Logoff" button in header
3. Verify redirect to home page
4. Check that username is no longer displayed
5. Verify session is cleared

**✅ Pass Criteria:**
- Redirect to home page
- Login button reappears
- Username disappears
- Session cleared (check cookies)

---

### Test 12: Redirect After Login

**Objective:** Test redirect to original page after login

**Steps:**
1. Navigate to http://localhost:5173/resource-docs/OBPv5.1.0
2. Ensure logged out
3. Click "Login" button
4. Select provider and authenticate
5. Verify redirect back to `/resource-docs/OBPv5.1.0`

**Expected URL:**
```
After login: http://localhost:5173/resource-docs/OBPv5.1.0
```

**✅ Pass Criteria:**
- User redirected to original page
- Page state preserved

---

### Test 13: Error Handling - Invalid Provider

**Objective:** Test error handling for invalid provider

**Steps:**
1. Manually navigate to: http://localhost:5173/api/oauth2/connect?provider=invalid-provider
2. Check response

**Expected Response:**
```json
{
  "error": "invalid_provider",
  "message": "Provider \"invalid-provider\" is not available",
  "availableProviders": ["obp-oidc", "keycloak"]
}
```

**✅ Pass Criteria:**
- HTTP 400 status
- Error message displayed
- Available providers listed

---

### Test 14: CSRF Protection (State Validation)

**Objective:** Test state parameter validation

**Steps:**
1. Start login flow
2. Capture callback URL
3. Modify `state` parameter in URL
4. Try to complete callback

**Expected Behavior:**
- Callback rejected
- Redirect to home with error: `?oauth2_error=invalid_state`

**✅ Pass Criteria:**
- Invalid state rejected
- User not authenticated
- Error logged in console

---

### Test 15: Backward Compatibility

**Objective:** Test legacy single-provider mode still works

**Steps:**
1. Remove all provider environment variables except `VITE_OBP_OAUTH2_WELL_KNOWN_URL`
2. Set `VITE_OBP_OAUTH2_WELL_KNOWN_URL=http://127.0.0.1:9000/obp-oidc/.well-known/openid-configuration`
3. Restart backend
4. Try to log in

**Expected Behavior:**
- Falls back to legacy OAuth2Service
- Login works without provider parameter

**✅ Pass Criteria:**
- Login succeeds
- No provider selection dialog
- Direct redirect to OIDC provider

---

## Troubleshooting

### Issue: No providers available

**Symptoms:**
- Provider list is empty
- Login button disabled or shows error

**Checks:**
1. Verify OBP API is running: `curl http://localhost:8080/obp/v5.1.0/well-known`
2. Check backend logs for initialization errors
3. Verify environment variables are set correctly
4. Check OIDC providers are running and accessible

**Solution:**
```bash
# Check OBP API
curl http://localhost:8080/obp/v5.1.0/well-known

# Check OBP-OIDC
curl http://127.0.0.1:9000/obp-oidc/.well-known/openid-configuration

# Restart backend with verbose logging
npm run dev:backend
```

---

### Issue: State mismatch error

**Symptoms:**
- Redirect to home with `?oauth2_error=invalid_state`
- Console shows "State mismatch (CSRF protection)"

**Causes:**
- Session not persisting between requests
- Redis not running (if using Redis sessions)
- Multiple backend instances

**Solution:**
```bash
# If using Redis, ensure it's running
redis-cli ping

# Check session secret is set
echo $SESSION_SECRET

# Clear browser cookies and try again
```

---

### Issue: Token exchange failed

**Symptoms:**
- Error after authentication: "token_exchange_failed"
- Backend logs show 401 or 400 errors

**Causes:**
- Wrong client ID or secret
- OIDC provider configuration mismatch
- Network connectivity issues

**Solution:**
```bash
# Verify client credentials in OIDC provider
# Check backend logs for detailed error
# Verify redirect URI matches exactly
```

---

### Issue: Provider shows as unavailable

**Symptoms:**
- Provider appears in list but marked as unavailable
- Red status indicator

**Causes:**
- OIDC provider is down
- Network connectivity issues
- Health check failed

**Solution:**
```bash
# Check provider is running
curl http://127.0.0.1:9000/obp-oidc/.well-known/openid-configuration

# Check backend logs for health check errors
# Wait 60 seconds for next health check

# Manually retry provider
# POST /api/oauth2/providers/{name}/retry (if implemented)
```

---

## Performance Testing

### Load Testing Login Flow

Test with multiple concurrent users:

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test provider list endpoint
ab -n 100 -c 10 http://localhost:5173/api/oauth2/providers

# Expected: < 100ms response time
```

### Health Check Performance

Monitor health check impact:

```bash
# Watch backend logs during health checks
tail -f backend.log | grep "health check"

# Expected: Health checks complete in < 5 seconds
```

---

## Security Testing

### Test PKCE Implementation

Verify PKCE code challenge:

1. Start login flow
2. Capture authorization URL
3. Verify `code_challenge` and `code_challenge_method=S256` present

### Test State Validation

Verify CSRF protection:

1. Capture callback URL with state
2. Modify state parameter
3. Verify callback is rejected

### Test Token Security

Verify tokens are not exposed:

1. Check tokens are not in URL parameters
2. Check tokens are not logged in console
3. Check tokens are in httpOnly cookies or session only

---

## Acceptance Criteria

### Backend
- [x] Multiple providers fetched from OBP API
- [x] Health monitoring active (60s intervals)
- [x] Provider status tracked correctly
- [x] Login works with multiple providers
- [x] Session stores provider name
- [x] Token exchange succeeds
- [x] User info fetched correctly
- [x] Backward compatible with legacy mode

### Frontend
- [x] Provider list fetched and displayed
- [x] Provider selection dialog appears
- [x] Single provider direct login
- [x] Provider icons and names formatted
- [x] Hover effects work
- [x] Error handling graceful
- [x] Loading states handled

### Integration
- [ ] End-to-end login flow tested
- [ ] Multiple providers tested (OBP-OIDC, Keycloak)
- [ ] Session persistence verified
- [ ] API requests with token verified
- [ ] Logout flow tested
- [ ] Redirect after login tested
- [ ] Error scenarios handled

---

## Test Report Template

```
# Multi-OIDC Provider Test Report

**Date:** YYYY-MM-DD
**Tester:** Name
**Branch:** multi-login
**Commit:** abc1234

## Environment
- OBP API: Running / Not Running
- OBP-OIDC: Running / Not Running
- Keycloak: Running / Not Running
- Backend: Version
- Frontend: Version

## Test Results

### Test 1: Provider Discovery
Status: ✅ Pass / ❌ Fail
Notes: ...

### Test 2: Backend API Endpoint
Status: ✅ Pass / ❌ Fail
Notes: ...

[Continue for all tests...]

## Issues Found
1. Issue description
   - Severity: High / Medium / Low
   - Steps to reproduce
   - Expected behavior
   - Actual behavior

## Overall Assessment
✅ Ready for Production
⚠️  Ready with Minor Issues
❌ Not Ready

## Recommendations
- ...
```

---

## Next Steps

After completing all tests:

1. **Document Issues**: Create GitHub issues for any bugs found
2. **Update Documentation**: Update README.md with multi-provider setup
3. **Create PR**: Create pull request to merge `multi-login` into `develop`
4. **Review**: Request code review from team
5. **Deploy**: Plan deployment to staging/production

---

## Support

If you encounter issues during testing:

1. Check backend logs: `npm run dev:backend`
2. Check browser console for errors
3. Review this guide's troubleshooting section
4. Check implementation documentation: `MULTI-OIDC-PROVIDER-IMPLEMENTATION.md`
5. Contact the development team

---

**Last Updated:** 2024  
**Version:** 1.0
