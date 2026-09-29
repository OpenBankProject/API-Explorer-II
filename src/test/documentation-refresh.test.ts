import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  documentationCacheResponse,
  isDocumentationRefreshDue,
  scheduleDocumentationRefreshIfDue
} from '../obp/documentation-refresh'

describe('documentation refresh throttling', () => {
  it('does not refresh a recently written cache entry', () => {
    const now = Date.now()
    const cachedResponse = documentationCacheResponse({ docs: [] }, now)

    expect(isDocumentationRefreshDue(cachedResponse, now + 1000)).toBe(false)
  })

  it('refreshes expired and legacy cache entries', () => {
    const now = Date.now()
    const expired = documentationCacheResponse({ docs: [] }, now - 60 * 60 * 1000)
    const legacy = new Response(JSON.stringify({ docs: [] }))

    expect(isDocumentationRefreshDue(expired, now)).toBe(true)
    expect(isDocumentationRefreshDue(legacy, now)).toBe(true)
  })

  it('posts exactly one update only when the cache entry is due', () => {
    const worker = { postMessage: vi.fn() }
    const fresh = documentationCacheResponse({ docs: [] })
    const legacy = new Response(JSON.stringify({ docs: [] }))

    expect(scheduleDocumentationRefreshIfDue(fresh, worker, 'refresh')).toBe(false)
    expect(scheduleDocumentationRefreshIfDue(legacy, worker, 'refresh')).toBe(true)
    expect(worker.postMessage).toHaveBeenCalledTimes(1)
    expect(worker.postMessage).toHaveBeenCalledWith('refresh')
  })

  describe('edge cases', () => {
    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('treats a missing timestamp header as due', () => {
      const legacy = new Response('{}')
      expect(isDocumentationRefreshDue(legacy, Date.now())).toBe(true)
    })

    it('treats an unreadable timestamp as due', () => {
      const broken = new Response('{}', { headers: { 'x-obp-cache-written-at': 'not-a-number' } })
      expect(isDocumentationRefreshDue(broken, Date.now())).toBe(true)
    })

    it('treats a timestamp in the future (clock set back) as due', () => {
      const now = Date.now()
      const future = documentationCacheResponse({ docs: [] }, now + 5 * 60 * 1000)
      expect(isDocumentationRefreshDue(future, now)).toBe(true)
    })

    it('retries an incomplete entry after a few minutes, not after the full minimum age', () => {
      const now = Date.now()
      const minute = 60 * 1000
      const partial = documentationCacheResponse({ docs: [] }, now - 2 * minute, false)
      expect(partial.headers.get('x-obp-cache-complete')).toBe('false')
      // Still inside the retry window: throttled, so a source that keeps failing is not re-fetched on every load.
      expect(isDocumentationRefreshDue(partial, now)).toBe(false)
      const older = documentationCacheResponse({ docs: [] }, now - 6 * minute, false)
      expect(isDocumentationRefreshDue(older, now)).toBe(true)
      // A complete entry of the same age is still inside the full minimum age.
      expect(isDocumentationRefreshDue(documentationCacheResponse({ docs: [] }, now - 6 * minute), now)).toBe(false)
    })

    it('never retries a partial entry later than the configured minimum age', () => {
      vi.stubEnv('VITE_DOCS_REFRESH_MIN_AGE_MS', '1000')
      const now = Date.now()
      expect(isDocumentationRefreshDue(documentationCacheResponse({ docs: [] }, now - 2000, false), now)).toBe(true)
    })

    it('uses the default minimum age when the environment variable is empty', () => {
      vi.stubEnv('VITE_DOCS_REFRESH_MIN_AGE_MS', '')
      const now = Date.now()
      const recent = documentationCacheResponse({ docs: [] }, now - 1000)
      expect(isDocumentationRefreshDue(recent, now)).toBe(false)
    })

    it('honours a configured minimum age', () => {
      vi.stubEnv('VITE_DOCS_REFRESH_MIN_AGE_MS', '1000')
      const now = Date.now()
      const entry = documentationCacheResponse({ docs: [] }, now - 2000)
      expect(isDocumentationRefreshDue(entry, now)).toBe(true)
      expect(isDocumentationRefreshDue(documentationCacheResponse({ docs: [] }, now - 500), now)).toBe(false)
    })

    it('falls back to the default for a negative or non-numeric value', () => {
      const now = Date.now()
      const recent = documentationCacheResponse({ docs: [] }, now - 1000)
      vi.stubEnv('VITE_DOCS_REFRESH_MIN_AGE_MS', '-5')
      expect(isDocumentationRefreshDue(recent, now)).toBe(false)
      vi.stubEnv('VITE_DOCS_REFRESH_MIN_AGE_MS', 'soon')
      expect(isDocumentationRefreshDue(recent, now)).toBe(false)
    })
  })
})
