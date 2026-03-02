# OAuth2/OIDC Integration Documentation
## API Explorer II with OBP-OIDC

Welcome! This directory contains comprehensive documentation for integrating OAuth2/OpenID Connect authentication into API Explorer II.

---

## 📚 Documentation Overview

This documentation set guides you through migrating API Explorer II from OAuth 1.0a to OAuth2/OIDC using OBP-OIDC as the identity provider.

### Available Documents

1. **[OAUTH2-QUICK-START.md](OAUTH2-QUICK-START.md)** ⭐ **START HERE**
   - 15-minute setup guide
   - Quick implementation checklist
   - Key code snippets
   - Common troubleshooting
   - Perfect for: Developers getting started

2. **[OAUTH2-OIDC-INTEGRATION-PREP.md](OAUTH2-OIDC-INTEGRATION-PREP.md)** 📖 **COMPLETE GUIDE**
   - Full preparation document (60 pages)
   - Architecture and design decisions
   - Phase-by-phase implementation plan
   - Testing strategy
   - Production deployment guide
   - Perfect for: Project planning and deep understanding

---

## 🎯 Quick Navigation

### For Developers

**Just getting started?**
→ Read [OAUTH2-QUICK-START.md](OAUTH2-QUICK-START.md)

**Need implementation details?**
→ See [OAUTH2-OIDC-INTEGRATION-PREP.md](OAUTH2-OIDC-INTEGRATION-PREP.md) Section 6 (Implementation Phases)

**Having issues?**
→ Check [OAUTH2-QUICK-START.md](OAUTH2-QUICK-START.md) Common Issues section
→ Or [OAUTH2-OIDC-INTEGRATION-PREP.md](OAUTH2-OIDC-INTEGRATION-PREP.md) Appendix B (Troubleshooting)

### For Project Managers

**Need an overview?**
→ Read [OAUTH2-OIDC-INTEGRATION-PREP.md](OAUTH2-OIDC-INTEGRATION-PREP.md) Section 1 (Executive Summary)

**Want timeline?**
→ See [OAUTH2-OIDC-INTEGRATION-PREP.md](OAUTH2-OIDC-INTEGRATION-PREP.md) Section 6 (Implementation Phases - 6 weeks)

**Need risk assessment?**
→ Check [OAUTH2-OIDC-INTEGRATION-PREP.md](OAUTH2-OIDC-INTEGRATION-PREP.md) Section 12 (Rollback Plan)

### For System Administrators

**Production deployment?**
→ See [OAUTH2-OIDC-INTEGRATION-PREP.md](OAUTH2-OIDC-INTEGRATION-PREP.md) Section 11 (Deployment Considerations)

**Configuration needed?**
→ Check [OAUTH2-OIDC-INTEGRATION-PREP.md](OAUTH2-OIDC-INTEGRATION-PREP.md) Section 8 (Configuration Changes)

**Production readiness?**
→ Use [OAUTH2-OIDC-INTEGRATION-PREP.md](OAUTH2-OIDC-INTEGRATION-PREP.md) Appendix C (Production Readiness Checklist)

---

## 🚀 Getting Started in 3 Steps

### Step 1: Read the Quick Start (15 min)

```bash
# Open the quick start guide
cat OAUTH2-QUICK-START.md
# Or open in your editor/browser
```

### Step 2: Set Up OBP-OIDC (5 min)

```bash
cd ~/Documents/workspace_2024/OBP-OIDC
cp run-server.example.sh run-server.sh
# Edit run-server.sh with your database credentials
./run-server.sh
```

### Step 3: Configure API Explorer II (5 min)

```bash
cd ~/Documents/workspace_2024/API-Explorer-II
npm install arctic jsonwebtoken @types/jsonwebtoken

# Add to .env:
VITE_USE_OAUTH2=true
VITE_OBP_OAUTH2_CLIENT_ID=obp-explorer-ii-client
VITE_OBP_OAUTH2_CLIENT_SECRET=CHANGE_THIS_TO_EXPLORER_SECRET_2024
VITE_OBP_OAUTH2_REDIRECT_URL=http://localhost:5173/oauth2/callback
VITE_OBP_OAUTH2_WELL_KNOWN_URL=http://127.0.0.1:9000/obp-oidc/.well-known/openid-configuration
```

---

