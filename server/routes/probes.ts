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

import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'

// The checks the /status page runs. Each one answers true when the dependency works.
export interface ProbeChecks {
  redis: () => Promise<boolean>
  obpApi: () => Promise<boolean>
}

// Build details shown on the /status page.
export interface ProbeBuildInfo {
  gitCommit: () => string
}

type CheckResult = 'ok' | 'fail'

// Runs a check and turns its answer, or an error, into "ok" or "fail".
async function runCheck(checkName: string, check: () => Promise<boolean>): Promise<CheckResult> {
  try {
    return (await check()) ? 'ok' : 'fail'
  } catch (error) {
    console.warn(`Status page: the ${checkName} check failed:`, error instanceof Error ? error.message : error)
    return 'fail'
  }
}

function htmlEscape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Probe answers describe this moment only, so no browser or proxy may keep them.
function noStore(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store')
  next()
}

/**
 * Plain probe endpoints at the root of the backend, modelled on OBP-API:
 * - GET /alive answers `true`. It checks nothing.
 * - GET /health answers {"status":"ok"}. It shows the process is up and serves HTTP, and never touches Redis or OBP-API.
 * - GET /status checks Redis and OBP-API. It answers HTML, or JSON when the request's Accept prefers application/json, with 503 when a check fails.
 * They need no login. Mount them before the session middleware so that they never read the session store.
 * The routes under /api (/api/health, /api/ready and /api/status) are separate and unchanged.
 */
export function createProbeRoutes(checks: ProbeChecks, buildInfo: ProbeBuildInfo): Router {
  const router = Router()

  router.get('/alive', noStore, (req: Request, res: Response) => {
    res.status(200).type('application/json').send('true')
  })

  router.get('/health', noStore, (req: Request, res: Response) => {
    res.status(200).type('application/json').send('{"status":"ok"}')
  })

  router.get('/status', noStore, async (req: Request, res: Response) => {
    const [redisResult, obpApiResult] = await Promise.all([
      runCheck('redis', checks.redis),
      runCheck('obp_api', checks.obpApi)
    ])
    const allOk = redisResult === 'ok' && obpApiResult === 'ok'
    const overall = allOk ? 'ok' : 'degraded'
    const gitCommit = buildInfo.gitCommit() || 'unknown'
    const uptimeSeconds = Math.floor(process.uptime())
    res.status(allOk ? 200 : 503)

    if (req.accepts(['text/html', 'application/json']) === 'application/json') {
      res.json({
        status: overall,
        git_commit: gitCommit,
        uptime_seconds: uptimeSeconds,
        checks: { redis: redisResult, obp_api: obpApiResult }
      })
      return
    }

    const badge = (result: string) =>
      `<span style="color: ${result === 'ok' ? '#2e7d32' : '#c62828'}; font-weight: bold;" data-testid="status-${htmlEscape(result)}">${htmlEscape(result)}</span>`
    res.type('text/html').send(`<!DOCTYPE html>
<html>
<head>
  <title>API Explorer II - Status</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1 { color: #333; }
    h2 { color: #555; margin-top: 30px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { padding: 6px 12px; text-align: left; border-bottom: 1px solid #eee; vertical-align: top; }
    th { width: 180px; }
  </style>
</head>
<body>
  <h1 data-testid="status-overall">API Explorer II Status: ${badge(overall)}</h1>
  <h2>Instance</h2>
  <table>
    <tr><th>git_commit</th><td>${htmlEscape(gitCommit)}</td></tr>
    <tr><th>uptime_seconds</th><td>${uptimeSeconds}</td></tr>
  </table>
  <h2>Checks</h2>
  <table data-testid="status-checks">
    <tr><th>redis</th><td>${badge(redisResult)}</td></tr>
    <tr><th>obp_api</th><td>${badge(obpApiResult)}</td></tr>
  </table>
</body>
</html>`)
  })

  return router
}
