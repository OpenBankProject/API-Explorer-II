import { describe, expect, it } from 'vitest'
import {
  DYNAMIC_DOCS_VERSION,
  getDynamicNamespaces,
  getVersionResourceDocs,
  resourceDocsFilterFromQuery,
  tagDisplayName,
  byTagDisplayName,
  summaryDisplayName
} from '@/obp/resource-docs'

const doc = (operationId: string, fn: string, requestUrl = '/banks') => ({
  operation_id: operationId,
  implemented_by: { function: fn },
  request_url: requestUrl,
  tags: []
})

const getBanks = doc('OBPv7.0.0-getBanks', 'getBanks')
const entityV7 = doc(
  'OBPv7.0.0-dynamicEntity_createparcel',
  'dynamicEntity_createparcel',
  '/banks/ogcr/dynamic-entities/parcel'
)
const resourceDocV7 = doc(
  'OBPv7.0.0-getRegistryActivities_123',
  'getRegistryActivities_123',
  '/banks/SYS/dynamic-resource-doc/registry/activities'
)
const endpointV7 = doc('OBPv4.0.0-dynamicEndpoint_GET_my_endpoint', 'dynamicEndpoint_GET_my_endpoint', '/my-endpoint')

const docs = {
  'OBPv7.0.0': { resource_docs: [getBanks, entityV7, resourceDocV7, endpointV7] },
  [DYNAMIC_DOCS_VERSION]: {
    resource_docs: [
      // ?content=dynamic gives these ids from the version they were created in, not v7.0.0
      doc('OBPv4.0.0-dynamicEntity_createparcel', 'dynamicEntity_createparcel'),
      doc('OBPv4.0.0-getRegistryActivities_123', 'getRegistryActivities_123'),
      doc('OBPv4.0.0-dynamicEndpoint_GET_my_endpoint', 'dynamicEndpoint_GET_my_endpoint')
    ]
  }
}

describe('getVersionResourceDocs', () => {
  it('returns every doc of the version without a content filter', () => {
    expect(getVersionResourceDocs('OBPv7.0.0', docs)).toEqual([getBanks, entityV7, resourceDocV7, endpointV7])
    expect(getVersionResourceDocs('OBPv7.0.0', docs, { content: 'all' })).toHaveLength(4)
  })

  it('keeps only the dynamic docs, as the version documents them, for content=dynamic', () => {
    expect(getVersionResourceDocs('OBPv7.0.0', docs, { content: 'dynamic' })).toEqual([
      entityV7,
      resourceDocV7,
      endpointV7
    ])
  })

  it('drops the dynamic docs for content=static', () => {
    expect(getVersionResourceDocs('OBPv7.0.0', docs, { content: 'static' })).toEqual([getBanks])
  })

  it('treats the dynamic pseudo version as all dynamic', () => {
    expect(getVersionResourceDocs(DYNAMIC_DOCS_VERSION, docs, { content: 'dynamic' })).toHaveLength(3)
    expect(getVersionResourceDocs(DYNAMIC_DOCS_VERSION, docs, { content: 'static' })).toEqual([])
  })

  it('shows no dynamic docs rather than all docs when the dynamic docs are not cached', () => {
    const versionOnly = { 'OBPv7.0.0': docs['OBPv7.0.0'] }
    expect(getVersionResourceDocs('OBPv7.0.0', versionOnly, { content: 'dynamic' })).toEqual([])
    expect(getVersionResourceDocs('OBPv7.0.0', versionOnly, { content: 'static' })).toHaveLength(4)
  })

  it('returns nothing for an unknown version', () => {
    expect(getVersionResourceDocs('OBPv9.9.9', docs, { content: 'dynamic' })).toEqual([])
  })

  it('narrows dynamic docs to one bank', () => {
    expect(getVersionResourceDocs('OBPv7.0.0', docs, { content: 'dynamic', bankId: 'ogcr' })).toEqual([entityV7])
  })

  it('files dynamic docs with no bank in their URL under SYS', () => {
    expect(getVersionResourceDocs('OBPv7.0.0', docs, { content: 'dynamic', bankId: 'SYS' })).toEqual([
      resourceDocV7,
      endpointV7
    ])
  })
})

