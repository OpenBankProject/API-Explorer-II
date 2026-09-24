import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../obp', () => ({ OBP_API_VERSION: 'v5.1.0', get, isServerUp: vi.fn() }))
vi.mock('../obp/common-functions', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  updateLoadingInfoMessage: vi.fn()
}))

import { cache, cacheDoc } from '../obp/message-docs'
import { documentationCacheResponse } from '../obp/documentation-refresh'

const STAMP = 'x-obp-cache-written-at'

function connectorsResponse(names: string[]) {
  return { connectors: names.map((connector_name) => ({ connector_name })) }
}

function messageDocs() {
  return { message_docs: [{ process: 'obp.getBank', adapter_implementation: { group: 'Bank' } }] }
}

function fakeStorage() {
  return { put: vi.fn().mockResolvedValue(undefined) }
}

function mockConnectors(names: string[], docs: (connector: string) => any) {
  get.mockImplementation(async (path: string) => {
    if (path.endsWith('/system/connectors')) return connectorsResponse(names)
    const connector = path.split('/').pop() as string
    return docs(connector)
  })
}

describe('message docs cache writes', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('stamps a complete load', async () => {
    mockConnectors(['a_v1', 'b_v1'], () => messageDocs())
    const storage = fakeStorage()

    await cacheDoc(storage)

    expect(storage.put).toHaveBeenCalledTimes(1)
    const response: Response = storage.put.mock.calls[0][1]
    expect(response.headers.get(STAMP)).not.toBeNull()
  })

  it('writes a partial load marked incomplete so it is retried sooner', async () => {
    mockConnectors(['a_v1', 'b_v1'], (c) => (c === 'a_v1' ? messageDocs() : { code: 500, message: 'boom' }))
    const storage = fakeStorage()

    const loaded = await cacheDoc(storage)

    expect(Object.keys(loaded)).toEqual(['a_v1'])
    expect(storage.put).toHaveBeenCalledTimes(1)
    expect(storage.put.mock.calls[0][1].headers.get('x-obp-cache-complete')).toBe('false')
  })

  it('does not overwrite the existing entry when every connector fails', async () => {
    mockConnectors(['a_v1', 'b_v1'], () => ({ code: 429, message: 'Too Many Requests' }))
    const storage = fakeStorage()

    const loaded = await cacheDoc(storage)

    expect(loaded).toEqual({})
    expect(storage.put).not.toHaveBeenCalled()
  })

  it('does not overwrite the existing entry when every request throws', async () => {
    get.mockImplementation(async (path: string) => {
      if (path.endsWith('/system/connectors')) return connectorsResponse(['a_v1'])
      throw new Error('network down')
    })
    const storage = fakeStorage()

    await cacheDoc(storage)

    expect(storage.put).not.toHaveBeenCalled()
  })
})

describe('message docs cache reads', () => {
  it('posts no refresh for a fresh entry', async () => {
    const worker = { postMessage: vi.fn() }

    const docs = await cache({}, documentationCacheResponse({ a_v1: {} }), worker)

    expect(docs).toEqual({ a_v1: {} })
    expect(worker.postMessage).not.toHaveBeenCalled()
  })

  it('posts exactly one refresh for a legacy entry', async () => {
    const worker = { postMessage: vi.fn() }

    await cache({}, new Response(JSON.stringify({ a_v1: {} })), worker)

    expect(worker.postMessage).toHaveBeenCalledTimes(1)
    expect(worker.postMessage).toHaveBeenCalledWith('update-message-docs')
  })

  it('does not refresh a just-written partial entry on every load, but does once the retry age passes', async () => {
    const worker = { postMessage: vi.fn() }
    const justNow = documentationCacheResponse({ a_v1: {} }, Date.now(), false)
    const tenMinutesAgo = documentationCacheResponse({ a_v1: {} }, Date.now() - 10 * 60 * 1000, false)

    await cache({}, justNow, worker)
    expect(worker.postMessage).not.toHaveBeenCalled()

    await cache({}, tenMinutesAgo, worker)
    expect(worker.postMessage).toHaveBeenCalledTimes(1)
  })
})
