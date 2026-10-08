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

import { createHash } from 'crypto'
import { promisify } from 'util'
import { gzip, gunzip } from 'zlib'
import type { Request, Response } from 'express'

const gzipAsync = promisify(gzip)
const gunzipAsync = promisify(gunzip)

// Documentation every visitor loads on startup. Only these paths are cached, and only when OBP-API
// serves them without authentication, so a cached answer never carries anything a user's
// credentials unlocked (e.g. with resource_docs_requires_role set, nothing is cached).
const PUBLIC_DOCS_PATHS = [
  /^obp\/v\d+\.\d+\.\d+\/resource-docs\/[A-Za-z0-9._-]+\/obp(\?content=(static|dynamic))?$/,
  /^obp\/v\d+\.\d+\.\d+\/api\/versions$/,
  /^obp\/v\d+\.\d+\.\d+\/api\/glossary$/,
  /^obp\/v\d+\.\d+\.\d+\/message-docs\/[A-Za-z0-9._-]+(\/json-schema)?$/,
  /^obp\/v\d+\.\d+\.\d+\/system\/connectors$/
]

export const PUBLIC_DOCS_TTL_MS = 60 * 60 * 1000
// A path OBP-API would not serve anonymously is retried sooner, in case that was transient.
export const NOT_PUBLIC_TTL_MS = 5 * 60 * 1000
// Paths are allow-listed but version and connector names are free text; cap the entry count so
// requests for made-up names cannot grow memory without bound.
export const MAX_ENTRIES = 500

type Entry =
  | { isPublic: true; gzipped: Buffer; etag: string; expiresAt: number }
  | { isPublic: false; expiresAt: number }

export function normalizeDocsPath(path: string | undefined): string | undefined {
  if (!path) return undefined
  const normalized = path.replace(/^\/+/, '')
  return PUBLIC_DOCS_PATHS.some((pattern) => pattern.test(normalized)) ? normalized : undefined
}

export class PublicDocsCache {
  private entries = new Map<string, Entry>()
  private inFlight = new Map<string, Promise<Entry>>()

  constructor(
    private fetchAnonymously: (path: string) => Promise<any>,
    private now: () => number = Date.now
  ) {}

  /**
   * Answer a public docs request from the cache, fetching it once if needed.
   * Returns false when the caller should fall back to the normal authenticated proxy.
   */
  async send(path: string | undefined, req: Request, res: Response): Promise<boolean> {
    const key = normalizeDocsPath(path)
    if (!key) return false
    const entry = await this.lookup(key)
    if (!entry.isPublic) return false

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('ETag', entry.etag)
    // Let the browser revalidate with If-None-Match and get a 304 instead of the body again.
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Vary', 'Accept-Encoding')
    if (req.fresh) {
      res.status(304).end()
    } else if (req.acceptsEncodings('gzip')) {
      res.setHeader('Content-Encoding', 'gzip')
      res.send(entry.gzipped)
    } else {
      res.send(await gunzipAsync(entry.gzipped))
    }
    return true
  }

  /**
   * Whether OBP-API serves this docs path anonymously, answered from the cache (fetching it once if
   * needed). False for paths that are not public docs.
   */
  async isPublic(path: string | undefined): Promise<boolean> {
    const key = normalizeDocsPath(path)
    return key ? (await this.lookup(key)).isPublic : false
  }

  private async lookup(key: string): Promise<Entry> {
    const cached = this.entries.get(key)
    if (cached && cached.expiresAt > this.now()) return cached

    // Concurrent misses for the same path share one request to OBP-API.
    let pending = this.inFlight.get(key)
    if (!pending) {
      pending = this.load(key).finally(() => this.inFlight.delete(key))
      this.inFlight.set(key, pending)
    }
    return pending
  }

  private async load(key: string): Promise<Entry> {
    let entry: Entry
    try {
      const json = Buffer.from(JSON.stringify(await this.fetchAnonymously(`/${key}`)))
      entry = {
        isPublic: true,
        gzipped: await gzipAsync(json),
        etag: `"${createHash('sha1').update(json).digest('base64url')}"`,
        expiresAt: this.now() + PUBLIC_DOCS_TTL_MS
      }
      console.log(`PublicDocsCache: cached ${key} (${json.length} bytes)`)
    } catch (error: any) {
      console.log(
        `PublicDocsCache: ${key} not served anonymously (${error?.status ?? error}), not caching`
      )
      entry = { isPublic: false, expiresAt: this.now() + NOT_PUBLIC_TTL_MS }
    }
    this.entries.delete(key)
    this.entries.set(key, entry)
    if (this.entries.size > MAX_ENTRIES) {
      // Maps iterate in insertion order, so the first key is the least recently loaded.
      this.entries.delete(this.entries.keys().next().value as string)
    }
    return entry
  }
}