## 📋 Implementation Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| **Phase 1** | Week 1 | Preparation & Setup |
| **Phase 2** | Week 2-3 | Backend OAuth2 Implementation |
| **Phase 3** | Week 3 | Environment Configuration |
| **Phase 4** | Week 4 | Frontend Updates |
| **Phase 5** | Week 5 | Testing |
| **Phase 6** | Week 6 | Documentation & Migration |

**Total:** 6 weeks for complete implementation and testing

---

## 🎨 Architecture Overview

### Current State (OAuth 1.0a)
```
User → Login → OAuth 1.0a Flow → OBP-API → Callback → Session
```

### Target State (OAuth2/OIDC)
```
User → Login → OAuth2 Flow → OBP-OIDC → Token Exchange → Session
                                ↓
                            JWT Tokens (Access + Refresh + ID)
```

### Key Changes

| Aspect | Before (OAuth 1.0a) | After (OAuth2/OIDC) |
|--------|---------------------|---------------------|
| **Auth Method** | HMAC-SHA1 signatures | Bearer tokens (JWT) |
| **Tokens** | Access token + secret | Access + Refresh + ID tokens |
| **User Info** | API calls | ID token claims |
| **Refresh** | Not supported | Automatic refresh |
| **Providers** | Single (OBP-API) | Multiple (OBP-OIDC, Keycloak, etc.) |

---

## 🔑 Key Features

### OAuth2/OIDC Benefits

✅ **Modern Standard** - Industry-standard authentication
✅ **Better Security** - JWT tokens, PKCE flow, short-lived tokens
✅ **Auto Refresh** - Seamless token renewal
✅ **Multi-Provider** - Support for multiple identity providers
✅ **Better UX** - SSO capabilities, cleaner flow
✅ **Mobile Ready** - Native OAuth2 support in mobile apps

### Backward Compatibility

✅ **Feature Flag** - Switch between OAuth 1.0a and OAuth2
✅ **Gradual Migration** - Both methods work simultaneously
✅ **Easy Rollback** - Revert with a single environment variable
✅ **No Breaking Changes** - Existing OAuth 1.0a code untouched

---

## 🛠️ Key Components

### Backend (Node.js/Express/TypeScript)

**New Files:**
- `server/services/OAuth2Service.ts` - OAuth2/OIDC client
- `server/utils/pkce.ts` - PKCE helper functions
- `server/middlewares/OAuth2AuthorizationMiddleware.ts`
- `server/middlewares/OAuth2CallbackMiddleware.ts`
- `server/controllers/OAuth2ConnectController.ts`
- `server/controllers/OAuth2CallbackController.ts`

**Modified Files:**
- `server/app.ts` - Initialize OAuth2Service
- `server/controllers/UserController.ts` - Support both auth methods

### Frontend (Vue 3)

**Modified Files:**
- `src/components/HeaderNav.vue` - Dual auth support

### Dependencies

**New:**
- `arctic` - Modern OAuth2/OIDC client library
- `jsonwebtoken` - JWT parsing and validation

**Existing:** (no changes)
- `express`, `express-session`, `connect-redis`, `redis`

---

## 🧪 Testing

### Test Coverage

- **Unit Tests** - PKCE, OAuth2Service, Middlewares
- **Integration Tests** - Full authentication flow
- **E2E Tests** - Browser automation with Playwright
- **Security Tests** - CSRF, XSS, token validation
- **Performance Tests** - Load testing, benchmarks

### Manual Testing Checklist

- [ ] Login flow (OAuth2)
- [ ] Logout flow
- [ ] Token refresh
- [ ] Session persistence
- [ ] Error handling
- [ ] Multiple browsers/devices
- [ ] Backward compatibility (OAuth 1.0a still works)

---

## 📦 Dependencies

### System Requirements

- **Node.js** >= 16.14
- **npm** >= 8.0.0
- **Redis** >= 6.0
- **PostgreSQL** >= 12 (for OBP database)
- **Java** 11+ (for OBP-OIDC)
- **Maven** 3.6+ (for OBP-OIDC)

