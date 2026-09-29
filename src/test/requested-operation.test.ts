import { describe, expect, it } from 'vitest'
import { getRequestedOperation } from '@/obp/resource-docs'
import { documentationCacheAgeMs } from '@/obp/documentation-refresh'
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

describe('documentationCacheAgeMs', () => {
  const entry = (writtenAt?: string) =>
    new Response('{}', { headers: writtenAt ? { 'x-obp-cache-written-at': writtenAt } : {} })

  it('returns how long ago the entry was written', () => {
    expect(documentationCacheAgeMs(entry('1000'), 6000)).toBe(5000)
  })

  it('returns undefined for a legacy entry with no stamp', () => {
    expect(documentationCacheAgeMs(entry(), 6000)).toBeUndefined()
  })

  it('returns undefined for an unreadable stamp or one in the future', () => {
    expect(documentationCacheAgeMs(entry('nope'), 6000)).toBeUndefined()
    expect(documentationCacheAgeMs(entry('9000'), 6000)).toBeUndefined()
  })
})
