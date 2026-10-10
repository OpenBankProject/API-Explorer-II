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

import { createHash } from 'crypto'
import type { NextFunction, Request, Response } from 'express'

// Whether an OBP-API token may see what this server guards with an OBP Role. OBP-API answers, through
// GET /obp/v7.0.0/banks/SYS/my/roles/ROLE_NAME, with the same rules its own endpoints use: the token's
// User holds the Role, or its Consumer holds it as a Scope (auth mode UserOrApplication).

export type RoleCheck = 'allowed' | 'unauthorized' | 'forbidden'

const TTL_MS = 60_000
const MAX_CACHED = 1000
const cache = new Map<string, { result: RoleCheck; at: number }>()

export function clearRoleCheckCache(): void {
  cache.clear()
}

async function checkRole(obpApiHost: string, token: string, role: string): Promise<RoleCheck> {
  const response = await fetch(`${obpApiHost}/obp/v7.0.0/banks/SYS/my/roles/${encodeURIComponent(role)}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (response.status === 401) return 'unauthorized'
  if (!response.ok) {
    if (response.status === 404) console.warn(`Role check: OBP-API does not know ${role}, or has no /my/roles endpoint`)
    return 'forbidden'
  }
  const body = await response.json()
  return body.allowed_for_auth_modes?.includes('UserOrApplication') ? 'allowed' : 'forbidden'
}

/** Allowed if the token may use any one of the Roles, as an endpoint needing any of them would decide. */
export async function tokenMayUseAnyRole(
  obpApiHost: string,
  token: string,
  roles: string[],
  now: number = Date.now()
): Promise<RoleCheck> {
  const key = createHash('sha256').update(token).digest('hex') + ':' + roles.join(',')
  const cached = cache.get(key)
  if (cached && now - cached.at < TTL_MS) return cached.result
  let result: RoleCheck = 'forbidden'
  for (const role of roles) {
    result = await checkRole(obpApiHost, token, role)
    if (result !== 'forbidden') break
  }
  if (cache.size >= MAX_CACHED) {
    for (const [k, v] of cache) if (now - v.at >= TTL_MS) cache.delete(k)
    if (cache.size >= MAX_CACHED) cache.clear()
  }
  cache.set(key, { result, at: now })
  return result
}

/** Express guard: a Bearer token from OBP-API's OIDC provider that may use any of the Roles. */
export function requireAnyObpRole(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization ?? ''
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''
    if (!token) return res.status(401).json({ error: 'A Bearer token from OBP-API is required' })
    const obpApiHost = process.env.VITE_OBP_API_HOST
    if (!obpApiHost) return res.status(503).json({ error: 'VITE_OBP_API_HOST is not set' })
    try {
      const result = await tokenMayUseAnyRole(obpApiHost, token, roles)
      if (result === 'allowed') return next()
      if (result === 'unauthorized') return res.status(401).json({ error: 'OBP-API did not accept the token' })
      return res.status(403).json({ error: `Requires one of the Roles: ${roles.join(', ')}` })
    } catch (error) {
      console.error('Role check: could not ask OBP-API:', error)
      return res.status(503).json({ error: 'Could not check the token with OBP-API' })
    }
  }
}
