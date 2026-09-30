import { describe, it, expect } from 'vitest'
import type { Request } from 'express'
import {
  canonicalAddress,
  clientIpOf,
  forwardedForHeaders,
  forwardedForOf,
  parseTrustProxy
} from '../utils/clientIp.js'

const requestFrom = (peer: string | undefined, forwardedFor?: string | string[], ip?: string) =>
  ({
    socket: { remoteAddress: peer },
    headers: forwardedFor === undefined ? {} : { 'x-forwarded-for': forwardedFor },
    ip
  }) as unknown as Request

describe('canonicalAddress', () => {
  it('turns IPv6-mapped IPv4 into plain IPv4 and removes IPv6 brackets', () => {
    expect(canonicalAddress('::ffff:203.0.113.7')).toBe('203.0.113.7')
    expect(canonicalAddress('[2001:db8::1]')).toBe('2001:db8::1')
    expect(canonicalAddress('2001:db8::1')).toBe('2001:db8::1')
  })
})

describe('forwardedForOf', () => {
  it('is the TCP peer alone when the request carried no chain', () => {
    expect(forwardedForOf(requestFrom('::ffff:10.0.0.2'))).toBe('10.0.0.2')
  })

  it('appends the TCP peer to the incoming chain, keeping every entry', () => {
    expect(forwardedForOf(requestFrom('10.0.0.2', '6.6.6.6, 203.0.113.9'))).toBe(
      '6.6.6.6, 203.0.113.9, 10.0.0.2'
    )
  })

  it('joins a chain sent on several header lines, in order', () => {
    expect(forwardedForOf(requestFrom('10.0.0.2', ['6.6.6.6', '203.0.113.9']))).toBe(
      '6.6.6.6, 203.0.113.9, 10.0.0.2'
    )
  })

  it('sends nothing when the TCP peer is unknown, since nothing vouches for the chain', () => {
    expect(forwardedForOf(requestFrom(undefined, '6.6.6.6'))).toBeUndefined()
  })
})

describe('clientIpOf', () => {
  it("is Express's resolved address, in canonical form", () => {
    expect(clientIpOf(requestFrom('10.0.0.2', undefined, '::ffff:203.0.113.9'))).toBe('203.0.113.9')
    expect(clientIpOf(requestFrom('10.0.0.2'))).toBeUndefined()
  })
})

describe('forwardedForHeaders', () => {
  it('sends the chain as X-Forwarded-For, or nothing', () => {
    expect(forwardedForHeaders({ forwardedFor: '203.0.113.9, 10.0.0.2' })).toEqual({
      'X-Forwarded-For': '203.0.113.9, 10.0.0.2'
    })
    expect(forwardedForHeaders({ clientIp: '203.0.113.9' })).toEqual({})
    expect(forwardedForHeaders(undefined)).toEqual({})
  })
})

describe('parseTrustProxy', () => {
  it('keeps the previous default when unset', () => {
    expect(parseTrustProxy(undefined, 'production')).toBe(1)
    expect(parseTrustProxy(undefined, 'development')).toBe(false)
  })

  it('reads numbers, booleans and address lists', () => {
    expect(parseTrustProxy('2', 'development')).toBe(2)
    expect(parseTrustProxy('true', 'development')).toBe(true)
    expect(parseTrustProxy('false', 'production')).toBe(false)
    expect(parseTrustProxy('10.0.0.5, loopback', 'production')).toBe('10.0.0.5, loopback')
  })
})
