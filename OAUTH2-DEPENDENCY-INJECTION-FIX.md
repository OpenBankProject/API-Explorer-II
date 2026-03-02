# OAuth2 Dependency Injection Fix

## Problem

When the OAuth2 authorization flow was initiated, the `OAuth2AuthorizationMiddleware` was receiving a `ContainerInstance` object instead of the actual `OAuth2Service` instance. This caused the following error:

```
OAuth2AuthorizationMiddleware: oauth2Service is: ContainerInstance {
  services: [...],
  id: 'default'
}
OAuth2AuthorizationMiddleware: oauth2Service type: object
OAuth2AuthorizationMiddleware: isInitialized is not a function
OAuth2AuthorizationMiddleware: Available methods: [ 'services', 'id' ]
```

## Root Cause

The issue was caused by how `routing-controllers` handles dependency injection when using the `@UseBefore()` decorator with middleware classes.

When you use `@UseBefore(OAuth2AuthorizationMiddleware)` on a controller, `routing-controllers` attempts to instantiate the middleware, but the constructor parameter injection wasn't working correctly with TypeDI despite calling `useContainer(Container)`.

### Original Code (Broken)

```typescript
@Service()
export default class OAuth2AuthorizationMiddleware implements ExpressMiddlewareInterface {
  constructor(private oauth2Service: OAuth2Service) {}
  
  async use(request: Request, response: Response): Promise<void> {
    // oauth2Service was receiving ContainerInstance instead of OAuth2Service
    if (!this.oauth2Service.isInitialized()) { // Error: isInitialized is not a function
      // ...
    }
  }
}
```

## Solution

Instead of relying on constructor parameter injection, we explicitly retrieve the `OAuth2Service` from the TypeDI container inside the constructor:

### Fixed Code

```typescript
import { Service, Container } from 'typedi'
import { OAuth2Service } from '../services/OAuth2Service'

@Service()
export default class OAuth2AuthorizationMiddleware implements ExpressMiddlewareInterface {
  private oauth2Service: OAuth2Service

  constructor() {
    // Explicitly get OAuth2Service from the container to avoid injection issues
    this.oauth2Service = Container.get(OAuth2Service)
  }

  async use(request: Request, response: Response): Promise<void> {
    // Now oauth2Service is correctly the OAuth2Service instance
    if (!this.oauth2Service.isInitialized()) {
      // Works correctly
    }
  }
}
```

## Files Modified

1. **`server/middlewares/OAuth2AuthorizationMiddleware.ts`**
   - Changed from constructor parameter injection to explicit container retrieval
   - Removed debugging console.log statements

2. **`server/middlewares/OAuth2CallbackMiddleware.ts`**
   - Applied the same fix for consistency
   - Changed from constructor parameter injection to explicit container retrieval

## Why This Works

By using `Container.get(OAuth2Service)` explicitly:

1. We bypass the problematic parameter injection mechanism
2. TypeDI correctly resolves the service as a singleton
3. The same instance that was initialized in `app.ts` is retrieved
4. All methods (`isInitialized()`, `createAuthorizationURL()`, etc.) are available

## Testing

After this fix, the OAuth2 flow should work correctly:

1. User navigates to `/api/oauth2/connect`
2. `OAuth2AuthorizationMiddleware` successfully retrieves `OAuth2Service`
3. PKCE parameters are generated
4. User is redirected to the OIDC provider
5. After authentication, callback to `/api/oauth2/callback` works
6. `OAuth2CallbackMiddleware` exchanges the code for tokens
7. User information is retrieved and stored in session
8. User is redirected back to the original page

## Related Documentation

- [OAUTH2-README.md](./OAUTH2-README.md) - Main OAuth2/OIDC documentation
- [OAUTH2-QUICK-START.md](./OAUTH2-QUICK-START.md) - Quick start guide
- [OAUTH2-IMPLEMENTATION-STATUS.md](./OAUTH2-IMPLEMENTATION-STATUS.md) - Implementation status

## Technical Notes

### Why Not Global Middleware Registration?

We could have registered the middleware globally in `useExpressServer()` configuration, but using `@UseBefore()` provides:
- Better route-specific control
- Clearer code organization
- Explicit middleware ordering per endpoint

### TypeDI Singleton Behavior

The `@Service()` decorator on `OAuth2Service` makes it a singleton by default, so:
- `Container.get(OAuth2Service)` always returns the same instance
- The instance initialized in `app.ts` with `initializeFromWellKnown()` is the same one used in middleware
- No duplicate initialization occurs

## Date

December 2024
