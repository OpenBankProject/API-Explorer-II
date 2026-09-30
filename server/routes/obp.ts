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
import { PublicDocsCache } from '../utils/publicDocsCache.js'
import { callerAddressOf } from '../utils/clientIp.js'

const router = Router()

// Get services from container
const obpClientService = Container.get(OBPClientService)
const publicDocsCache = new PublicDocsCache((path) => obpClientService.getWithoutAuth(path))

/**
 * Check if user is authenticated
 * TODO: Implement token refresh in multi-provider system
 */
function isAuthenticated(session: any): boolean {
  return !!session.oauth2_access_token && !!session.oauth2_user
}

/**
 * Forward an OBP API error to the client. OBPAPIError.message carries the raw
 * OBP error body (e.g. {"code":401,"message":"OBP-20217: ..."}) - pass it
 * through unchanged instead of wrapping it in another {code, message} envelope,
 * which would give clients a nested code/message inside message.
 */
function sendOBPError(res: Response, error: any) {
  const status = error.status || 500
  try {
    const body = JSON.parse(error.message)
    if (body && typeof body === 'object') {
      return res.status(status).json(body)
    }
  } catch {
    // not a JSON body - fall through to the generic envelope
  }
  res.status(status).json({
    code: status,
    message: error.message || 'Internal server error'
  })
}

/**
 * GET /get
 * Proxy GET requests to OBP API
 * Query params:
 *   - path: OBP API path to call (e.g., /obp/v5.1.0/banks)
 */
router.get('/get', async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string
    const session = req.session as any

    const bgConsentId = req.headers['x-bg-consent-id'] as string | undefined
    // Public docs are shared by every visitor, so serve them from one server-side cache
    // instead of sending each visitor's startup requests on to OBP-API.
    if (!bgConsentId && (await publicDocsCache.send(path, req, res))) {
      return
    }

    const oauthConfig = session.clientConfig || {}
    if (bgConsentId) {
      oauthConfig.berlinGroup = { consentId: bgConsentId }
    }

    const result = await obpClientService.get(path, oauthConfig, callerAddressOf(req))
    res.json(result)
  } catch (error: any) {
    // 401 errors are expected when user is not authenticated - log as info, not error
    if (error.status === 401) {
      console.log(`OBP: 401 Unauthorized for path: ${req.query.path} (user not authenticated)`)
    } else {
      console.error('OBP: GET request error:', error)
    }
    sendOBPError(res, error)
  }
})

/**
 * POST /create
 * Proxy POST requests to OBP API
 * Query params:
 *   - path: OBP API path to call
 * Body: JSON data to send to OBP API
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string
    const data = req.body
    const session = req.session as any

    const oauthConfig = session.clientConfig || {}
    const bgConsentId = req.headers['x-bg-consent-id'] as string | undefined
    if (bgConsentId) {
      oauthConfig.berlinGroup = { consentId: bgConsentId }
    }

    // Debug logging to diagnose authentication issues
    console.log('OBP.create - Debug Info:')
    console.log('  Path:', path)
    console.log('  Session exists:', !!session)
    console.log('  clientConfig exists:', !!oauthConfig)
    console.log('  oauth2 exists:', oauthConfig?.oauth2 ? 'YES' : 'NO')
    console.log('  accessToken exists:', oauthConfig?.oauth2?.accessToken ? 'YES' : 'NO')
    console.log('  oauth2_user exists:', session?.oauth2_user ? 'YES' : 'NO')
    console.log('  berlinGroup consentId:', bgConsentId || 'N/A')

    const result = await obpClientService.create(path, data, oauthConfig, callerAddressOf(req))
    res.json(result)
  } catch (error: any) {
    console.error('OBP.create error:', error)
    sendOBPError(res, error)
  }
})

/**
 * PUT /update
 * Proxy PUT requests to OBP API
 * Query params:
 *   - path: OBP API path to call
 * Body: JSON data to send to OBP API
 */
router.put('/update', async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string
    const data = req.body
    const session = req.session as any

    const oauthConfig = session.clientConfig || {}
    const bgConsentId = req.headers['x-bg-consent-id'] as string | undefined
    if (bgConsentId) {
      oauthConfig.berlinGroup = { consentId: bgConsentId }
    }

    const result = await obpClientService.update(path, data, oauthConfig, callerAddressOf(req))
    res.json(result)
  } catch (error: any) {
    console.error('OBP.update error:', error)
    sendOBPError(res, error)
  }
})

/**
 * DELETE /delete
 * Proxy DELETE requests to OBP API
 * Query params:
 *   - path: OBP API path to call
 */
router.delete('/delete', async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string
    const session = req.session as any

    const oauthConfig = session.clientConfig || {}
    const bgConsentId = req.headers['x-bg-consent-id'] as string | undefined
    if (bgConsentId) {
      oauthConfig.berlinGroup = { consentId: bgConsentId }
    }

    const result = await obpClientService.discard(path, oauthConfig, callerAddressOf(req))
    res.json(result)
  } catch (error: any) {
    console.error('OBP.delete error:', error)
    sendOBPError(res, error)
  }
})

export default router
