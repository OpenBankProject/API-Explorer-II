import { describe, it, expect, vi } from 'vitest'
import { createCachedReachability, isObpReachable } from '../services/ObpReachability.js'

describe('isObpReachable', () => {
  it('asks only the OBP API root endpoint, without credentials', async () => {
    const client = { get: vi.fn().mockResolvedValue({ version: 'v5.1.0', git_commit: 'abc' }) }

    await expect(isObpReachable(client, 'v5.1.0')).resolves.toBe(true)
    expect(client.get).toHaveBeenCalledTimes(1)
    expect(client.get).toHaveBeenCalledWith('/obp/v5.1.0/root', null)
  })

  it('is false for an error response from the API', async () => {
    const client = { get: vi.fn().mockResolvedValue({ code: 500, message: 'boom' }) }
    await expect(isObpReachable(client, 'v5.1.0')).resolves.toBe(false)
  })

  it('is false for an empty or missing response', async () => {
    await expect(isObpReachable({ get: vi.fn().mockResolvedValue({}) }, 'v5.1.0')).resolves.toBe(false)
    await expect(isObpReachable({ get: vi.fn().mockResolvedValue(undefined) }, 'v5.1.0')).resolves.toBe(false)
  })

  it('is false when the request throws', async () => {
    const client = { get: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) }
    await expect(isObpReachable(client, 'v5.1.0')).resolves.toBe(false)
  })
})

describe('createCachedReachability', () => {
  it('reuses the answer within the ttl and probes again after it', async () => {
    const client = { get: vi.fn().mockResolvedValue({ version: 'v5.1.0' }) }
    let clock = 1000
    const check = createCachedReachability(client, () => 'v5.1.0', 5000, () => clock)

    await expect(check()).resolves.toBe(true)
    clock += 4000
    await expect(check()).resolves.toBe(true)
    expect(client.get).toHaveBeenCalledTimes(1)

    clock += 2000
    await expect(check()).resolves.toBe(true)
    expect(client.get).toHaveBeenCalledTimes(2)
  })

  it('shares one request between concurrent calls', async () => {
    let release: (v: any) => void = () => {}
    const client = { get: vi.fn().mockReturnValue(new Promise((resolve) => { release = resolve })) }
    const check = createCachedReachability(client, () => 'v5.1.0', 5000, () => 0)

    const calls = [check(), check(), check()]
    release({ version: 'v5.1.0' })

    await expect(Promise.all(calls)).resolves.toEqual([true, true, true])
    expect(client.get).toHaveBeenCalledTimes(1)
  })

  it('caches an unreachable answer briefly too, and recovers after the ttl', async () => {
    const client = { get: vi.fn().mockRejectedValueOnce(new Error('ECONNREFUSED')).mockResolvedValue({ version: 'v5.1.0' }) }
    let clock = 0
    const check = createCachedReachability(client, () => 'v5.1.0', 5000, () => clock)

    await expect(check()).resolves.toBe(false)
    await expect(check()).resolves.toBe(false)
    expect(client.get).toHaveBeenCalledTimes(1)

    clock += 6000
    await expect(check()).resolves.toBe(true)
  })
})
