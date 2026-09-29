// Browser-side judge for the SSE transport probe served at SSE_PROBE_PATH.
//
// The Opey chat streams over SSE from the browser to the Express server; a
// reverse proxy that buffers responses breaks that silently while every
// request/response check stays green. The server emits two events a fixed
// interval apart; if they arrive together instead of spaced, something between
// the browser and the server is buffering the stream.

import {
  SSE_PROBE_PATH,
  SSE_PROBE_EVENT_COUNT,
  SSE_PROBE_SPACING_MS
} from '../shared-constants.js'

export interface SseProbeResult {
  ok: boolean
  /** ms from request start until the first event arrived */
  timeToFirstEventMs?: number
  /** ms between arrival of the first and last event — near zero means buffered */
  eventSpreadMs?: number
  buffered?: boolean
  error?: string
}

export async function runSseProbe(
  options: {
    timeoutMs?: number
    spacingMs?: number
    path?: string
    fetchFn?: typeof fetch
  } = {}
): Promise<SseProbeResult> {
  const {
    timeoutMs = 5000,
    spacingMs = SSE_PROBE_SPACING_MS,
    path = SSE_PROBE_PATH,
    fetchFn = fetch
  } = options

  const start = performance.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs)
  try {
    const res = await fetchFn(path, {
      signal: controller.signal,
      headers: { accept: 'text/event-stream' }
    })
    if (!res.ok) {
      return { ok: false, error: `Unexpected status code: ${res.status}` }
    }
    if (!res.body) {
      return { ok: false, error: 'Response has no body stream' }
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    const eventArrivals: number[] = []
    let pending = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      pending += decoder.decode(value, { stream: true })
      const blocks = pending.split('\n\n')
      pending = blocks.pop() ?? ''
      const now = performance.now()
      for (const block of blocks) {
        if (block.split('\n').some((line) => line.startsWith('data:'))) {
          eventArrivals.push(now)
        }
      }
    }

    if (eventArrivals.length < SSE_PROBE_EVENT_COUNT) {
      return {
        ok: false,
        error: `Stream ended after ${eventArrivals.length} of ${SSE_PROBE_EVENT_COUNT} events`
      }
    }

    const timeToFirstEventMs = Math.round(eventArrivals[0] - start)
    const eventSpreadMs = Math.round(eventArrivals[eventArrivals.length - 1] - eventArrivals[0])
    // The server spaced the events spacingMs apart; arriving in less than half
    // that means they were held back and delivered together.
    const buffered = eventSpreadMs < spacingMs / 2
    return {
      ok: !buffered,
      timeToFirstEventMs,
      eventSpreadMs,
      buffered,
      error: buffered
        ? `Events arrived ${eventSpreadMs}ms apart though the server spaced them ${spacingMs}ms apart — a proxy between the browser and the server is buffering SSE responses, which breaks live streaming`
        : undefined
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg === 'timeout' ? 'Request timeout' : msg }
  } finally {
    clearTimeout(timer)
  }
}
