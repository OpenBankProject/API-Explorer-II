# OAuth2/OIDC Quick Start Guide
## API Explorer II Integration with OBP-OIDC

**Quick reference for developers getting started with OAuth2/OIDC integration**

---

## 🚀 Quick Setup (15 minutes)

### Step 1: Set Up OBP-OIDC (5 minutes)

```bash
# Navigate to OBP-OIDC directory
cd ~/Documents/workspace_2024/OBP-OIDC

# Copy example configuration
cp run-server.example.sh run-server.sh

# Edit database credentials (IMPORTANT!)
vim run-server.sh
# Update: DB_HOST, DB_PORT, DB_NAME, OIDC_USER_PASSWORD, OIDC_ADMIN_PASSWORD

# Start the OIDC server
./run-server.sh
```

**Verify it's running:**
```bash
curl http://localhost:9000/obp-oidc/.well-known/openid-configuration
```

### Step 2: Configure API Explorer II (5 minutes)

```bash
# Navigate to API Explorer II
cd ~/Documents/workspace_2024/API-Explorer-II

# Install new dependencies
npm install arctic jsonwebtoken @types/jsonwebtoken

# Update .env file
cat >> .env << EOF

# OAuth2/OIDC Configuration
VITE_USE_OAUTH2=true
VITE_OBP_OAUTH2_CLIENT_ID=obp-explorer-ii-client
VITE_OBP_OAUTH2_CLIENT_SECRET=CHANGE_THIS_TO_EXPLORER_SECRET_2024
VITE_OBP_OAUTH2_REDIRECT_URL=http://localhost:5173/oauth2/callback
VITE_OBP_OAUTH2_WELL_KNOWN_URL=http://127.0.0.1:9000/obp-oidc/.well-known/openid-configuration
EOF
```

**Note:** The client secret above matches the default in OBP-OIDC's `run-server.sh`. Change it to your actual secret.

### Step 3: Verify Prerequisites (2 minutes)

```bash
# Check Redis is running
redis-cli ping
# Expected output: PONG

# Check OBP-API is running
curl http://localhost:8080/obp/v5.1.0/root
# Expected: JSON response

# Check Node version
node --version
# Expected: v16.14.0 or higher
```

### Step 4: Test the Setup (3 minutes)

```bash
# Start API Explorer II
npm run dev

# Open browser to http://localhost:5173
# Click "Login" button
# Should redirect to OBP-OIDC login page
```

**Test credentials** (default OBP-OIDC users):
- Username: `user@example.com`
- Password: (check your OBP database)

---

## 📋 Implementation Checklist

Use this checklist to track your implementation progress:

### Phase 1: Backend Core
- [ ] Create `server/utils/pkce.ts`
- [ ] Create `server/services/OAuth2Service.ts`
- [ ] Create `server/middlewares/OAuth2AuthorizationMiddleware.ts`
- [ ] Create `server/middlewares/OAuth2CallbackMiddleware.ts`
- [ ] Create `server/controllers/OAuth2ConnectController.ts`
- [ ] Create `server/controllers/OAuth2CallbackController.ts`
- [ ] Update `server/app.ts` to initialize OAuth2Service

### Phase 2: User Management
- [ ] Update `server/controllers/UserController.ts` getCurrentUser()
- [ ] Update `server/controllers/UserController.ts` logoff()
- [ ] Support both OAuth 1.0a and OAuth2 sessions

### Phase 3: Frontend
- [ ] Update `src/components/HeaderNav.vue` login button
- [ ] Update `src/components/HeaderNav.vue` logout button
- [ ] Add OAuth2 status indicator (optional)

### Phase 4: Testing
- [ ] Write unit tests for PKCE utilities
- [ ] Write unit tests for OAuth2Service
- [ ] Write integration tests for login flow
- [ ] Manual testing of full authentication flow

### Phase 5: Documentation
- [ ] Update README.md
- [ ] Create migration guide
- [ ] Create troubleshooting guide

---

## 🔑 Key Files to Create

### 1. PKCE Utilities (`server/utils/pkce.ts`)

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

