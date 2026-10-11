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

import type { NextFunction, Request, Response } from 'express'

// Aggregated numbers about how this server is running, in the shape of OBP-API's
// GET /obp/v7.0.0/management/telemetry, so a monitor such as OBP-Sentinel reads both the same way.
// Like OBP-API's Telemetry it never records who made a call.

export interface Meter {
  name: string
  type: 'timer' | 'gauge'
  base_unit?: string
  tags: Record<string, string>
  measurements: Record<string, number>
}

interface Timing {
  count: number
  totalSeconds: number
  maxSeconds: number
}

/** Names this process in the report, as OBP-API's api_instance_id does. */
export const instanceId = `api-explorer-ii_${globalThis.crypto.randomUUID()}`

const timers = new Map<string, { name: string; tags: Record<string, string>; timing: Timing }>()

export function recordTiming(name: string, tags: Record<string, string>, seconds: number): void {
  const key = name + JSON.stringify(Object.entries(tags).sort())
  let timer = timers.get(key)
  if (!timer) {
    timer = { name, tags, timing: { count: 0, totalSeconds: 0, maxSeconds: 0 } }
    timers.set(key, timer)
  }
  timer.timing.count += 1
  timer.timing.totalSeconds += seconds
  timer.timing.maxSeconds = Math.max(timer.timing.maxSeconds, seconds)
}

export function clearTelemetry(): void {
  timers.clear()
}

function statusClass(status: number): string {
  return `${Math.floor(status / 100)}xx`
}

/** Times every request by its route (not its URL, so ids in paths do not each become a meter). */
export function requestTelemetry(req: Request, res: Response, next: NextFunction): void {
  const started = process.hrtime.bigint()
  res.on('finish', () => {
    const seconds = Number(process.hrtime.bigint() - started) / 1e9
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : 'unmatched'
    recordTiming('explorer.http.requests', { method: req.method, route, status: statusClass(res.statusCode) }, seconds)
  })
  next()
}

/** Times every call this server makes to OBP-API, by outcome. */
export function instrumentObpApiCalls(obpApiHost: string | undefined): void {
  if (!obpApiHost) return
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url
    if (!url?.startsWith(obpApiHost)) return originalFetch(input, init)
    const started = process.hrtime.bigint()
    const elapsed = () => Number(process.hrtime.bigint() - started) / 1e9
    try {
      const response = await originalFetch(input, init)
      recordTiming('explorer.obp_api.calls', { outcome: statusClass(response.status) }, elapsed())
      return response
    } catch (error) {
      recordTiming('explorer.obp_api.calls', { outcome: 'network_error' }, elapsed())
      throw error
    }
  }
}

export function telemetryReport(gitCommit: string, namePrefix?: string) {
  const memory = process.memoryUsage()
  const meters: Meter[] = [
    ...[...timers.values()].map(
      ({ name, tags, timing }): Meter => ({
        name,
        type: 'timer',
        base_unit: 'seconds',
        tags,
        measurements: { count: timing.count, total_time: timing.totalSeconds, max: timing.maxSeconds }
      })
    ),
    { name: 'process.uptime', type: 'gauge', base_unit: 'seconds', tags: {}, measurements: { value: process.uptime() } },
    { name: 'process.memory.rss', type: 'gauge', base_unit: 'bytes', tags: {}, measurements: { value: memory.rss } },
    { name: 'process.memory.heap_used', type: 'gauge', base_unit: 'bytes', tags: {}, measurements: { value: memory.heapUsed } }
  ]
  return {
    api_instance_id: instanceId,
    git_commit: gitCommit,
    meters: meters
      .filter((meter) => !namePrefix || meter.name.startsWith(namePrefix))
      .sort((a, b) => (a.name + JSON.stringify(a.tags)).localeCompare(b.name + JSON.stringify(b.tags)))
  }
}
