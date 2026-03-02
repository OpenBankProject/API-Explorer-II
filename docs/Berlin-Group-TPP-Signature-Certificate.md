# Berlin Group TPP Signature Certificate Support

## Overview

API Explorer II now supports the Berlin Group NextGenPSD2 standard. When configured with a TPP (Third Party Provider) certificate, the server automatically signs every request to a Berlin Group API endpoint. This enables PSD2-compliant access to Account Information Services (AIS) and Payment Initiation Services (PIS) through banks that implement the Berlin Group standard.

The feature is entirely optional. Without certificate configuration, the application behaves exactly as before.

## What You Need Before Starting

### 1. TPP Certificate Files

You need two PEM files issued by your bank or a qualified trust service provider (QTSP):

- **Private key** (`private_key.pem`) -- RSA private key used to sign requests
- **Certificate** (`certificate.pem`) -- The corresponding TPP certificate that the bank uses to verify your signatures

These are typically provided as part of the TPP onboarding process with the bank.

### 2. Key Identifier

The `keyId` string that identifies your certificate to the bank. This is part of the Signature header and typically looks like:

```
SN=1082, CA=CN=Your Name, O=YourOrg
```

Your bank will tell you what value to use, or it can be derived from the certificate's serial number and issuer.

### 3. OBP-API Backend with Berlin Group Support

The OBP-API instance must serve Berlin Group endpoints at paths like:

```
/berlin-group/v1.3/consents
/berlin-group/v1.3/accounts
/berlin-group/v1.3/payments/sepa-credit-transfers
```

### 4. Redirect URIs (for consent and payment flows)

Two redirect URLs that the bank will use during PSU (Payment Service User) authorization:

- **Success redirect** -- where the user returns after authorizing a consent or payment
- **Error redirect** -- where the user returns if authorization fails or is cancelled

## Setup

### Step 1: Place Certificate Files

Put your PEM files in a location accessible to the server, for example:

```
certs/
  private_key.pem
  certificate.pem
```

### Step 2: Configure Environment Variables

Add these to your `.env` file:

```bash
# Required -- paths to your certificate files
VITE_BG_PRIVATE_KEY_PATH=./certs/private_key.pem
VITE_BG_CERTIFICATE_PATH=./certs/certificate.pem

# Required -- your certificate's key identifier
VITE_BG_KEY_ID=SN=1082, CA=CN=Your Name, O=YourOrg

# Berlin Group API version (default: v1.3)
VITE_BG_API_VERSION=v1.3

# PSU device identification
VITE_BG_PSU_DEVICE_ID=device-1234567890
VITE_BG_PSU_DEVICE_NAME=API-Explorer-II
VITE_BG_PSU_IP_ADDRESS=192.168.1.42

# Redirect URIs for consent/payment authorization flows
VITE_BG_TPP_REDIRECT_URI=https://your-app.com/berlin-group/redirect
VITE_BG_TPP_NOK_REDIRECT_URI=https://your-app.com/berlin-group/error
```

Only `VITE_BG_PRIVATE_KEY_PATH` and `VITE_BG_CERTIFICATE_PATH` are required to enable the feature. Everything else has sensible defaults.

### Step 3: Start the Server

On startup, the console confirms whether the feature is active:

```
--- Berlin Group TPP Signature Certificate -----------------------
OK Berlin Group TPP Signature Certificate is configured and loaded
  API Version: v1.3
-----------------------------------------------------------------
```

If not configured, you will see:

```
--- Berlin Group TPP Signature Certificate -----------------------
Berlin Group TPP Signature Certificate is NOT configured
  Set VITE_BG_PRIVATE_KEY_PATH and VITE_BG_CERTIFICATE_PATH to enable
-----------------------------------------------------------------
```

## How It Works

```
Browser                         API Explorer II                        OBP-API / Bank
  |                                  |                                      |
  |  GET /api/get?path=              |                                      |
  |   /berlin-group/v1.3/accounts    |                                      |
  |  (+ optional X-BG-Consent-ID)    |                                      |
  | -------------------------------->|                                      |
  |                                  |                                      |
  |                    Detects "/berlin-group/" in path                     |
  |                    Generates signature headers:                         |
  |                      - SHA-256 body digest                              |
  |                      - RSA-SHA256 digital signature                     |
  |                      - TPP certificate                                  |
  |                      - PSU identification                               |
  |                      - Consent-ID (if provided)                         |
  |                    Includes OAuth2 Bearer token (if logged in)          |
  |                                  |                                      |
  |                                  |  GET /berlin-group/v1.3/accounts     |
  |                                  |  + Digest, Signature, Certificate    |
  |                                  |  + Consent-ID, PSU headers           |
  |                                  | ------------------------------------>|
  |                                  |                                      |
  |                                  |              JSON response           |
  |                                  |<------------------------------------ |
  |          JSON response           |                                      |
  |<---------------------------------|                                      |
```

Key points:

