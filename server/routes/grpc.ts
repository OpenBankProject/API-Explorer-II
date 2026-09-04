/*
 * Open Bank Project -  API Explorer II
 * Copyright (C) 2023-2026, TESOBE GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * Email: contact@tesobe.com
 * TESOBE GmbH
 * Osloerstrasse 16/17
 * Berlin 13359, Germany
 *
 *   This product includes software developed at
 *   TESOBE (http://www.tesobe.com/)
 *
 */

import { Router } from 'express'
import type { Request, Response } from 'express'
import { credentials } from '@grpc/grpc-js'
import { Client as ReflectionClient } from 'grpc-reflection-js'
import { resolveGrpcTarget } from '../utils/grpcHost.js'

const router = Router()

const GRPC_TARGET = resolveGrpcTarget(process.env)
const GRPC_HOST = GRPC_TARGET.host
const GRPC_CREDENTIALS = GRPC_TARGET.tls ? credentials.createSsl() : credentials.createInsecure()

const REFLECTION_SERVICE_NAMES = new Set([
  'grpc.reflection.v1.ServerReflection',
  'grpc.reflection.v1alpha.ServerReflection'
])

interface FieldInfo {
  name: string
  type: string
  rule?: string
  id: number
}

interface MethodInfo {
  name: string
  requestType: string
  responseType: string
  requestStream: boolean
  responseStream: boolean
  requestFields: FieldInfo[]
  responseFields: FieldInfo[]
}

interface ServiceInfo {
  name: string
  methods: MethodInfo[]
  error?: string
}

function extractFields(root: any, typeName: string): FieldInfo[] {
  try {
    const type = root.lookupType(typeName)
    return Object.values(type.fields).map((f: any) => ({
      name: f.name,
      type: f.type,
      rule: f.rule,
      id: f.id
    }))
  } catch {
    return []
  }
}

router.get('/grpc/services', async (_req: Request, res: Response) => {
  let client: ReflectionClient | null = null
  try {
    console.log(`gRPC: Reflecting against ${GRPC_HOST}`)
    client = new ReflectionClient(GRPC_HOST, GRPC_CREDENTIALS)

    const serviceNames = await client.listServices()
    const services: ServiceInfo[] = []

    for (const name of serviceNames) {
      if (REFLECTION_SERVICE_NAMES.has(name)) continue

      try {
        const root = await client.fileContainingSymbol(name)
        const service = root.lookup(name) as any

        if (!service || !service.methods) {
          services.push({ name, methods: [] })
          continue
        }

        const methods: MethodInfo[] = Object.values(service.methods).map((m: any) => ({
          name: m.name,
          requestType: m.requestType,
          responseType: m.responseType,
          requestStream: !!m.requestStream,
          responseStream: !!m.responseStream,
          requestFields: extractFields(root, m.requestType),
          responseFields: extractFields(root, m.responseType)
        }))

        services.push({ name, methods })
      } catch (err: any) {
        console.error(`gRPC: Failed to resolve ${name}:`, err.message)
        services.push({ name, methods: [], error: err.message })
      }
    }

    res.json({ host: GRPC_HOST, services })
  } catch (error: any) {
    console.error('gRPC reflection error:', error)
    res.status(502).json({
      error: error?.message || 'Unknown error',
      host: GRPC_HOST
    })
  } finally {
    const grpcClient = client?.grpcClient as any
    if (grpcClient && typeof grpcClient.close === 'function') {
      grpcClient.close()
    }
  }
})

export default router