describe('getDynamicNamespaces', () => {
  it('lists SYS first, then the banks', () => {
    expect(getDynamicNamespaces('OBPv7.0.0', docs)).toEqual(['SYS', 'ogcr'])
  })
})

describe('resourceDocsFilterFromQuery', () => {
  it('reads content and bank_id', () => {
    expect(resourceDocsFilterFromQuery({ content: 'dynamic', bank_id: 'ogcr' })).toEqual({
      content: 'dynamic',
      bankId: 'ogcr'
    })
  })

  it('ignores bank_id unless the docs are dynamic', () => {
    expect(resourceDocsFilterFromQuery({ content: 'static', bank_id: 'ogcr' })).toEqual({
      content: 'static',
      bankId: undefined
    })
    expect(resourceDocsFilterFromQuery({ bank_id: 'ogcr' })).toEqual({ content: undefined, bankId: undefined })
  })
})

describe('tagDisplayName', () => {
  const tag = '_User_certification_scheme_relationship(ogcr)'

  it('shows dynamic entity tags in Proper Case, without the underscores', () => {
    expect(tagDisplayName(tag)).toBe('User Certification Scheme Relationship (ogcr)')
    expect(tagDisplayName('__Customer')).toBe('Customer')
    expect(tagDisplayName('_Carbon_credit_batch_on_chain_')).toBe('Carbon Credit Batch On Chain')
    expect(tagDisplayName('_Csem-case')).toBe('Csem Case')
  })

  it('drops the bank suffix only when the docs are narrowed to that bank', () => {
    expect(tagDisplayName(tag, 'ogcr')).toBe('User Certification Scheme Relationship')
    expect(tagDisplayName(tag, 'gh.29.uk')).toBe('User Certification Scheme Relationship (ogcr)')
  })

  it('leaves static tags alone', () => {
    expect(tagDisplayName('Account', 'ogcr')).toBe('Account')
    expect(tagDisplayName('Account-Access')).toBe('Account-Access')
    expect(tagDisplayName('Dynamic-Entity')).toBe('Dynamic-Entity')
  })

  it('sorts by the shown name', () => {
    expect(['Customer', '_Activity(ogcr)', 'Bank'].sort(byTagDisplayName('ogcr'))).toEqual([
      '_Activity(ogcr)',
      'Bank',
      'Customer'
    ])
  })
})

describe('summaryDisplayName', () => {
  const entityDoc = (summary: string) => ({
    summary,
    implemented_by: { function: 'dynamicEntity_getactivity_mediaList_ogcr' }
  })

  it('shows the entity name in dynamic entity summaries in Proper Case', () => {
    expect(summaryDisplayName(entityDoc('Get activity_media List'))).toBe('Get Activity Media List')
    expect(summaryDisplayName(entityDoc('Create new activity_media'))).toBe('Create new Activity Media')
    expect(summaryDisplayName(entityDoc('Partially update activity_media'))).toBe(
      'Partially update Activity Media'
    )
    expect(summaryDisplayName(entityDoc('Delete My activity_media by id'))).toBe('Delete My Activity Media by id')
    expect(summaryDisplayName(entityDoc('Get Public country by id'))).toBe('Get Public Country by id')
  })

  it('leaves other summaries alone', () => {
    expect(summaryDisplayName({ summary: 'Get Banks', implemented_by: { function: 'getBanks' } })).toBe('Get Banks')
    expect(
      summaryDisplayName({ summary: 'Get user_auth_context', implemented_by: { function: 'getUserAuthContext' } })
    ).toBe('Get user_auth_context')
    expect(summaryDisplayName(entityDoc('Something else entirely'))).toBe('Something else entirely')
  })
})
