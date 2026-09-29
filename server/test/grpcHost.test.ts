import { describe, it, expect } from 'vitest'
import { resolveGrpcTarget, defaultGrpcHost } from '../utils/grpcHost'

describe('resolveGrpcTarget', () => {
  it('prefers VITE_OBP_GRPC_HOST when set', () => {
    expect(
      resolveGrpcTarget({
        VITE_OBP_GRPC_HOST: 'grpc.example.com:9999',
        VITE_OBP_API_HOST: 'https://api.example.com'
      })
    ).toEqual({ host: 'grpc.example.com:9999', tls: false })
  })

  it('derives grpc.<host>:443 with TLS from an https VITE_OBP_API_HOST', () => {
    expect(resolveGrpcTarget({ VITE_OBP_API_HOST: 'https://api.example.com' })).toEqual({
      host: 'grpc.api.example.com:443',
      tls: true
    })
  })

  it('derives grpc.<host>:50051 without TLS from an http VITE_OBP_API_HOST', () => {
    expect(resolveGrpcTarget({ VITE_OBP_API_HOST: 'http://obp.internal:8080' })).toEqual({
      host: 'grpc.obp.internal:50051',
      tls: false
    })
  })

  it('turns on TLS for an explicit host on port 443', () => {
    expect(resolveGrpcTarget({ VITE_OBP_GRPC_HOST: 'grpc.example.com:443' }).tls).toBe(true)
  })

  it('lets VITE_OBP_GRPC_TLS override the port-based default in both directions', () => {
    expect(
      resolveGrpcTarget({ VITE_OBP_GRPC_HOST: 'grpc.example.com:443', VITE_OBP_GRPC_TLS: 'false' })
        .tls
    ).toBe(false)
    expect(
      resolveGrpcTarget({ VITE_OBP_GRPC_HOST: 'grpc.example.com:50051', VITE_OBP_GRPC_TLS: 'true' })
        .tls
    ).toBe(true)
  })

  it('falls back to localhost:50051 without TLS when nothing is set', () => {
    expect(resolveGrpcTarget({})).toEqual({ host: 'localhost:50051', tls: false })
  })
})

describe('defaultGrpcHost', () => {
  it('uses port 443 for https base URLs and 50051 for http ones', () => {
    expect(defaultGrpcHost('https://api.example.com')).toBe('grpc.api.example.com:443')
    expect(defaultGrpcHost('http://obp.internal:8080')).toBe('grpc.obp.internal:50051')
  })

  it('does not prefix grpc. onto localhost or IP literals', () => {
    expect(defaultGrpcHost('http://localhost:8080')).toBe('localhost:50051')
    expect(defaultGrpcHost('http://obp.localhost:8080')).toBe('obp.localhost:50051')
    expect(defaultGrpcHost('http://127.0.0.1:8080')).toBe('127.0.0.1:50051')
    expect(defaultGrpcHost('http://[::1]:8080')).toBe('[::1]:50051')
  })

  it('falls back to localhost when the base URL is unset or unparseable', () => {
    expect(defaultGrpcHost(undefined)).toBe('localhost:50051')
    expect(defaultGrpcHost('')).toBe('localhost:50051')
    expect(defaultGrpcHost('not a url')).toBe('localhost:50051')
  })
})