- **Automatic detection** -- Any request whose path contains `/berlin-group/` triggers the signing. Standard OBP paths (e.g., `/obp/v5.1.0/banks`) are unaffected.
- **Transparent to the frontend** -- The browser uses the same proxy endpoints (`/api/get`, `/api/create`, `/api/update`, `/api/delete`) as for any other API call.
- **OAuth2 and TPP coexist** -- If the user is logged in via OAuth2, the Bearer token is sent alongside the TPP signature headers. Both authentication mechanisms can be active on the same request.
- **Consent-ID passthrough** -- For endpoints that require a consent (e.g., reading accounts), the frontend includes an `X-BG-Consent-ID` header on its request to the proxy. The server forwards it as the standard `Consent-ID` header to the bank.

## Typical PSD2 Workflows

### Account Information (AIS)

1. **Create a consent** -- POST to `/berlin-group/v1.3/consents` with the desired account access scope. The bank returns a `consentId` and a redirect link for the PSU to authorize.
2. **PSU authorizes** -- The user is redirected to the bank's authorization page, then back to your redirect URI.
3. **Check consent status** -- GET `/berlin-group/v1.3/consents/{consentId}/status` to confirm it is `valid`.
4. **Read accounts** -- GET `/berlin-group/v1.3/accounts` with the `Consent-ID` header.
5. **Read transactions** -- GET `/berlin-group/v1.3/accounts/{accountId}/transactions` with the `Consent-ID` header.
6. **Delete consent** -- DELETE `/berlin-group/v1.3/consents/{consentId}` when access is no longer needed.

### Payment Initiation (PIS)

1. **Initiate payment** -- POST to `/berlin-group/v1.3/payments/sepa-credit-transfers` with debtor/creditor accounts and amount. The bank returns a `paymentId` and a redirect link.
2. **PSU authorizes** -- The user is redirected to the bank to authorize the payment, then back to your redirect URI.
3. **Check payment status** -- GET `/berlin-group/v1.3/payments/sepa-credit-transfers/{paymentId}/status`.

## What Gets Signed

Every outgoing Berlin Group request includes these headers, generated fresh per request:

| Header                                                 | Purpose                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| `Date`                                                 | Timestamp in RFC 7231 format                                        |
| `X-Request-ID`                                         | Unique UUID per request for traceability                            |
| `Digest`                                               | SHA-256 hash of the request body                                    |
| `Signature`                                            | RSA-SHA256 digital signature of the digest, date, and request ID    |
| `TPP-Signature-Certificate`                            | The TPP certificate for the bank to verify the signature            |
| `PSU-Device-ID` / `PSU-Device-Name` / `PSU-IP-Address` | PSU device identification                                           |
| `TPP-Redirect-URI` / `TPP-Nok-Redirect-URI`            | Where to redirect the user after authorization (POST requests only) |
| `Consent-ID`                                           | References an existing consent (when provided by the frontend)      |

## Configuration Reference

| Variable                       | Required    | Default                     | Description                      |
| ------------------------------ | ----------- | --------------------------- | -------------------------------- |
| `VITE_BG_PRIVATE_KEY_PATH`     | Yes         | --                          | Path to RSA private key PEM file |
| `VITE_BG_CERTIFICATE_PATH`     | Yes         | --                          | Path to TPP certificate PEM file |
| `VITE_BG_KEY_ID`               | Recommended | `SN=unknown, CA=CN=unknown` | Certificate key identifier       |
| `VITE_BG_API_VERSION`          | No          | `v1.3`                      | Berlin Group API version         |
| `VITE_BG_PSU_DEVICE_ID`        | No          | `device-api-explorer-ii`    | PSU device identifier            |
| `VITE_BG_PSU_DEVICE_NAME`      | No          | `API-Explorer-II`           | PSU device name                  |
| `VITE_BG_PSU_IP_ADDRESS`       | No          | `127.0.0.1`                 | PSU IP address                   |
| `VITE_BG_TPP_REDIRECT_URI`     | No          | (empty)                     | Success redirect URI             |
| `VITE_BG_TPP_NOK_REDIRECT_URI` | No          | (empty)                     | Error redirect URI               |

## Troubleshooting

| Symptom                                    | Cause                                        | Fix                                                                               |
| ------------------------------------------ | -------------------------------------------- | --------------------------------------------------------------------------------- |
| Startup says "NOT configured"              | Certificate env vars not set                 | Set `VITE_BG_PRIVATE_KEY_PATH` and `VITE_BG_CERTIFICATE_PATH` in `.env`           |
| "Failed to load certificate files" in logs | File paths are wrong or files are unreadable | Check that the PEM files exist at the specified paths and have read permissions   |
| Bank returns 401/403 on signed requests    | Key ID mismatch or expired certificate       | Verify `VITE_BG_KEY_ID` matches what the bank expects; check certificate validity |
| Berlin Group requests not being signed     | Path doesn't contain `/berlin-group/`        | Ensure the API path follows the pattern `/berlin-group/{version}/...`             |
| Consent endpoints fail without Consent-ID  | Frontend not sending the header              | Frontend must include `X-BG-Consent-ID` header for account data endpoints         |
