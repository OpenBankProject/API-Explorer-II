import { describe, expect, it } from 'vitest'
import {
  domainApiMenuItems,
  domainApiVersion,
  isDomainApiVersion,
  versionDisplayName
} from '@/obp/domain-apis'
import { getVersionResourceDocs } from '@/obp/resource-docs'

const api = {
  bank_id: 'ogcr',
  base_path: 'crcf/ogcr/v1',
  version: '1.0.0',
  title: 'OGCR Domain API',
  description: '',
  url: 'https://dcr.example.org/crcf/ogcr/v1',
  openapi_url: 'https://dcr.example.org/crcf/ogcr/v1/openapi.yaml'
}
const publicActivity = {
  operation_id: 'OBPv7.0.0-dynamicEntity_getPublicactivityList',
  implemented_by: { function: 'dynamicEntity_getPublicactivityList' },
  request_url: '/crcf/ogcr/v1/public/activity',
  specified_url: '/crcf/ogcr/v1/public/activity',
  tags: []
}
const docs = {
  'OBPv7.0.0': { resource_docs: [] },
  [domainApiVersion(api.base_path)]: { resource_docs: [publicActivity], domain_api: api }
}

describe('Domain API versions', () => {
  it('keys a Domain API by its base path, in one route segment', () => {
    expect(domainApiVersion('crcf/ogcr/v1')).toBe('DomainAPI~crcf~ogcr~v1')
    expect(isDomainApiVersion('DomainAPI~crcf~ogcr~v1')).toBe(true)
    expect(isDomainApiVersion('OBPv7.0.0')).toBe(false)
    expect(isDomainApiVersion(undefined)).toBe(false)
  })

  it('names a Domain API by its title and base path, and other versions as they are', () => {
    expect(versionDisplayName('DomainAPI~crcf~ogcr~v1', docs)).toBe('OGCR Domain API (/crcf/ogcr/v1)')
    expect(versionDisplayName('OBPv7.0.0', docs)).toBe('OBPv7.0.0')
  })

  it('lists the Domain APIs for the Versions menu', () => {
    expect(domainApiMenuItems(docs)).toEqual({ 'OGCR Domain API (/crcf/ogcr/v1)': 'DomainAPI~crcf~ogcr~v1' })
    expect(domainApiMenuItems(undefined)).toEqual({})
  })

  it('shows all of a Domain API\'s docs whatever the content filter', () => {
    const version = domainApiVersion(api.base_path)
    expect(getVersionResourceDocs(version, docs, { content: 'static' })).toEqual([publicActivity])
    expect(getVersionResourceDocs(version, docs, { content: 'dynamic', bankId: 'ogcr' })).toEqual([publicActivity])
  })
})
