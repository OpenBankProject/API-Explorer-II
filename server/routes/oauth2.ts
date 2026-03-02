/*
 * Open Bank Project -  API Explorer II
 * Copyright (C) 2023-2025, TESOBE GmbH
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

import { Router } from 'express'
import type { Request, Response } from 'express'
import { Container } from 'typedi'
import { OAuth2ProviderManager } from '../services/OAuth2ProviderManager.js'
import { PKCEUtils } from '../utils/pkce.js'
import type { UserInfo } from '../types/oauth2.js'

const router = Router()

// Get services from container
const providerManager = Container.get(OAuth2ProviderManager)

/**
 * GET /oauth2/providers
 * Get list of available OAuth2 providers
 */
router.get('/oauth2/providers', async (req: Request, res: Response) => {
  try {
    const availableProviders = providerManager.getAvailableProviders()
    const providerList = availableProviders.map((name) => {
      const providerStatus = providerManager.getProviderStatus(name)
      return {
        name,
        status: providerStatus?.available ? 'healthy' : 'unhealthy',
        available: providerStatus?.available || false
      }
    })

    res.json({ providers: providerList })
  } catch (error) {
    console.error('Error fetching providers:', error)
    res.status(500).json({ error: 'Failed to fetch providers' })
  }
})

/**
 * GET /oauth2/connect
 * Initiate OAuth2 authentication flow
 * Query params:
 *   - provider: Provider name (required)
 *   - redirect: URL to redirect after auth (optional)
 */
