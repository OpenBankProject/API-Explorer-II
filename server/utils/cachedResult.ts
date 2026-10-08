// Wraps an expensive check so that public routes cannot be used to hammer OBP-API or the OIDC
// providers: a result is reused for ttlMs, and callers arriving while it is being worked out share
// that one call. A failed call is not kept, so the next caller tries again.
export function cachedResult<A extends unknown[], T>(
  compute: (...args: A) => Promise<T>,
  ttlMs: number,
  now: () => number = Date.now
): (...args: A) => Promise<T> {
  let inFlight: Promise<T> | null = null
  let last: { value: T; at: number } | null = null
  return (...args: A) => {
    if (last && now() - last.at < ttlMs) return Promise.resolve(last.value)
    if (inFlight) return inFlight
    inFlight = compute(...args)
      .then((value) => {
        last = { value, at: now() }
        return value
      })
      .finally(() => {
        inFlight = null
      })
    return inFlight
  }
}