### NPM Packages (New)

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
```

---

## 🔒 Security Considerations

### Implemented Security Measures

✅ **PKCE** - Proof Key for Code Exchange (RFC 7636)
✅ **State Parameter** - CSRF protection
✅ **Secure Cookies** - httpOnly, secure flags
✅ **Token Validation** - JWT signature verification
✅ **HTTPS Required** - Production deployment
✅ **Short-lived Tokens** - Access token expiration
✅ **Refresh Rotation** - Refresh token rotation (if supported by provider)

### Production Security Checklist

- [ ] HTTPS enabled for all endpoints
- [ ] Client secrets in secure vault
- [ ] Session secrets strong and rotated
- [ ] Rate limiting implemented
- [ ] Audit logging enabled
- [ ] Security headers configured
- [ ] CORS properly set up

---

## 🚨 Troubleshooting

### Quick Fixes

**"OIDC configuration not initialized"**
```bash
# Check OBP-OIDC is running
curl http://localhost:9000/obp-oidc/.well-known/openid-configuration
```

**"State validation failed"**
```bash
# Check Redis is running
redis-cli ping
# Clear browser cookies and retry
```

**"Code verifier not found"**
```bash
# Check session configuration in server/app.ts
# Verify Redis connection
DEBUG=express-session npm run dev
```

### Getting Help

- 📖 Check [OAUTH2-QUICK-START.md](OAUTH2-QUICK-START.md) Common Issues
- 📖 Read [OAUTH2-OIDC-INTEGRATION-PREP.md](OAUTH2-OIDC-INTEGRATION-PREP.md) Troubleshooting section
- 💬 Ask in #obp-development Slack channel
- 📧 Email: dev@tesobe.com

---

## 🎓 Learning Resources

### OAuth2/OIDC Standards

- **OAuth 2.0 Spec**: https://oauth.net/2/
- **OpenID Connect**: https://openid.net/connect/
- **PKCE (RFC 7636)**: https://oauth.net/2/pkce/
- **OWASP OAuth Guide**: https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheatsheet.html

### Tools

- **OIDC Debugger**: https://oidcdebugger.com/
- **JWT.io**: https://jwt.io/ (decode JWTs)
- **OAuth 2.0 Playground**: https://www.oauth.com/playground/

### Reference Implementations

- **OBP-Portal** (`~/Documents/workspace_2024/OBP-Portal`)
  - Production-ready OAuth2/OIDC implementation
  - Multi-provider support
  - SvelteKit-based (patterns are framework-agnostic)

- **OBP-OIDC** (`~/Documents/workspace_2024/OBP-OIDC`)
  - Minimal OIDC provider
  - Perfect for development/testing
  - Scala/http4s implementation

---

## 📞 Support

### For Technical Questions

- **Development Team**: dev@tesobe.com
- **Internal Slack**: #obp-development
- **Documentation**: This directory

### For Security Issues

- **Security Team**: security@tesobe.com
- **Follow**: Responsible disclosure guidelines

### For Production Issues

- **On-call Team**: oncall@tesobe.com
- **Status Page**: status.openbankproject.com

---

## 📝 Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024 | Initial documentation created |

---

## ✅ Next Actions

### For New Developers

1. ✅ Read this overview (you're here!)
2. ⬜ Read [OAUTH2-QUICK-START.md](OAUTH2-QUICK-START.md)
3. ⬜ Set up local environment
4. ⬜ Test OAuth2 login flow
5. ⬜ Review [OAUTH2-OIDC-INTEGRATION-PREP.md](OAUTH2-OIDC-INTEGRATION-PREP.md) for details

### For Implementation Team

1. ✅ Review all documentation
2. ⬜ Set up OBP-OIDC server
3. ⬜ Create implementation branch
4. ⬜ Follow Phase 1 (Preparation) in main document
5. ⬜ Begin Phase 2 (Backend Implementation)

### For Project Stakeholders

1. ✅ Review Executive Summary (Section 1 of main doc)
2. ⬜ Review timeline (6 weeks)
3. ⬜ Approve implementation phases
4. ⬜ Schedule kickoff meeting
5. ⬜ Assign resources

---

## 🎯 Success Criteria

Implementation is complete when:

- ✅ OAuth2 login flow works end-to-end
- ✅ Token refresh works automatically
- ✅ All tests passing (unit, integration, E2E)
- ✅ Documentation updated
- ✅ Backward compatibility maintained (OAuth 1.0a still works)
- ✅ Production deployment successful
- ✅ Monitoring and alerts configured
- ✅ Team trained on new system

---

**Ready to begin? Start with [OAUTH2-QUICK-START.md](OAUTH2-QUICK-START.md)!**

---

**License:** AGPL V3  
**Copyright:** 2024 TESOBE GmbH  
**Project:** Open Bank Project - API Explorer II
