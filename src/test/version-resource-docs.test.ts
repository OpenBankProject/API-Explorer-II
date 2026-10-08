import { describe, expect, it } from 'vitest'
import { DYNAMIC_DOCS_VERSION, getVersionResourceDocs } from '@/obp/resource-docs'

const doc = (operationId: string, fn: string) => ({
  operation_id: operationId,
  implemented_by: { function: fn },
  tags: []
})

const getBanks = doc('OBPv7.0.0-getBanks', 'getBanks')
const entityV7 = doc('OBPv7.0.0-dynamicEntity_createparcel', 'dynamicEntity_createparcel')
const resourceDocV7 = doc('OBPv7.0.0-getRegistryActivities_123', 'getRegistryActivities_123')

const docs = {
  'OBPv7.0.0': { resource_docs: [getBanks, entityV7, resourceDocV7] },
  [DYNAMIC_DOCS_VERSION]: {
    resource_docs: [
      // ?content=dynamic gives these ids from the version they were created in, not v7.0.0
      doc('OBPv4.0.0-dynamicEntity_createparcel', 'dynamicEntity_createparcel'),
      doc('OBPv4.0.0-getRegistryActivities_123', 'getRegistryActivities_123')
    ]
  }
}

describe('getVersionResourceDocs', () => {
  it('returns every doc of the version without a content filter', () => {
    expect(getVersionResourceDocs('OBPv7.0.0', docs)).toEqual([getBanks, entityV7, resourceDocV7])
    expect(getVersionResourceDocs('OBPv7.0.0', docs, 'all')).toHaveLength(3)
  })

  it('keeps only the dynamic docs, as the version documents them, for content=dynamic', () => {
    expect(getVersionResourceDocs('OBPv7.0.0', docs, 'dynamic')).toEqual([entityV7, resourceDocV7])
  })

  it('drops the dynamic docs for content=static', () => {
    expect(getVersionResourceDocs('OBPv7.0.0', docs, 'static')).toEqual([getBanks])
  })

  it('treats the dynamic pseudo version as all dynamic', () => {
    expect(getVersionResourceDocs(DYNAMIC_DOCS_VERSION, docs, 'dynamic')).toHaveLength(2)
    expect(getVersionResourceDocs(DYNAMIC_DOCS_VERSION, docs, 'static')).toEqual([])
  })

  it('shows no dynamic docs rather than all docs when the dynamic docs are not cached', () => {
    const versionOnly = { 'OBPv7.0.0': docs['OBPv7.0.0'] }
    expect(getVersionResourceDocs('OBPv7.0.0', versionOnly, 'dynamic')).toEqual([])
    expect(getVersionResourceDocs('OBPv7.0.0', versionOnly, 'static')).toHaveLength(3)
  })

  it('returns nothing for an unknown version', () => {
    expect(getVersionResourceDocs('OBPv9.9.9', docs, 'dynamic')).toEqual([])
  })
})
