import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createProbeRoutes, type ProbeChecks } from '../routes/probes'

// Builds an app with only the probe routes, with checks that answer as given.
function appWith(checks: ProbeChecks) {
  const app = express()
  app.use(createProbeRoutes(checks, { gitCommit: () => 'test-commit' }))
  return app
}

const allWorking: ProbeChecks = {
  redis: async () => true,
  obpApi: async () => true
}

// Checks that fail the test if they are called.
const mustNotBeCalled: ProbeChecks = {
  redis: async () => {
    throw new Error('redis must not be checked')
  },
  obpApi: async () => {
    throw new Error('OBP-API must not be checked')
  }
}

describe('GET /alive', () => {
  it('answers true as JSON without running any check', async () => {
    const response = await request(appWith(mustNotBeCalled)).get('/alive')
    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toMatch(/^application\/json/)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.text).toBe('true')
  })
})

describe('GET /health', () => {
  it('answers {"status":"ok"} without touching Redis or OBP-API', async () => {
    const response = await request(appWith(mustNotBeCalled)).get('/health')
    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toMatch(/^application\/json/)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.text).toBe('{"status":"ok"}')
  })
})

describe('GET /status', () => {
  it('answers JSON with 200 when the request prefers JSON and every check works', async () => {
    const response = await request(appWith(allWorking)).get('/status').set('Accept', 'application/json')
    expect(response.status).toBe(200)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.body).toMatchObject({
      status: 'ok',
      git_commit: 'test-commit',
      checks: { redis: 'ok', obp_api: 'ok' }
    })
    expect(typeof response.body.uptime_seconds).toBe('number')
  })

  it('answers 503 and "degraded" when OBP-API cannot be reached', async () => {
    const response = await request(appWith({ ...allWorking, obpApi: async () => false }))
      .get('/status')
      .set('Accept', 'application/json')
    expect(response.status).toBe(503)
    expect(response.body.status).toBe('degraded')
    expect(response.body.checks).toEqual({ redis: 'ok', obp_api: 'fail' })
  })

  it('answers 503 when the Redis check throws', async () => {
    const response = await request(
      appWith({
        ...allWorking,
        redis: async () => {
          throw new Error('connection refused')
        }
      })
    )
      .get('/status')
      .set('Accept', 'application/json')
    expect(response.status).toBe(503)
    expect(response.body.checks.redis).toBe('fail')
  })

  it('answers HTML to a browser', async () => {
    const response = await request(appWith(allWorking))
      .get('/status')
      .set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8')
    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toMatch(/^text\/html/)
    expect(response.text).toContain('API Explorer II Status')
  })

  it('answers HTML with 503 to a browser when a check fails', async () => {
    const response = await request(appWith({ ...allWorking, redis: async () => false })).get('/status')
    expect(response.status).toBe(503)
    expect(response.headers['content-type']).toMatch(/^text\/html/)
    expect(response.text).toContain('degraded')
  })
})