### 2. OAuth2 Service (`server/services/OAuth2Service.ts`)

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

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('OAuth2 configuration incomplete')
    }

    this.client = new OAuth2Client(clientId, clientSecret, redirectUri)
  }

  async initializeFromWellKnown(wellKnownUrl: string): Promise<void> {
    const response = await fetch(wellKnownUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch OIDC config: ${response.statusText}`)
    }
    this.oidcConfig = await response.json()
  }

  createAuthorizationURL(state: string, scopes: string[] = ['openid', 'profile', 'email']): URL {
    if (!this.oidcConfig) {
      throw new Error('OIDC configuration not initialized')
    }
    return this.client.createAuthorizationURL(this.oidcConfig.authorization_endpoint, state, scopes)
  }

  async exchangeCodeForTokens(code: string, codeVerifier: string): Promise<any> {
    if (!this.oidcConfig) {
      throw new Error('OIDC configuration not initialized')
    }
    return await this.client.validateAuthorizationCode(
      this.oidcConfig.token_endpoint,
      code,
      codeVerifier
    )
  }

  async getUserInfo(accessToken: string): Promise<any> {
    if (!this.oidcConfig) {
      throw new Error('OIDC configuration not initialized')
    }
    const response = await fetch(this.oidcConfig.userinfo_endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    if (!response.ok) {
      throw new Error(`UserInfo request failed: ${response.statusText}`)
    }
    return await response.json()
  }
}
```

### 3. Authorization Middleware (`server/middlewares/OAuth2AuthorizationMiddleware.ts`)

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

    if (redirectPage) {
      session['redirectPage'] = redirectPage
    }

    // Generate PKCE parameters
    const codeVerifier = PKCEUtils.generateCodeVerifier()
    const codeChallenge = PKCEUtils.generateCodeChallenge(codeVerifier)
    const state = PKCEUtils.generateState()

    // Store in session
    session['oauth2_state'] = state
    session['oauth2_code_verifier'] = codeVerifier

    // Create authorization URL
    const authUrl = this.oauth2Service.createAuthorizationURL(state)
    authUrl.searchParams.set('code_challenge', codeChallenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')

    console.log('OAuth2: Redirecting to authorization endpoint')
    response.redirect(authUrl.toString())
  }
}
```

### 4. Callback Middleware (`server/middlewares/OAuth2CallbackMiddleware.ts`)

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
    if (!state || state !== session['oauth2_state']) {
      console.error('OAuth2: State validation failed')
      return response.status(400).send('Invalid state parameter')
    }

    // Get code verifier
    const codeVerifier = session['oauth2_code_verifier']
    if (!codeVerifier) {
      console.error('OAuth2: Code verifier not found')
      return response.status(400).send('Invalid session state')
    }

    try {
      // Exchange code for tokens
      const tokens = await this.oauth2Service.exchangeCodeForTokens(code, codeVerifier)

      // Get user info
      const userInfo = await this.oauth2Service.getUserInfo(tokens.accessToken())

      // Store in session
      session['oauth2_access_token'] = tokens.accessToken()
      session['oauth2_refresh_token'] = tokens.refreshToken?.() || null
      session['oauth2_id_token'] = tokens.idToken?.() || null
      session['oauth2_user_info'] = userInfo

      // Decode ID token
      const idToken = tokens.idToken?.()
      if (idToken) {
        const decoded: any = jwt.decode(idToken)
        session['oauth2_user'] = {
          sub: decoded.sub,
          email: decoded.email,
          name: decoded.name,
          username: decoded.preferred_username || decoded.sub
        }
      }

      // Clear flow parameters
      delete session['oauth2_state']
      delete session['oauth2_code_verifier']

      // Redirect
      const redirectPage = session['redirectPage'] || process.env.VITE_OBP_API_EXPLORER_HOST
      delete session['redirectPage']

      console.log('OAuth2: Authentication successful')
      response.redirect(redirectPage as string)
    } catch (error: any) {
      console.error('OAuth2: Token exchange failed:', error)
      response.status(500).send('Authentication failed: ' + error.message)
    }
  }
}
```

---

## 🧪 Testing Your Implementation

### Manual Testing Flow

1. **Start all services:**
   ```bash
   # Terminal 1: OBP-OIDC
   cd ~/Documents/workspace_2024/OBP-OIDC
   ./run-server.sh

   # Terminal 2: Redis
   redis-server

   # Terminal 3: API Explorer II
   cd ~/Documents/workspace_2024/API-Explorer-II
   npm run dev
   ```

2. **Test login flow:**
   - Open http://localhost:5173
   - Click "Login" button
   - Should redirect to http://localhost:9000/obp-oidc/auth
   - Enter credentials
   - Should redirect back to http://localhost:5173
   - Username should appear in header

3. **Test session persistence:**
   - Refresh the page
   - Should remain logged in
   - Username still visible

4. **Test logout:**
   - Click "Logout" button
   - Should redirect to home
   - No longer authenticated

### Debugging Tips

**Enable debug logging:**
```bash
DEBUG=express-session npm run dev
```

**Check session in Redis:**
```bash
redis-cli
> KEYS sess:*
> GET sess:<your_session_id>
```

**Check OIDC configuration:**
```bash
curl http://localhost:9000/obp-oidc/.well-known/openid-configuration | jq
```

**Monitor logs:**
- Watch server console for "OAuth2:" prefixed messages
- Watch browser console for errors
- Check OBP-OIDC terminal for authentication attempts

---

## 🐛 Common Issues & Solutions

### Issue: "OIDC configuration not initialized"
**Cause:** Well-known URL not reachable or OAuth2Service not initialized

**Solution:**
```bash
# Check OBP-OIDC is running
curl http://localhost:9000/obp-oidc/.well-known/openid-configuration

# Verify environment variable
echo $VITE_OBP_OAUTH2_WELL_KNOWN_URL

# Check server logs for initialization error
```

### Issue: "State validation failed"
**Cause:** Session not persisting between requests

**Solution:**
```bash
# Check Redis is running
redis-cli ping

# Verify Redis connection in server logs
# Should see: "Connected to Redis instance: ..."

# Check session cookie in browser DevTools (Application > Cookies)
```

### Issue: "Code verifier not found in session"
**Cause:** Session expired or cookie not set

**Solution:**
- Clear browser cookies
- Check session timeout settings in `server/app.ts`
- Verify `VITE_OPB_SERVER_SESSION_PASSWORD` is set

### Issue: "Token request failed: 401"
**Cause:** Invalid client credentials

**Solution:**
```bash
# Verify client credentials match OBP-OIDC configuration
grep OIDC_CLIENT_EXPLORER ~/Documents/workspace_2024/OBP-OIDC/run-server.sh

# Check credentials in .env
grep VITE_OBP_OAUTH2 .env
```

### Issue: Redirect loop
**Cause:** Cookies not being set properly

**Solution:**
- Check cookie settings in `server/app.ts`
- If using nginx, verify `X-Forwarded-Proto` header
- Set `app.set('trust proxy', 1)` if behind reverse proxy

---

## 📚 Additional Resources

### Full Documentation
See `OAUTH2-OIDC-INTEGRATION-PREP.md` for:
- Complete implementation guide
- Architecture details
- Production deployment
- Security considerations
- Testing strategy

### Reference Implementations
- **OBP-Portal**: `~/Documents/workspace_2024/OBP-Portal`
  - `src/lib/oauth/` - OAuth2 implementation
  - `src/hooks.server.ts` - Server initialization
- **OBP-OIDC**: `~/Documents/workspace_2024/OBP-OIDC`
  - `README.md` - OIDC provider documentation

### Standards & Specifications
- OAuth 2.0: https://oauth.net/2/
- OpenID Connect: https://openid.net/connect/
- PKCE: https://oauth.net/2/pkce/

---

## 🎯 Next Steps

After completing the quick start:

1. **Read the full preparation document** (`OAUTH2-OIDC-INTEGRATION-PREP.md`)
2. **Implement remaining phases** (see Phase 2-6 in main document)
3. **Write comprehensive tests** (unit, integration, E2E)
4. **Update documentation** (README, migration guide)
5. **Plan production deployment** (see deployment section in main doc)

---

## 💡 Tips for Success

1. **Keep OAuth 1.0a working** - Don't remove old code until OAuth2 is stable
2. **Use feature flags** - `VITE_USE_OAUTH2` allows easy rollback
3. **Test thoroughly** - OAuth2 flows have many edge cases
4. **Monitor closely** - Watch logs and metrics during rollout
5. **Document everything** - Future you will thank present you

---

**Need Help?**
- Check `OAUTH2-OIDC-INTEGRATION-PREP.md` for detailed guidance
- Review OBP-Portal reference implementation
- Ask in #obp-development Slack channel

**Good luck! 🚀**
