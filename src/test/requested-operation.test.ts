import { describe, expect, it } from 'vitest'
import { getRequestedOperation } from '@/obp/resource-docs'
import { isRefreshDue } from '@/obp/common-functions'
import { OBP_API_DEFAULT_RESOURCE_DOC_VERSION } from '@/obp'

describe('getRequestedOperation', () => {
  it('reads the version and operationid from a resource-docs deep link', () => {
    expect(
      getRequestedOperation(
        '/resource-docs/OBPv7.0.0',
        '?operationid=OBPv7.0.0-getCurrentConsumerScopes'
      )
    ).toEqual({ version: 'OBPv7.0.0', operationId: 'OBPv7.0.0-getCurrentConsumerScopes' })
  })

  it('falls back to the default version when the path has none', () => {
    expect(getRequestedOperation('/resource-docs', '?operationid=OBPv7.0.0-getBanks')).toEqual({
      version: OBP_API_DEFAULT_RESOURCE_DOC_VERSION,
      operationId: 'OBPv7.0.0-getBanks'
    })
  })

  it('reads the /operationid/:id short link', () => {
    expect(getRequestedOperation('/operationid/OBPv7.0.0-getBanks', '?version=OBPv6.0.0')).toEqual({
      version: 'OBPv6.0.0',
      operationId: 'OBPv7.0.0-getBanks'
    })
  })

  it('returns undefined when no operation is requested', () => {
    expect(getRequestedOperation('/resource-docs/OBPv7.0.0', '')).toBeUndefined()
    expect(getRequestedOperation('/glossary', '?operationid=x')).toBeUndefined()
  })
})

describe('isRefreshDue', () => {
  const hour = 60 * 60 * 1000

  it('is due when the last attempt is at least one interval old', () => {
    expect(isRefreshDue(0, hour, hour)).toBe(true)
    expect(isRefreshDue(1000, hour, 1000 + hour + 1)).toBe(true)
  })

  it('is not due within the interval', () => {
    expect(isRefreshDue(1000, hour, 1000 + hour - 1)).toBe(false)
  })

  it('is due when there has never been an attempt', () => {
    expect(isRefreshDue(0, hour, Date.now())).toBe(true)
  })

  it('is due when the clock has moved backwards', () => {
    expect(isRefreshDue(5000, hour, 1000)).toBe(true)
  })
})
