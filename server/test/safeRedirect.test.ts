import { describe, it, expect } from 'vitest'
import { safeRedirectPath } from '../utils/safeRedirect'

describe('safeRedirectPath', () => {
  it('accepts paths on this site', () => {
    expect(safeRedirectPath('/')).toBe('/')
    expect(safeRedirectPath('/resource-docs/OBPv7.0.0?operationid=OBPv7.0.0-getBanks&content=dynamic')).toBe(
      '/resource-docs/OBPv7.0.0?operationid=OBPv7.0.0-getBanks&content=dynamic'
    )
  })

  it('rejects other sites', () => {
    for (const value of [
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      '\\\\evil.example',
      '/\t/evil.example',
      '/\n/evil.example',
      'javascript:alert(1)',
      'evil.example'
    ]) {
      expect(safeRedirectPath(value), value).toBeUndefined()
    }
  })

  it('rejects anything that is not a single string', () => {
    expect(safeRedirectPath(undefined)).toBeUndefined()
    expect(safeRedirectPath(['/a', '/b'])).toBeUndefined()
  })
})
