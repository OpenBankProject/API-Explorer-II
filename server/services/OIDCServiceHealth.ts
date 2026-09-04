/*
 * Open Bank Project -  API Explorer II
 * Copyright (C) 2023-2026, TESOBE GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * Email: contact@tesobe.com
 * TESOBE GmbH
 * Osloerstrasse 16/17
 * Berlin 13359, Germany
 *
 *   This product includes software developed at
 *   TESOBE (http://www.tesobe.com/)
 *
 */

import { Container } from 'typedi'
import { OAuth2ProviderManager } from './OAuth2ProviderManager.js'
import OBPClientService from './OBPClientService.js'

/**
 * Deep per-provider OIDC health checks for the /status page.
 *
 * A provider is only reported healthy when the app holds an initialized
 * OAuth client for it AND its discovery document advertises the required
 * endpoints AND its JWKS contains at least one usable signing key. A
 * reachable discovery endpoint is meaningless if login cannot use it.
 */
export interface OIDCProviderHealth {
  name: string
  status: 'healthy' | 'unhealthy'
  error?: string
  details?: Record<string, string | number>
}

interface TokenTestOutcome {
  ok: boolean
  message: string
  responseTimeMs: number
  ranAt: number
  /** The issued token, kept server-side so the consumer identity can be read with it. */
  accessToken?: string
  /** Which OBP Consumer the client is, read once per token from GET /obp/v7.0.0/consumers/current/identity. */
  consumer?: ConsumerIdentity
}

/** The calling Consumer as OBP reports it: id and name only. */
interface ConsumerIdentity {
  consumer_id?: string
  consumer_name?: string
  /** Set when the OBP-API has no identity endpoint yet, or refused the token. */
  note?: string
}

const FETCH_TIMEOUT_MS = 5000
// The client_credentials probe creates real tokens — run it at most hourly.
const TOKEN_TEST_INTERVAL_MS = 60 * 60 * 1000
const tokenTestCache = new Map<string, TokenTestOutcome>()

// Only providers whose token endpoint supports the client_credentials grant.
// Google and GitHub do not, so a token probe would always report failure.
function credentialsFor(provider: string): { clientId?: string; clientSecret?: string } {
  if (process.env.OIDC_HEALTHCHECK_TEST_TOKEN === 'false') return {}
  switch (provider) {
    case 'obp-oidc':
      return {
        clientId: process.env.VITE_OBP_OIDC_CLIENT_ID,
        clientSecret: process.env.VITE_OBP_OIDC_CLIENT_SECRET
      }
    case 'keycloak':
      return {
        clientId: process.env.VITE_KEYCLOAK_CLIENT_ID,
        clientSecret: process.env.VITE_KEYCLOAK_CLIENT_SECRET
      }
    default:
      return {}
  }
}

async function fetchJson(url: string): Promise<any> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort('timeout'), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    })
    if (!response.ok) {
      throw new Error(`${url} returned ${response.status} ${response.statusText}`)
    }
    return await response.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Which OBP Consumer a token belongs to. GET /obp/v7.0.0/consumers/current/identity needs no
 * role and returns only consumer_id and consumer_name. Answers are attached to the cached
 * token test, so this runs at most once per token.
 */
async function readConsumerIdentity(accessToken: string): Promise<ConsumerIdentity> {
  const baseUri = Container.get(OBPClientService).getOBPClientConfig().baseUri.replace(/\/$/, '')
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort('timeout'), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(`${baseUri}/obp/v7.0.0/consumers/current/identity`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
      signal: controller.signal
    })
    const body = (await response.json().catch(() => ({}))) as {
      consumer_id?: string
      consumer_name?: string
      message?: string
    }
    if (response.ok && body.consumer_id) {
      return { consumer_id: body.consumer_id, consumer_name: body.consumer_name ?? '' }
    }
    if (response.status === 404) {
      return { note: 'not available: this OBP-API has no GET /obp/v7.0.0/consumers/current/identity' }
    }
    return { note: `OBP did not identify the application (${response.status}): ${body.message ?? response.statusText}` }
  } catch (err) {
    return { note: err instanceof Error ? err.message : String(err) }
  } finally {
    clearTimeout(timeoutId)
  }
}

