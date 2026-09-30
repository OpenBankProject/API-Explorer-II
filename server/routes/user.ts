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
import OBPClientService from '../services/OBPClientService.js'
import { OAuth2ProviderManager } from '../services/OAuth2ProviderManager.js'
import { DEFAULT_OBP_API_VERSION } from '../../src/shared-constants.js'
import { callerAddressOf } from '../utils/clientIp.js'

const router = Router()

// Get services from container
const obpClientService = Container.get(OBPClientService)
const providerManager = Container.get(OAuth2ProviderManager)

const obpExplorerHome = process.env.VITE_OBP_API_EXPLORER_HOST

/**
 * Logout behaviour is controlled by the VITE_OBP_LOGOUT_MODE environment variable:
 *
 *   public   (default) - Full SSO logout. After clearing the local session we
 *                        redirect the browser to the provider's
 *                        end_session_endpoint so the Keycloak/OIDC session is
 *                        also ended. The user must re-enter credentials on the
 *                        next login. Safe default for public-facing / shared
 *                        machines.
 *
 *   internal           - Local-only logout. We clear the local app session but
 *                        leave the provider's SSO session intact, so the next
 *                        login is silent. Intended for deployments used within
 *                        a single organisation on trusted machines.
 *
 * Any unset/unrecognised value falls back to "public".
 */
function getLogoutMode(): 'public' | 'internal' {
  const mode = process.env.VITE_OBP_LOGOUT_MODE?.trim().toLowerCase()
  if (mode === 'internal') {
    return 'internal'
  }
  if (mode && mode !== 'public') {
    console.warn(
      `User: Unrecognised VITE_OBP_LOGOUT_MODE "${process.env.VITE_OBP_LOGOUT_MODE}", defaulting to "public".`
    )
  }
  return 'public'
}

/**
 * Builds the provider's RP-initiated logout (end_session_endpoint) URL for the
 * given provider/id_token. Returns null when a proper end-session request can't
 * be built (no provider, no end_session_endpoint, or no id_token), in which case
 * the caller should fall back to a local-only logout.
 */
function buildEndSessionUrl(
  provider: string | undefined,
  idToken: string | undefined,
  req: Request
): string | null {
  if (!provider) {
    console.warn('User: No provider in session; falling back to local logout.')
    return null
  }

  const client = providerManager.getProvider(provider)
  if (!client) {
    console.warn(`User: Provider "${provider}" not found; falling back to local logout.`)
    return null
  }

  const endSessionEndpoint = client.getEndSessionEndpoint()
  if (!endSessionEndpoint) {
    console.warn(
      `User: Provider "${provider}" has no end_session_endpoint; falling back to local logout.`
    )
    return null
  }

  if (!idToken) {
    console.warn('User: No id_token in session; falling back to local logout.')
    return null
  }

  const postLogoutRedirectUri = obpExplorerHome || `${req.protocol}://${req.get('host')}`
  const endSessionUrl = new URL(endSessionEndpoint)
  endSessionUrl.searchParams.set('id_token_hint', idToken)
  endSessionUrl.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri)
  if (client.clientId) {
    endSessionUrl.searchParams.set('client_id', client.clientId)
  }

  return endSessionUrl.toString()
}

/**
 * GET /user/current
 * Get current logged in user information
 */
router.get('/user/current', async (req: Request, res: Response) => {
  try {
    console.log('User: Getting current user')
    const session = req.session as any

    // Check OAuth2 session
    if (!session.oauth2_user) {
      console.log('User: No authentication session found')
      return res.json({})
    }

    console.log('User: Returning OAuth2 user info')
    const oauth2User = session.oauth2_user

    // TODO: Implement token refresh in multi-provider system
    // For now, if token expires, user must re-login

    // Get actual user ID from OBP-API
    let obpUserId = oauth2User.sub // Default to sub if OBP call fails
    const clientConfig = session.clientConfig

    if (clientConfig && clientConfig.oauth2?.accessToken) {
      try {
        const version = DEFAULT_OBP_API_VERSION
        console.log('User: Fetching OBP user from /obp/' + version + '/users/current')
        const obpUser = await obpClientService.get(
          `/obp/${version}/users/current`,
          clientConfig,
          callerAddressOf(req)
        )
        if (obpUser && obpUser.user_id) {
          obpUserId = obpUser.user_id
          console.log('User: Got OBP user ID:', obpUserId, '(was:', oauth2User.sub, ')')
        } else {
          console.warn('User: OBP user response has no user_id:', obpUser)
        }
      } catch (error: any) {
        console.warn('User: Could not fetch OBP user ID, using token sub:', oauth2User.sub)
        console.warn('User: Error details:', error.message)
      }
    } else {
      console.warn('User: No valid clientConfig or access token, using token sub:', oauth2User.sub)
    }

    // Return user info in format compatible with frontend
    res.json({
      user_id: obpUserId,
      username: oauth2User.username,
      email: oauth2User.email,
      email_verified: oauth2User.email_verified,
      name: oauth2User.name,
      given_name: oauth2User.given_name,
      family_name: oauth2User.family_name,
      provider: oauth2User.provider || 'oauth2'
    })
  } catch (error) {
    console.error('User: Error getting current user:', error)
    res.json({})
  }
})

/**
 * GET /user/logoff
 * Logout user and clear session
 * Query params:
 *   - redirect: URL to redirect to after logout (optional)
 */
router.get('/user/logoff', (req: Request, res: Response) => {
  console.log('User: Logging out user')
  const session = req.session as any

  const logoutMode = getLogoutMode()

  // Capture details needed for full SSO logout before clearing the session
  const idToken = session.oauth2_id_token
  const provider = session.oauth2_provider
  const endSessionUrl = logoutMode === 'public' ? buildEndSessionUrl(provider, idToken, req) : null

  // Clear OAuth2 session data
  delete session.oauth2_access_token
  delete session.oauth2_refresh_token
  delete session.oauth2_id_token
  delete session.oauth2_token_type
  delete session.oauth2_expires_in
  delete session.oauth2_token_timestamp
  delete session.oauth2_user_info
  delete session.oauth2_user
  delete session.oauth2_provider
  delete session.clientConfig

  // Destroy the session completely
  session.destroy((err: any) => {
    if (err) {
      console.error('User: Error destroying session:', err)
    } else {
      console.log('User: Session destroyed successfully')
    }

    // In "public" mode, end the provider SSO session via RP-initiated logout.
    // buildEndSessionUrl() returns null when that isn't possible, so we fall
    // back to the local-only logout redirect below.
    if (endSessionUrl) {
      console.log('User: Full SSO logout, redirecting to provider end_session_endpoint')
      return res.redirect(endSessionUrl)
    }

    const redirectPage = (req.query.redirect as string) || obpExplorerHome || '/'
    console.log(`User: Local logout (mode=${logoutMode}), redirecting to:`, redirectPage)
    res.redirect(redirectPage)
  })
})

export default router
