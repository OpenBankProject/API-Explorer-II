import { describe, it, expect, vi } from 'vitest'
import { gunzipSync } from 'zlib'
import {
  MAX_ENTRIES,
  NOT_PUBLIC_TTL_MS,
  PUBLIC_DOCS_TTL_MS,
  PublicDocsCache,
  normalizeDocsPath
} from '../utils/publicDocsCache'

const RESOURCE_DOCS = '/obp/v7.0.0/resource-docs/OBPv7.0.0/obp'

function fakeReq({ gzip = true, fresh = false } = {}): any {
  return { fresh, acceptsEncodings: (encoding: string) => gzip && encoding === 'gzip' }
}

function fakeRes(): any {
  const res: any = { headers: {}, statusCode: 200 }
  res.setHeader = (name: string, value: string) => (res.headers[name] = value)
  res.status = (code: number) => ((res.statusCode = code), res)
  res.end = vi.fn()
  res.send = vi.fn((body: Buffer) => (res.body = body))
  return res
}

describe('normalizeDocsPath', () => {
  it('accepts the public docs paths with or without a leading slash', () => {
    expect(normalizeDocsPath(RESOURCE_DOCS)).toBe('obp/v7.0.0/resource-docs/OBPv7.0.0/obp')
    expect(
      normalizeDocsPath('obp/v7.0.0/resource-docs/OBPv7.0.0/obp?content=dynamic')
    ).toBeDefined()
    expect(normalizeDocsPath('obp/v6.0.0/api/versions')).toBeDefined()
    expect(normalizeDocsPath('obp/v6.0.0/api/glossary')).toBeDefined()
    expect(normalizeDocsPath('obp/v6.0.0/message-docs/rest_vMar2019/json-schema')).toBeDefined()
  })

  it('rejects anything else', () => {
    expect(normalizeDocsPath(undefined)).toBeUndefined()
    expect(normalizeDocsPath('/obp/v7.0.0/banks')).toBeUndefined()
    expect(normalizeDocsPath('/obp/v7.0.0/users/current')).toBeUndefined()
    expect(normalizeDocsPath(`${RESOURCE_DOCS}?content=dynamic&x=1`)).toBeUndefined()
    expect(normalizeDocsPath('/obp/v7.0.0/resource-docs/../users/current/obp')).toBeUndefined()
  })
})

describe('PublicDocsCache', () => {
  it('does not handle paths outside the allow-list', async () => {
    const fetch = vi.fn()
    const cache = new PublicDocsCache(fetch)
    expect(await cache.send('/obp/v7.0.0/banks', fakeReq(), fakeRes())).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('fetches once for concurrent and repeated requests and serves gzip', async () => {
    const fetch = vi.fn(async () => ({ resource_docs: [{ operation_id: 'x' }] }))
    const cache = new PublicDocsCache(fetch)
    const responses = [fakeRes(), fakeRes(), fakeRes()]
    await Promise.all(responses.map((res) => cache.send(RESOURCE_DOCS, fakeReq(), res)))
    await cache.send(RESOURCE_DOCS, fakeReq(), fakeRes())

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('/obp/v7.0.0/resource-docs/OBPv7.0.0/obp')
    const res = responses[0]
    expect(res.headers['Content-Encoding']).toBe('gzip')
    expect(JSON.parse(gunzipSync(res.body).toString())).toEqual({
      resource_docs: [{ operation_id: 'x' }]
    })
  })

  it('serves plain JSON to clients that do not accept gzip', async () => {
    const cache = new PublicDocsCache(async () => ({ a: 1 }))
    const res = fakeRes()
    await cache.send(RESOURCE_DOCS, fakeReq({ gzip: false }), res)
    expect(res.headers['Content-Encoding']).toBeUndefined()
    expect(JSON.parse(res.body.toString())).toEqual({ a: 1 })
  })

  it('answers 304 when the browser copy is still current', async () => {
    const cache = new PublicDocsCache(async () => ({ a: 1 }))
    const res = fakeRes()
    await cache.send(RESOURCE_DOCS, fakeReq({ fresh: true }), res)
    expect(res.statusCode).toBe(304)
    expect(res.send).not.toHaveBeenCalled()
  })

  it('refetches after the TTL', async () => {
    let now = 0
    const fetch = vi.fn(async () => ({ a: 1 }))
    const cache = new PublicDocsCache(fetch, () => now)
    await cache.send(RESOURCE_DOCS, fakeReq(), fakeRes())
    now = PUBLIC_DOCS_TTL_MS - 1
    await cache.send(RESOURCE_DOCS, fakeReq(), fakeRes())
    expect(fetch).toHaveBeenCalledTimes(1)
    now = PUBLIC_DOCS_TTL_MS
    await cache.send(RESOURCE_DOCS, fakeReq(), fakeRes())
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('falls back to the authenticated proxy when OBP-API refuses anonymous access, and remembers that', async () => {
    let now = 0
    const fetch = vi.fn(async () => {
      throw Object.assign(new Error('OBP-20001'), { status: 401 })
    })
    const cache = new PublicDocsCache(fetch, () => now)
    expect(await cache.send(RESOURCE_DOCS, fakeReq(), fakeRes())).toBe(false)
    expect(await cache.send(RESOURCE_DOCS, fakeReq(), fakeRes())).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(1)
    now = NOT_PUBLIC_TTL_MS
    await cache.send(RESOURCE_DOCS, fakeReq(), fakeRes())
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('caps the number of entries', async () => {
    const fetch = vi.fn(async () => ({ a: 1 }))
    const cache = new PublicDocsCache(fetch)
    const pathFor = (i: number) => `/obp/v7.0.0/resource-docs/OBPv${i}/obp`
    for (let i = 0; i <= MAX_ENTRIES; i++) {
      await cache.send(pathFor(i), fakeReq(), fakeRes())
    }
    // The oldest entry was evicted, the newest is still cached.
    await cache.send(pathFor(MAX_ENTRIES), fakeReq(), fakeRes())
    expect(fetch).toHaveBeenCalledTimes(MAX_ENTRIES + 1)
    await cache.send(pathFor(0), fakeReq(), fakeRes())
    expect(fetch).toHaveBeenCalledTimes(MAX_ENTRIES + 2)
  })
})
