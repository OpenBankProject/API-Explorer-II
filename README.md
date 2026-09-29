Welcome to the OBP API Explorer II
=================================

# ABOUT

This application is used to explore OBP APIs and interact with the data and services in the context of the logged in user.

This application will gradually replace the original API Explorer. Long live the API Explorer!



## Install the Prerequisite Software
  * required: { node: `>=16.14` }
  * required: { npm: `>=8.0.0` }

### Development Project Setup

  * Setup your .env file (see .env.example)

##### Install dependencies

```sh
yarn install
```
or
```sh
npm install
```

##### Compile and Hot-Reload for Development

```sh
yarn dev
```
or
```sh
npm run dev
```

##### Get a Consumer Key for the OBP-API

API Explorer needs a Consumer Key / Secret to access the Open Bank Project API with OAuth.
To get this Consumer, go to the Portal of OBP-API, login and "Get a Consumer Key".
The callback URL (if running locally) should be http://localhost:5173/api/callback
Copy and paste the Consumer Key and Consumer Secret and add it to your .env file here.
You can use .env.example as a basis of your .env file. 

##### OAuth2 / OIDC login providers

At startup the backend asks OBP-API which OIDC providers are available
(`GET $VITE_OBP_API_HOST/obp/v5.1.0/well-known`) and initializes a login
strategy for each advertised provider that has credentials configured in
`.env`. A provider is only offered on the login page when **both** sides
are configured:

  * **OBP-API side** — the provider must be listed in the
    `oauth2.oidc_provider` props (e.g. `oauth2.oidc_provider=obp-oidc,keycloak,google`)
    and its JWKS URL must be present in `oauth2.jwk_set.url` so OBP-API can
    validate the tokens.
  * **API Explorer side** — the matching `VITE_<PROVIDER>_CLIENT_ID` /
    `VITE_<PROVIDER>_CLIENT_SECRET` pair must be set in `.env`
    (`VITE_OBP_OIDC_*`, `VITE_KEYCLOAK_*`, `VITE_GOOGLE_*`, `VITE_GITHUB_*`,
    or `VITE_CUSTOM_OIDC_*` — see `.env.example`).

> **Migrating an old `.env`:** the legacy `VITE_OBP_OAUTH2_CLIENT_ID` /
> `VITE_OBP_OAUTH2_CLIENT_SECRET` variables are no longer read — rename them to
> `VITE_OBP_OIDC_CLIENT_ID` / `VITE_OBP_OIDC_CLIENT_SECRET`, otherwise the
> obp-oidc provider fails to initialize with "No strategy found".

All providers share one callback URL: `VITE_OAUTH2_REDIRECT_URL`
(default `http://localhost:5173/api/oauth2/callback`). Providers that fail to
initialize (missing credentials, unreachable well-known URL) are logged at
startup and retried every 30 seconds — look for
`OAuth2ProviderFactory: Available strategies: ...` in the log to see what loaded.

###### Login with Google

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   and choose type **Web application**.
2. Add `VITE_OAUTH2_REDIRECT_URL` (e.g. `http://localhost:5173/api/oauth2/callback`)
   as an **Authorized redirect URI**. It must match exactly.
3. Put the generated credentials in `.env`:

   ```
   VITE_GOOGLE_CLIENT_ID=<your-id>.apps.googleusercontent.com
   VITE_GOOGLE_CLIENT_SECRET=<your-secret>
   ```
4. On the OBP-API instance, make sure the props include:

   ```
   oauth2.oidc_provider=obp-oidc,keycloak,google
   oauth2.jwk_set.url=...,https://www.googleapis.com/oauth2/v3/certs
   ```
5. Restart `npm run dev` (env vars are read at process start). The startup log
   should show `OK Google strategy loaded` and `OK google initialized`.

Note: the Explorer sends the Google **id_token** as the Bearer token to
OBP-API (Google access tokens are opaque, not JWTs). OBP-API validates it
against Google's JWKS and auto-creates a user keyed by the token's
`iss` + `sub` claims.

##### Logout behaviour (`VITE_OBP_LOGOUT_MODE`)

Controls what happens when a user logs out (`GET /api/user/logoff`):

  * **`public`** (default) — Full SSO logout. After clearing the local session,
    the user is redirected to the provider's `end_session_endpoint`, ending the
    Keycloak/OIDC session too, so the next login requires credentials. Safe
    default for public-facing or shared machines.
  * **`internal`** — Local-only logout. Clears the app session but leaves the
    provider's SSO session intact, so re-login is silent. Intended for
    deployments used within a single organisation on trusted machines.

Unset or unrecognised values fall back to `public`.

> **Keycloak setup for `public` mode:** add the app's home URL
> (`VITE_OBP_API_EXPLORER_HOST`, e.g. `http://localhost:5173`) to the client's
> **Valid post logout redirect URIs** in the Keycloak admin console, otherwise
> the provider rejects the post-logout redirect.

### Testing

Unit tests are located in `server/test` and `src/test`.

