import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LOG_LEVELS, clearLogCache, logTail, record } from '../utils/logCache'
import { clearTelemetry, recordTiming, telemetryReport } from '../utils/telemetry'
import { clearRoleCheckCache, tokenMayUseAnyRole } from '../utils/obpRoleCheck'
import express from 'express'
import request from 'supertest'
import monitoringRoutes from '../routes/monitoring'

vi.mock('../app.js', () => ({ commitId: 'test-commit' }))

describe('logCache', () => {
  beforeEach(() => clearLogCache())

  it('keeps lines per level, newest first, in OBP-API log cache shape', () => {
    record('error', 'first')
    record('warning', 'careful')
    record('error', 'second')
    expect(logTail('error').entries.map((e) => e.message)).toEqual(['second', 'first'])
    expect(logTail('error').entries[0].level).toBe('ERROR')
    expect(logTail('all').entries.map((e) => e.message)).toEqual(['second', 'careful', 'first'])
  })

  it('pages with limit and offset', () => {
    for (const n of [1, 2, 3, 4]) record('info', `line ${n}`)
    expect(logTail('info', 2).entries.map((e) => e.message)).toEqual(['line 4', 'line 3'])
    expect(logTail('info', 2, 1).entries.map((e) => e.message)).toEqual(['line 3', 'line 2'])
    expect(logTail('info', undefined, 3).entries.map((e) => e.message)).toEqual(['line 1'])
  })

  it('keeps at most 1000 lines of a level', () => {
    for (let n = 0; n < 1005; n++) record('debug', `line ${n}`)
    const entries = logTail('debug').entries
    expect(entries).toHaveLength(1000)
    expect(entries[0].message).toBe('line 1004')
  })
})

describe('telemetry', () => {
  beforeEach(() => clearTelemetry())

  it('reports timers in OBP-API Telemetry shape', () => {
    recordTiming('explorer.http.requests', { method: 'GET', route: '/api/status', status: '2xx' }, 0.5)
    recordTiming('explorer.http.requests', { status: '2xx', route: '/api/status', method: 'GET' }, 1.5)
    const report = telemetryReport('abc123', 'explorer.')
    expect(report.git_commit).toBe('abc123')
    expect(report.api_instance_id).toMatch(/^api-explorer-ii_/)
    expect(report.meters).toEqual([
      {
        name: 'explorer.http.requests',
        type: 'timer',
        base_unit: 'seconds',
        tags: { method: 'GET', route: '/api/status', status: '2xx' },
        measurements: { count: 2, total_time: 2, max: 1.5 }
      }
    ])
  })

  it('includes process gauges', () => {
    expect(telemetryReport('x').meters.map((m) => m.name)).toContain('process.memory.rss')
  })
})

