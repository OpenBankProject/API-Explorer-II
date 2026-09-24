/**
 * Cheap "is the OBP API reachable" probe.
 *
 * The Explorer front end asks this at start-up and whenever a documentation cache is cold, so
 * it must stay light: a single request to the OBP API root endpoint, which needs no login and
 * is exempt from rate limiting by default. It deliberately does not fetch resource docs or
 * message docs the way /api/status does.
 */
export interface ObpGetter {
  get(path: string, oauthConfig: any): Promise<any>
}

function isErrorResponse(response: any): boolean {
  if (!response || typeof response !== 'object' || Object.keys(response).length === 0) return true
  return 'code' in response && Number(response.code) >= 400
}

export async function isObpReachable(client: ObpGetter, version: string): Promise<boolean> {
  try {
    return !isErrorResponse(await client.get(`/obp/${version}/root`, null))
  } catch {
    return false
  }
}

/**
 * Wrap the probe with a short-lived result cache. The /api/ready route is public and called on
 * every page load, so without this each call would cost one request to the OBP API and anyone
 * could make the Explorer relay a steady stream of them. Concurrent calls share the request in
 * flight, and the answer, up or down, is reused for `ttlMs`.
 */
export function createCachedReachability(
  client: ObpGetter,
  version: () => string,
  ttlMs: number = 5000,
  now: () => number = Date.now
): () => Promise<boolean> {
  let inFlight: Promise<boolean> | null = null
  let lastResult: boolean | null = null
  let lastAt = 0
  return async () => {
    if (lastResult !== null && now() - lastAt < ttlMs) return lastResult
    if (inFlight) return inFlight
    inFlight = isObpReachable(client, version())
      .then((result) => {
        lastResult = result
        lastAt = now()
        return result
      })
      .finally(() => {
        inFlight = null
      })
    return inFlight
  }
}