Integration tests are located in `src/test/integration`

##### Run Unit Tests with [Vitest](https://vitest.dev/)

<strike>

```sh
npm test
```
</strike>

##### Run Integration Tests with [Playwright](https://playwright.dev/)



```sh
npx playwright test
```
or if you want a fancy testing UI to see what the browser is doing:
```sh
npx playwright test ui
```


## Compile and Minify for Production

##### Build 

```sh
npm run build
```

##### Build Server 

```sh
npm run build-server
```



##### Start the backend server
```sh
npx ts-node <path-to-your-install>/server/app.js
```

##### Check the status of API-Explorer II back-end
```
Please find a message at a log file similar to this one:

Backend is running. You can check a status at http://localhost:8085/api/status

and use the link to check the status
```


##### Nginx deployment

```config
server {
    # Frontend
    location / {
        root    /path_to_dist/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API
    location /api {
        proxy_pass http://localhost:8085;
    }
}
```

## gRPC connection (gRPC services browser)

The gRPC services page connects to OBP-API over gRPC:

- `VITE_OBP_GRPC_HOST` — explicit gRPC target as `host:port`; always wins when set.
  When unset, the target is derived from `VITE_OBP_API_HOST`:
  - `https://api.example.com` → `grpc.api.example.com:443` (TLS ingress convention)
  - `http://api.example.com` → `grpc.api.example.com:50051`
  - `http://localhost:8080` or an IP → `localhost:50051` / `<ip>:50051` (no `grpc.` prefix)
- `VITE_OBP_GRPC_TLS` — `true` or `false`; forces TLS channel credentials on or off.
  When unset, TLS is inferred from the port of the resolved host: `:443` → TLS on,
  any other port → TLS off. Set this only for setups where the port is not a
  reliable signal (e.g. TLS on a non-443 port).

Note: if you have issues with session stickyness / login issues, enable #DEBUG=express-session in your .env
and if you see messages like these in the log,

```
Dec 10 12:26:18 obp-sandbox node[1060160]: Tue, 10 Dec 2024 12:26:18 GMT express-session no SID sent, generating session
Dec 10 12:26:18 obp-sandbox node[1060160]: Tue, 10 Dec 2024 12:26:18 GMT express-session saving 5JIW_dx9CG8qs0OK4iv7Pn2Kg2huZuvQ
Dec 10 12:26:18 obp-sandbox node[1060160]: Tue, 10 Dec 2024 12:26:18 GMT express-session not secured
Dec 10 12:26:18 obp-sandbox node[1060160]: Tue, 10 Dec 2024 12:26:18 GMT express-session split response
Dec 10 12:26:18 obp-sandbox node[1060160]: Tue, 10 Dec 2024 12:26:18 GMT express-session saving -yf0uzAZf5mP9JVYov9oMR7CxQLnO4wm
Dec 10 12:26:18 obp-sandbox node[1060160]: Tue, 10 Dec 2024 12:26:18 GMT express-session not secured
Dec 10 12:26:18 obp-sandbox node[1060160]: Tue, 10 Dec 2024 12:26:18 GMT express-session no SID sent, generating session
Dec 10 12:26:18 obp-sandbox node[1060160]: Tue, 10 Dec 2024 12:26:18 GMT express-session saving nballQYMYZRn_HG0enM2RIPdv7GAdzJc
Dec 10 12:26:18 obp-sandbox node[1060160]: Tue, 10 Dec 2024 12:26:18 GMT express-session not secured
Dec 10 12:26:18 obp-sandbox node[1060160]: Tue, 10 Dec 2024 12:26:18 GMT express-session no SID sent, generating session
Dec 10 12:26:18 obp-sandbox node[1060160]: Tue, 10 Dec 2024 12:26:18 GMT express-session no SID sent, generating session

```

then make sure your NGINX config includes the $scheme: 

```

proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

```

so that Node knows that the cookies have been sent securely over https.

# Running Opey
If you want to run Opey locally you'll need to have a local instance running. The repo can be found [here](https://github.com/OpenBankProject/OBP-Opey). 

You will need to create a public-private key pair using open ssl (minimum 2048 bits).
1. create the directory ./server/cert
  ```
  mkdir ./server/cert
  cd ./server/cert  
  ```
2. Generate the public private key pair inside the ./server/cert directory
```
openssl genrsa -out private_key.pem 2048
openssl rsa -in private_key.pem -pubout -out public_key.pem
```
3. Copy the public key to Opey top level directory 
```
cp public_key.pem {path-to-your-opey-install}/
```

# Building the frontend container

As the frontend environment is read at build time, we need to reprocess the values 
at container runtime. 
This is done here: Dockerfiles/prestart.go
overwriting the values set here: Dockerfiles/frontend_build.env
Any newly introduced environment variables should be added to the prestart.go and frontend_build.env files accordingly.
# LICENSE

This project is licensed under the AGPL V3 (see NOTICE) and a commercial license from TESOBE.

