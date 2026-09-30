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

import type { Request } from 'express'

/**
 * This module passes the end user's address on to OBP-API and Opey.
 *
 * API Explorer II calls OBP-API (and Opey) from its own server, so without help OBP-API sees
 * every request coming from the API Explorer II server: per-IP rate limits, IP penalties and
 * the busiest-callers view would all see one address.
 *
 * To avoid that, API Explorer II behaves like any other proxy: it passes on the
 * X-Forwarded-For chain it received and appends the address of the machine that sent it the
 * request (NGINX, or the browser when nothing sits in front). It never decides which address
 * in the chain is the real one. OBP-API does that: it reads the chain from the right and skips
 * every address in its trust.proxy.peers list, so this server's address (and NGINX's) must be
 * in that list, and a false address written by a browser is never reached.
 *
 * Separately, `req.ip` is Express's own view of the browser's address. It is used where one
 * address must be named (the Berlin Group PSU-IP-Address header) and is only right when
 * Express trusts the proxy in front, which VITE_OBP_TRUST_PROXY controls (see
 * `parseTrustProxy`).
 */

/** Where a request to API Explorer II came from, as passed on to OBP-API and Opey. */
export interface CallerAddress {
  /** The X-Forwarded-For chain to send on: the incoming chain plus this server's TCP peer. */
  forwardedFor?: string
  /** The browser's address as Express resolved it, for headers that name a single address. */
  clientIp?: string
}

/**
 * An address in canonical form: without IPv6 brackets, and IPv4 addresses that Node reports
 * in IPv6-mapped form (::ffff:203.0.113.7) in plain IPv4 form.
 */
export function canonicalAddress(address: string): string {
  const unbracketed = address.trim().replace(/^\[/, '').replace(/\]$/, '')
  return unbracketed.toLowerCase().startsWith('::ffff:') && unbracketed.includes('.')
    ? unbracketed.substring('::ffff:'.length)
    : unbracketed
}

/**
 * The X-Forwarded-For chain to send on: whatever chain the request arrived with (all header
 * lines, in order), followed by the address of the machine that opened the connection to
 * this server. Nothing is returned when that address is unknown, because nothing then
 * vouches for the incoming chain.
 */
export function forwardedForOf(req: Request): string | undefined {
  const peer = req.socket?.remoteAddress
  if (!peer) return undefined
  const incoming = req.headers['x-forwarded-for']
  const incomingChain = (Array.isArray(incoming) ? incoming.join(', ') : incoming ?? '').trim()
  return incomingChain ? `${incomingChain}, ${canonicalAddress(peer)}` : canonicalAddress(peer)
}

/** The browser's address as Express resolved it (see VITE_OBP_TRUST_PROXY). */
export function clientIpOf(req: Request): string | undefined {
  return req.ip ? canonicalAddress(req.ip) : undefined
}

/** Both views of where a request came from. */
export function callerAddressOf(req: Request): CallerAddress {
  return { forwardedFor: forwardedForOf(req), clientIp: clientIpOf(req) }
}

/** The X-Forwarded-For header to add to a request, or nothing when there is no chain. */
export function forwardedForHeaders(caller?: CallerAddress): Record<string, string> {
  return caller?.forwardedFor ? { 'X-Forwarded-For': caller.forwardedFor } : {}
}

/**
 * The value for Express's `trust proxy` setting, from VITE_OBP_TRUST_PROXY.
 *
 * Express only takes the browser's address (req.ip) and protocol from X-Forwarded-* headers
 * when it trusts the proxy that sent them; otherwise req.ip is the proxy's address. This
 * affects secure cookies and the Berlin Group PSU-IP-Address header, not the X-Forwarded-For
 * chain passed on to OBP-API. Accepted values follow Express:
 *   - a number: how many proxies in front of API Explorer II to trust (1 = one NGINX)
 *   - true / false: trust every proxy / none
 *   - a comma-separated list of addresses, CIDR ranges or the names loopback,
 *     linklocal, uniquelocal: trust only those proxies (the safest choice)
 * Unset, it keeps the previous behaviour: trust one proxy in production, none otherwise.
 */
export function parseTrustProxy(
  value: string | undefined,
  environment: string
): boolean | number | string {
  const trimmed = value?.trim()
  if (!trimmed) return environment === 'production' ? 1 : false
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (/^\d+$/.test(trimmed)) return Number(trimmed)
  return trimmed
}
