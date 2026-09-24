const DEFAULT_REFRESH_MIN_AGE_MS = 60 * 60 * 1000
const WRITTEN_AT_HEADER = 'x-obp-cache-written-at'
const COMPLETE_HEADER = 'x-obp-cache-complete'
// A partial load (some connector or version failed) is retried sooner than a complete one, but is
// still throttled: a version that is permanently unavailable must not cause a full re-fetch on
// every page load.
const PARTIAL_RETRY_MS = 5 * 60 * 1000

function refreshMinAgeMs(): number {
  const raw = import.meta.env.VITE_DOCS_REFRESH_MIN_AGE_MS
  // An empty value (`VITE_DOCS_REFRESH_MIN_AGE_MS=`) is "not set", not zero.
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return DEFAULT_REFRESH_MIN_AGE_MS
  }
  const configured = Number(raw)
  return Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_REFRESH_MIN_AGE_MS
}

export function isDocumentationRefreshDue(
  cachedResponse: Pick<Response, 'headers'>,
  now: number = Date.now()
): boolean {
  const header = cachedResponse.headers.get(WRITTEN_AT_HEADER)
  // No stamp: a legacy entry, or one written from an incomplete load. Refresh it.
  if (header === null || header.trim() === '') return true
  const writtenAt = Number(header)
  // An unreadable stamp, or one in the future (the clock was set back), must not keep the entry
  // from ever refreshing.
  if (!Number.isFinite(writtenAt) || writtenAt > now) return true
  const complete = cachedResponse.headers.get(COMPLETE_HEADER) !== 'false'
  const minAge = refreshMinAgeMs()
  return now - writtenAt >= (complete ? minAge : Math.min(minAge, PARTIAL_RETRY_MS))
}

/**
 * Wrap a value for the documentation cache. Every entry is stamped. An entry written from a
 * partial load is also marked incomplete, so it is retried after a few minutes rather than after
 * the full minimum age, and a source that keeps failing does not turn every page load into a
 * full refresh.
 */
export function documentationCacheResponse(
  value: unknown,
  now: number = Date.now(),
  complete: boolean = true
): Response {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    [WRITTEN_AT_HEADER]: String(now)
  }
  if (!complete) headers[COMPLETE_HEADER] = 'false'
  return new Response(JSON.stringify(value), { headers })
}

export function scheduleDocumentationRefreshIfDue(
  cachedResponse: Pick<Response, 'headers'>,
  worker: Pick<Worker, 'postMessage'>,
  event: string
): boolean {
  if (!isDocumentationRefreshDue(cachedResponse)) {
    return false
  }

  worker.postMessage(event)
  return true
}

/**
 * Store a loaded documentation set. Nothing is written when nothing loaded, so a failed refresh
 * cannot replace a good cache entry with an empty one. A partial load is written marked
 * incomplete, so it is retried sooner.
 */
export async function putDocumentationCache(
  cacheStorage: any,
  value: any,
  complete: boolean,
  what: string
): Promise<void> {
  if (Object.keys(value).length === 0) {
    console.warn(`[CACHE] No ${what} were loaded; leaving the existing cache entry untouched`)
    return
  }
  await cacheStorage.put('/', documentationCacheResponse(value, Date.now(), complete))
}
