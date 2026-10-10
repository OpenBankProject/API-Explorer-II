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
import type { Request, Response } from 'express'
import { LOG_LEVELS, logTail, type LogLevel } from '../utils/logCache.js'
import { telemetryReport } from '../utils/telemetry.js'
import { requireAnyObpRole } from '../utils/obpRoleCheck.js'
import { commitId } from '../app.js'

// This server's log cache and Telemetry, for a monitor such as OBP-Sentinel, guarded by the same Roles
// OBP-API's own log cache and Telemetry endpoints need.
const router = Router()

const capitalised = (level: string) => level.charAt(0).toUpperCase() + level.slice(1)

function nonNegativeInt(value: unknown): number | undefined {
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 ? n : undefined
}

for (const level of [...LOG_LEVELS, 'all'] as (LogLevel | 'all')[]) {
  const roles = level === 'all'
    ? ['CanGetSystemLogCacheAll']
    : [`CanGetSystemLogCache${capitalised(level)}`, 'CanGetSystemLogCacheAll']
  router.get(`/monitoring/log-cache/${level}`, requireAnyObpRole(roles), (req: Request, res: Response) => {
    res.json(logTail(level, nonNegativeInt(req.query.limit), nonNegativeInt(req.query.offset)))
  })
}

router.get('/monitoring/telemetry', requireAnyObpRole(['CanGetTelemetry']), (req: Request, res: Response) => {
  const namePrefix = typeof req.query.name_prefix === 'string' ? req.query.name_prefix : undefined
  res.json(telemetryReport(commitId, namePrefix))
})

export default router
