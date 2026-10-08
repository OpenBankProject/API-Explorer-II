import { describe, it, expect, vi } from 'vitest'
import { cachedResult } from '../utils/cachedResult'

describe('cachedResult', () => {
  it('reuses a result until it is older than the ttl', async () => {
    let time = 0
    const compute = vi.fn(async () => time)
    const cached = cachedResult(compute, 1000, () => time)
    expect(await cached()).toBe(0)
    time = 999
    expect(await cached()).toBe(0)
    expect(compute).toHaveBeenCalledTimes(1)
    time = 1000
    expect(await cached()).toBe(1000)
    expect(compute).toHaveBeenCalledTimes(2)
  })

  it('shares one call between callers arriving at the same time', async () => {
    const compute = vi.fn(async () => 'ok')
    const cached = cachedResult(compute, 1000)
    expect(await Promise.all([cached(), cached(), cached()])).toEqual(['ok', 'ok', 'ok'])
    expect(compute).toHaveBeenCalledTimes(1)
  })

  it('does not keep a failure', async () => {
    const compute = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce('up')
    const cached = cachedResult(compute, 1000)
    await expect(cached()).rejects.toThrow('down')
    expect(await cached()).toBe('up')
  })
})
