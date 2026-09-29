// OBP-API deployments conventionally expose gRPC on a `grpc.` subdomain of the
// REST host. Behind a public (https) deployment that subdomain serves gRPC
// through the ingress on port 443 with TLS — a raw high port is typically not
// reachable there — so when VITE_OBP_GRPC_HOST is unset the default is
// grpc.<VITE_OBP_API_HOST hostname>:443 with TLS for https deployments, and
// port 50051 without TLS for http (dev) ones. localhost and IP literals get no
// `grpc.` prefix (there is no subdomain to resolve there).

export const DEFAULT_GRPC_PORT = 50051
export const DEFAULT_GRPC_TLS_PORT = 443

export interface GrpcTarget {
  /** gRPC target as host:port (no scheme). */
  host: string
  /** Whether to dial with TLS channel credentials. */
  tls: boolean
}

/**
 * The gRPC target to connect to, resolved from an env-like record
 * (pass `process.env`): VITE_OBP_GRPC_HOST when set, otherwise derived from
 * VITE_OBP_API_HOST. TLS follows VITE_OBP_GRPC_TLS ("true"/"false") when set,
 * otherwise the port: 443 means TLS.
 */
export function resolveGrpcTarget(env: Record<string, string | undefined>): GrpcTarget {
  const host = env.VITE_OBP_GRPC_HOST || defaultGrpcHost(env.VITE_OBP_API_HOST)
  const tls =
    env.VITE_OBP_GRPC_TLS !== undefined
      ? env.VITE_OBP_GRPC_TLS === 'true'
      : host.endsWith(`:${DEFAULT_GRPC_TLS_PORT}`)
  return { host, tls }
}

export function defaultGrpcHost(obpApiHost: string | undefined | null): string {
  if (obpApiHost) {
    try {
      const url = new URL(obpApiHost)
      if (grpcSubdomainApplies(url.hostname)) {
        const port = url.protocol === 'https:' ? DEFAULT_GRPC_TLS_PORT : DEFAULT_GRPC_PORT
        return `grpc.${url.hostname}:${port}`
      }
      return `${url.hostname}:${DEFAULT_GRPC_PORT}`
    } catch {
      // unparseable base URL — fall through to localhost
    }
  }
  return `localhost:${DEFAULT_GRPC_PORT}`
}

function grpcSubdomainApplies(hostname: string): boolean {
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return false
  }
  // IPv4 literal; IPv6 literals contain ':' (URL.hostname keeps their brackets)
  return !/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) && !hostname.includes(':')
}
