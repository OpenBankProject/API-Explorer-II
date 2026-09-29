import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('superagent', () => ({ default: { get } }))

import { isServerUp } from '../obp'

describe('isServerUp', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('asks the readiness endpoint, which checks the OBP API', async () => {
    get.mockResolvedValue({ body: { status: 'ok' } })

    await expect(isServerUp()).resolves.toBe(true)
    expect(get).toHaveBeenCalledWith('/api/ready')
  })

  it('is false when the OBP API is unreachable (readiness answers 503)', async () => {
    // superagent rejects on a non-2xx response
    get.mockRejectedValue(Object.assign(new Error('Service Unavailable'), { status: 503 }))

    await expect(isServerUp()).resolves.toBe(false)
  })

  it('is false when the readiness answer is not ok', async () => {
    get.mockResolvedValue({ body: { status: 'unavailable' } })

    await expect(isServerUp()).resolves.toBe(false)
  })

  it('is false when the Explorer server itself cannot be reached', async () => {
    get.mockRejectedValue(new Error('unreachable'))

    await expect(isServerUp()).resolves.toBe(false)
  })
})