describe('obpRoleCheck', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    clearRoleCheckCache()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  const answer = (status: number, modes: string[] = []) =>
    Promise.resolve(new Response(JSON.stringify({ allowed_for_auth_modes: modes }), { status }))

  it('allows a token OBP-API allows for UserOrApplication, asking at SYS', async () => {
    fetchMock.mockReturnValueOnce(answer(200, ['ApplicationOnly', 'UserOrApplication']))
    expect(await tokenMayUseAnyRole('http://obp', 't', ['CanGetTelemetry'])).toBe('allowed')
    expect(fetchMock.mock.calls[0][0]).toBe('http://obp/obp/v7.0.0/banks/SYS/my/roles/CanGetTelemetry')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer t')
  })

  it('tries the next Role when one is not allowed', async () => {
    fetchMock.mockReturnValueOnce(answer(200, ['UserOnly'])).mockReturnValueOnce(answer(200, ['UserOrApplication']))
    expect(await tokenMayUseAnyRole('http://obp', 't', ['CanGetSystemLogCacheError', 'CanGetSystemLogCacheAll'])).toBe('allowed')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('refuses when no Role is allowed, and says unauthorized when OBP-API rejects the token', async () => {
    fetchMock.mockReturnValueOnce(answer(200, [])).mockReturnValueOnce(answer(404))
    expect(await tokenMayUseAnyRole('http://obp', 't', ['A', 'B'])).toBe('forbidden')
    fetchMock.mockReturnValueOnce(answer(401))
    expect(await tokenMayUseAnyRole('http://obp', 'bad', ['A'])).toBe('unauthorized')
  })

  it('reuses an answer for a minute', async () => {
    fetchMock.mockImplementation(() => answer(200, ['UserOrApplication']))
    await tokenMayUseAnyRole('http://obp', 't', ['A'], 0)
    await tokenMayUseAnyRole('http://obp', 't', ['A'], 59_999)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await tokenMayUseAnyRole('http://obp', 't', ['A'], 60_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('monitoring endpoints', () => {
  // A fake OBP-API: what each token may do, as GET /banks/SYS/my/roles/ROLE answers it.
  const tokens: Record<string, Record<string, string[]>> = {
    'error-reader': { CanGetSystemLogCacheError: ['UserOrApplication'] },
    'all-reader': { CanGetSystemLogCacheAll: ['UserOrApplication'] },
    'telemetry-reader': { CanGetTelemetry: ['UserOrApplication'] },
    'user-only': { CanGetSystemLogCacheAll: ['UserOnly'], CanGetTelemetry: ['UserOnly'] },
    'no-roles': {}
  }
  const fakeObpApi = vi.fn(async (url: string, init: any) => {
    const token = init.headers.Authorization.slice('Bearer '.length)
    if (!url.startsWith('http://obp/obp/v7.0.0/banks/SYS/my/roles/')) return new Response('{}', { status: 404 })
    if (!(token in tokens)) return new Response('{}', { status: 401 })
    const role = decodeURIComponent(url.split('/').pop()!)
    return new Response(JSON.stringify({ allowed_for_auth_modes: tokens[token][role] ?? [] }), { status: 200 })
  })

  // Stands in for the session middleware: a header X-Test-Session-Token puts that token in the session.
  const app = express()
    .use((req: any, _res, next) => {
      req.session = { oauth2_access_token: req.headers['x-test-session-token'] }
      next()
    })
    .use('/api', monitoringRoutes)
  const get = (path: string, token?: string) => {
    const req = request(app).get(path)
    return token ? req.set('Authorization', `Bearer ${token}`) : req
  }
  const getAsLoggedIn = (path: string, sessionToken: string) =>
    request(app).get(path).set('X-Test-Session-Token', sessionToken)

  beforeEach(() => {
    clearRoleCheckCache()
    clearLogCache()
    clearTelemetry()
    fakeObpApi.mockClear()
    vi.stubGlobal('fetch', fakeObpApi)
    vi.stubEnv('VITE_OBP_API_HOST', 'http://obp')
    for (const level of LOG_LEVELS) record(level, `a ${level} line`)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  const levels = ['trace', 'debug', 'info', 'warning', 'error'] as const
  const capitalised = (level: string) => level.charAt(0).toUpperCase() + level.slice(1)

  it.each(levels)('returns the %s log cache to a token allowed its level Role or the All Role', async (level) => {
    tokens[`${level}-only`] = { [`CanGetSystemLogCache${capitalised(level)}`]: ['UserOrApplication'] }
    for (const token of [`${level}-only`, 'all-reader']) {
      const res = await get(`/api/monitoring/log-cache/${level}`, token)
      expect(res.status).toBe(200)
      expect(res.body.entries.map((e: any) => e.message)).toEqual([`a ${level} line`])
    }
  })

  it.each(levels)('refuses the %s log cache to tokens without its Roles, returning no lines', async (level) => {
    for (const token of ['no-roles', 'telemetry-reader', 'user-only', level === 'error' ? 'all-but-error' : 'error-reader']) {
      tokens['all-but-error'] = { CanGetSystemLogCacheInfo: ['UserOrApplication'] }
      const res = await get(`/api/monitoring/log-cache/${level}`, token)
      expect(res.status).toBe(403)
      expect(res.body.entries).toBeUndefined()
    }
  })

  it('returns every level only with CanGetSystemLogCacheAll, not with a single level Role', async () => {
    const all = await get('/api/monitoring/log-cache/all', 'all-reader')
    expect(all.status).toBe(200)
    expect(all.body.entries).toHaveLength(5)
    const refused = await get('/api/monitoring/log-cache/all', 'error-reader')
    expect(refused.status).toBe(403)
    expect(refused.body.entries).toBeUndefined()
    expect(fakeObpApi.mock.calls.map((c) => c[0].split('/').pop())).toEqual(['CanGetSystemLogCacheAll', 'CanGetSystemLogCacheAll'])
  })

  it('returns Telemetry only with CanGetTelemetry', async () => {
    const ok = await get('/api/monitoring/telemetry', 'telemetry-reader')
    expect(ok.status).toBe(200)
    expect(ok.body.git_commit).toBe('test-commit')
    expect(ok.body.meters.length).toBeGreaterThan(0)
    for (const token of ['all-reader', 'user-only', 'no-roles']) {
      const res = await get('/api/monitoring/telemetry', token)
      expect(res.status).toBe(403)
      expect(res.body.meters).toBeUndefined()
    }
  })

  it('refuses without a token, or with one OBP-API does not accept, without returning data', async () => {
    for (const path of ['/api/monitoring/log-cache/error', '/api/monitoring/telemetry']) {
      for (const res of [await get(path), await get(path, 'unknown-token')]) {
        expect(res.status).toBe(401)
        expect(res.body.entries).toBeUndefined()
        expect(res.body.meters).toBeUndefined()
      }
    }
  })

  it('uses the logged-in User\'s session token when there is no Bearer header, with the same Roles', async () => {
    const ok = await getAsLoggedIn('/api/monitoring/log-cache/all', 'all-reader')
    expect(ok.status).toBe(200)
    expect(ok.body.entries).toHaveLength(5)
    const refused = await getAsLoggedIn('/api/monitoring/telemetry', 'all-reader')
    expect(refused.status).toBe(403)
    expect(refused.body.meters).toBeUndefined()
    const expired = await getAsLoggedIn('/api/monitoring/log-cache/error', 'unknown-token')
    expect(expired.status).toBe(401)
    expect(expired.body.entries).toBeUndefined()
  })

  it('refuses with 503 when OBP-API cannot be asked', async () => {
    fakeObpApi.mockRejectedValueOnce(new Error('connection refused'))
    const unreachable = await get('/api/monitoring/log-cache/error', 'error-reader')
    expect(unreachable.status).toBe(503)
    expect(unreachable.body.entries).toBeUndefined()
    vi.stubEnv('VITE_OBP_API_HOST', '')
    const noHost = await get('/api/monitoring/telemetry', 'telemetry-reader')
    expect(noHost.status).toBe(503)
    expect(noHost.body.meters).toBeUndefined()
  })

  it('passes limit, offset and name_prefix through', async () => {
    const paged = await get('/api/monitoring/log-cache/all?limit=2&offset=1', 'all-reader')
    expect(paged.body.entries.map((e: any) => e.message)).toEqual(['a warning line', 'a info line'])
    const prefixed = await get('/api/monitoring/telemetry?name_prefix=process.uptime', 'telemetry-reader')
    expect(prefixed.body.meters.map((m: any) => m.name)).toEqual(['process.uptime'])
  })
})
