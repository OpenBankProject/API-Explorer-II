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
import { DEFAULT_OBP_API_VERSION } from '../../src/shared-constants.js'

const router = Router()

// Get services from container
const obpClientService = Container.get(OBPClientService)

const obpExplorerHome = process.env.VITE_OBP_API_EXPLORER_HOST

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
        const obpUser = await obpClientService.get(`/obp/${version}/users/current`, clientConfig)
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
  delete session.opeyConfig

  // Destroy the session completely
  session.destroy((err: any) => {
    if (err) {
      console.error('User: Error destroying session:', err)
    } else {
      console.log('User: Session destroyed successfully')
    }

    const redirectPage = (req.query.redirect as string) || obpExplorerHome || '/'
    console.log('User: Redirecting to:', redirectPage)
    res.redirect(redirectPage)
  })
})

export default router