router.get('/oauth2/connect', async (req: Request, res: Response) => {
  try {
    const provider = req.query.provider as string | undefined
    const redirect = (req.query.redirect as string) || '/'
    const session = req.session as any

    console.log('OAuth2 Connect: Starting authentication flow')
    console.log(`  Provider: ${provider || 'NOT SPECIFIED'}`)
    console.log(`  Redirect: ${redirect}`)

    // Provider is required
    if (!provider) {
      console.error('OAuth2 Connect: No provider specified')
      return res.status(400).json({
        error: 'missing_provider',
        message: 'Provider parameter is required'
      })
    }

    // Store redirect URL in session
    session.oauth2_redirect_page = redirect

    // Generate PKCE parameters
    const codeVerifier = PKCEUtils.generateCodeVerifier()
    const codeChallenge = PKCEUtils.generateCodeChallenge(codeVerifier)
    const state = PKCEUtils.generateState()

    // Store in session
    session.oauth2_code_verifier = codeVerifier
    session.oauth2_state = state

    console.log(`OAuth2 Connect: Using provider - ${provider}`)

    const client = providerManager.getProvider(provider)
    if (!client) {
      const availableProviders = providerManager.getAvailableProviders()
      console.error(`OAuth2 Connect: Provider not found: ${provider}`)
      return res.status(400).json({
        error: 'invalid_provider',
        message: `Provider "${provider}" is not available`,
        availableProviders
      })
    }

    // Store provider name for callback
    session.oauth2_provider = provider

    // Build authorization URL
    const authEndpoint = client.getAuthorizationEndpoint()
    const params = new URLSearchParams({
      client_id: client.clientId,
      redirect_uri: client.getRedirectUri(),
      response_type: 'code',
      scope: 'openid profile email',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    })

    const authUrl = `${authEndpoint}?${params.toString()}`

    // Save session before redirect
    session.save((err: any) => {
      if (err) {
        console.error('OAuth2 Connect: Failed to save session:', err)
        return res.status(500).json({ error: 'session_error' })
      }

      console.log('OAuth2 Connect: Redirecting to authorization endpoint')
      res.redirect(authUrl)
    })
  } catch (error) {
    console.error('OAuth2 Connect: Error:', error)
    res.status(500).json({
      error: 'authentication_failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /oauth2/callback
 * Handle OAuth2 callback after user authentication
 * Query params:
 *   - code: Authorization code
 *   - state: State parameter for CSRF validation
 *   - error: Error code (if auth failed)
 *   - error_description: Error description
 */
router.get('/oauth2/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string
    const state = req.query.state as string
    const error = req.query.error as string
    const errorDescription = req.query.error_description as string
    const session = req.session as any

    console.log('OAuth2 Callback: Processing callback')

    // Handle error from provider
    if (error) {
      console.error(`OAuth2 Callback: Error from provider: ${error}`)
      console.error(`OAuth2 Callback: Description: ${errorDescription || 'N/A'}`)
      return res.redirect(`/?oauth2_error=${encodeURIComponent(error)}`)
    }

    // Validate required parameters
    if (!code) {
      console.error('OAuth2 Callback: Missing authorization code')
      return res.redirect('/?oauth2_error=missing_code')
    }

    if (!state) {
      console.error('OAuth2 Callback: Missing state parameter')
      return res.redirect('/?oauth2_error=missing_state')
    }

    // Validate state (CSRF protection)
    const storedState = session.oauth2_state
    if (!storedState || storedState !== state) {
      console.error('OAuth2 Callback: State mismatch (CSRF protection)')
      return res.redirect('/?oauth2_error=invalid_state')
    }

    // Get code verifier from session (PKCE)
    const codeVerifier = session.oauth2_code_verifier
    if (!codeVerifier) {
      console.error('OAuth2 Callback: Code verifier not found in session')
      return res.redirect('/?oauth2_error=missing_verifier')
    }

    // Get provider from session
    const provider = session.oauth2_provider

    if (!provider) {
      console.error('OAuth2 Callback: Provider not found in session')
      return res.redirect('/?oauth2_error=missing_provider')
    }

    console.log(`OAuth2 Callback: Processing callback for ${provider}`)

    const client = providerManager.getProvider(provider)
    if (!client) {
      console.error(`OAuth2 Callback: Provider not found: ${provider}`)
      return res.redirect('/?oauth2_error=provider_not_found')
    }

    // Exchange code for tokens
    console.log('OAuth2 Callback: Exchanging authorization code for tokens')
    const tokens = await client.exchangeAuthorizationCode(code, codeVerifier)

    // Fetch user info
    console.log('OAuth2 Callback: Fetching user info')
    const userInfoEndpoint = client.getUserInfoEndpoint()
    const userInfoResponse = await fetch(userInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        Accept: 'application/json'
      }
    })

    if (!userInfoResponse.ok) {
      throw new Error(`UserInfo request failed: ${userInfoResponse.status}`)
    }

    const userInfo = (await userInfoResponse.json()) as UserInfo

    // Store tokens in session
    session.oauth2_access_token = tokens.accessToken
    session.oauth2_refresh_token = tokens.refreshToken
    session.oauth2_id_token = tokens.idToken

    console.log('OAuth2 Callback: Tokens received and stored')

    // Store user in session (using oauth2_user key to match UserController)
    session.oauth2_user = {
      username: userInfo.preferred_username || userInfo.email || userInfo.sub,
      email: userInfo.email,
      email_verified: userInfo.email_verified || false,
      name: userInfo.name,
      given_name: userInfo.given_name,
      family_name: userInfo.family_name,
      provider: provider || 'obp-oidc',
      sub: userInfo.sub
    }

    // Also store clientConfig for OBP API calls
    session.clientConfig = {
      oauth2: {
        accessToken: tokens.accessToken,
        tokenType: 'Bearer'
      }
    }

    console.log(
      `OAuth2 Callback: User authenticated: ${session.oauth2_user.username} via ${session.oauth2_user.provider}`
    )

    // Clean up temporary session data
    delete session.oauth2_code_verifier
    delete session.oauth2_state

    // Redirect to original page
    const redirectUrl = session.oauth2_redirect_page || '/'
    delete session.oauth2_redirect_page

    console.log(`OAuth2 Callback: Authentication successful, redirecting to: ${redirectUrl}`)
    res.redirect(redirectUrl)
  } catch (error) {
    console.error('OAuth2 Callback: Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.redirect(`/?oauth2_error=token_exchange_failed&details=${encodeURIComponent(errorMessage)}`)
  }
})

export default router