async function runTokenTest(
  provider: string,
  tokenEndpoint: string,
  clientId: string,
  clientSecret: string
): Promise<TokenTestOutcome> {
  const cached = tokenTestCache.get(provider)
  if (cached && Date.now() - cached.ranAt < TOKEN_TEST_INTERVAL_MS) {
    return cached
  }

  const start = performance.now()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort('timeout'), FETCH_TIMEOUT_MS)
  const body = new URLSearchParams()
  body.set('grant_type', 'client_credentials')
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  let outcome: TokenTestOutcome
  try {
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Authorization: `Basic ${credentials}`
      },
      body: body.toString(),
      signal: controller.signal
    })
    const responseTimeMs = Math.round(performance.now() - start)

    if (response.ok) {
      let accessToken: string | undefined
      try {
        accessToken = ((await response.json()) as { access_token?: string }).access_token
      } catch {
        // Token body not JSON: the test still passed, only the identity lookup is skipped
      }
      outcome = { ok: true, message: 'token issued', responseTimeMs, ranAt: Date.now(), accessToken }
      outcome.consumer = accessToken ? await readConsumerIdentity(accessToken) : undefined
    } else {
      let message = `${response.status} ${response.statusText}`
      try {
        const data = (await response.json()) as { error?: string; error_description?: string }
        if (data?.error) {
          message = data.error_description ? `${data.error}: ${data.error_description}` : data.error
        }
      } catch {
        // Response body wasn't JSON, keep the status line
      }
      outcome = { ok: false, message, responseTimeMs, ranAt: Date.now() }
    }
  } catch (err) {
    const responseTimeMs = Math.round(performance.now() - start)
    const message =
      err instanceof Error ? (err.name === 'AbortError' ? 'timeout' : err.message) : String(err)
    outcome = { ok: false, message, responseTimeMs, ranAt: Date.now() }
  } finally {
    clearTimeout(timeoutId)
  }

  tokenTestCache.set(provider, outcome)
  return outcome
}

async function checkProvider(
  manager: OAuth2ProviderManager,
  name: string,
  available: boolean,
  initError?: string
): Promise<OIDCProviderHealth> {
  if (!available) {
    return {
      name,
      status: 'unhealthy',
      error: initError ?? 'Provider not initialized',
      details: {
        provider_state: 'not initialized — login with this provider is unavailable'
      }
    }
  }

  const client = manager.getProvider(name)
  const wellKnownUrl = client?.wellKnownUri
  if (!client || !wellKnownUrl) {
    return { name, status: 'unhealthy', error: 'No well-known URL known for this provider' }
  }

  try {
    const discovery = await fetchJson(wellKnownUrl)

    const missing: string[] = []
    if (!discovery.authorization_endpoint) missing.push('authorization_endpoint')
    if (!discovery.token_endpoint) missing.push('token_endpoint')
    if (!discovery.jwks_uri) missing.push('jwks_uri')
    if (missing.length > 0) {
      return {
        name,
        status: 'unhealthy',
        error: `Discovery doc missing required fields: ${missing.join(', ')}`,
        details: { wellKnownUrl }
      }
    }

    const jwks = await fetchJson(discovery.jwks_uri)
    const keys: any[] = Array.isArray(jwks.keys) ? jwks.keys : []
    const signingKeys = keys.filter((k) => k.kty && (k.use === 'sig' || k.use === undefined))

    const details: Record<string, string | number> = {
      issuer: discovery.issuer ?? '(not advertised)',
      jwks_uri: discovery.jwks_uri,
      keys: keys.length,
      signing_keys: signingKeys.length
    }

    if (signingKeys.length === 0) {
      return {
        name,
        status: 'unhealthy',
        error: `JWKS at ${discovery.jwks_uri} has no usable signing keys`,
        details
      }
    }

    const { clientId, clientSecret } = credentialsFor(name)
    if (clientId && clientSecret) {
      const outcome = await runTokenTest(name, discovery.token_endpoint, clientId, clientSecret)
      details.token_test = outcome.ok ? 'ok' : 'failed'
      details.token_test_ms = outcome.responseTimeMs
      if (outcome.consumer?.consumer_id) {
        details.consumer_id = outcome.consumer.consumer_id
        details.consumer_name = outcome.consumer.consumer_name ?? ''
        const managerUrl = process.env.VITE_API_MANAGER_URL?.replace(/\/$/, '')
        if (managerUrl) {
          details.consumer_id_url = `${managerUrl}/consumers/${encodeURIComponent(outcome.consumer.consumer_id)}`
        }
      } else if (outcome.consumer?.note) {
        details.consumer = outcome.consumer.note
      }
      if (!outcome.ok) {
        // Non-strict: surfaced in details but does not flip the provider
        // unhealthy — the client may be authorization_code-only.
        details.token_test_error = outcome.message
      }
    } else {
      details.token_test = 'skipped (no credentials configured)'
    }

    return { name, status: 'healthy', details }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { name, status: 'unhealthy', error: message, details: { wellKnownUrl } }
  }
}

/**
 * Run the deep OIDC checks for every provider the manager knows about,
 * including ones that failed to initialize (reported with their init error).
 */
export async function checkOIDCProviders(): Promise<OIDCProviderHealth[]> {
  const manager = Container.get(OAuth2ProviderManager)
  const statuses = manager.getAllProviderStatus()
  return Promise.all(
    statuses.map((s) => checkProvider(manager, s.name, s.available, s.error))
  )
}
