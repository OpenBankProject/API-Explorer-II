/*
 * Open Bank Project -  API Explorer II
 * Copyright (C) 2023-2024, TESOBE GmbH
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

import superagent from 'superagent'
import { DEFAULT_OBP_API_VERSION } from '../shared-constants'

// Always use v5.1.0 for application infrastructure - stable and debuggable
export const OBP_API_VERSION = DEFAULT_OBP_API_VERSION
// Default to showing v6.0.0 documentation in the UI (can be overridden by env var)
export const OBP_API_DEFAULT_RESOURCE_DOC_VERSION =
  import.meta.env.VITE_OBP_API_DEFAULT_RESOURCE_DOC_VERSION ?? 'OBPv6.0.0'
const default_collection_name = 'Favourites'

export async function serverStatus(): Promise<any> {
  return (await superagent.get(`/api/status`)).body
}

export async function isServerUp(): Promise<boolean> {
  //Set the status to offline/down only if all the resource data is not availalbe.
  return !Object.values(await serverStatus()).every((isTrue) => !isTrue)
}

export async function get(path: string): Promise<any> {
  try {
    return (await superagent.get(`/api/get?path=${path}`)).body
  } catch (error: any) {
    console.log(error)
    // Extract the full OBP error message from the response body
    if (error.response && error.response.body) {
      return { error: error.response.body }
    }
    return { error }
  }
}

export async function create(path: string, body?: any): Promise<any> {
  try {
    let request = superagent.post(`/api/create?path=${path}`)
    // Only send JSON body if provided and non-empty
    if (body !== undefined && body !== null) {
      if (typeof body === 'string') {
        const trimmed = body.trim()
        if (trimmed !== '') {
          try {
            request = request.set('Content-Type', 'application/json').send(JSON.parse(trimmed))
          } catch (e) {
            // If parsing fails, omit body to avoid client-side JSON errors
          }
        }
      } else {
        request = request.set('Content-Type', 'application/json').send(body)
      }
    }
    return (await request).body
  } catch (error: any) {
    console.log(error)
    // Extract the full OBP error message from the response body
    if (error.response && error.response.body) {
      return { error: error.response.body }
    }
    return { error }
  }
}

export async function update(path: string, body?: any): Promise<any> {
  try {
    let request = superagent.put(`/api/update?path=${path}`)
    // Only send JSON body if provided and non-empty
    if (body !== undefined && body !== null) {
      if (typeof body === 'string') {
        const trimmed = body.trim()
        if (trimmed !== '') {
          try {
            request = request.set('Content-Type', 'application/json').send(JSON.parse(trimmed))
          } catch (e) {
            // If parsing fails, omit body to avoid client-side JSON errors
          }
        }
      } else {
        request = request.set('Content-Type', 'application/json').send(body)
      }
    }
    return (await request).body
  } catch (error: any) {
    console.log(error)
    // Extract the full OBP error message from the response body
    if (error.response && error.response.body) {
      return { error: error.response.body }
    }
    return { error }
  }
}

export async function discard(path: string): Promise<any> {
  try {
    return (await superagent.delete(`/api/delete?path=${path}`)).body
  } catch (error: any) {
    console.log(error)
    // Extract the full OBP error message from the response body
    if (error.response && error.response.body) {
      return { error: error.response.body }
    }
    return { error }
  }
}

export async function getCurrentUser(): Promise<any> {
  try {
    return (await superagent.get(`/api/user/current`)).body
  } catch (error: any) {
    console.log(error)
    // Extract the full OBP error message from the response body
    if (error.response && error.response.body) {
      return { error: error.response.body }
    }
    return { error }
  }
}

export async function getUserEntitlements(): Promise<any> {
  try {
    const userId = (await getCurrentUser()).user_id
    if (!userId) {
      return { error: 'User not logged in' }
    }
    const url = `/obp/${OBP_API_VERSION}/users/${userId}/entitlements`
    return await get(url)
  } catch (error: any) {
    console.log(error)
    if (error.response && error.response.body) {
      return { error: error.response.body }
    }
    return { error }
  }
}

export async function createEntitlement(bankId: string, roleName: string): Promise<any> {
  const userId = (await getCurrentUser()).user_id
  const url = `/obp/${OBP_API_VERSION}/users/${userId}/entitlements`
  const body = {
    role_name: roleName,
    bank_id: bankId
  }
  return await create(url, JSON.stringify(body))
}

export async function createMyAPICollection(): Promise<any> {
  const url = `/obp/${OBP_API_VERSION}/my/api-collections`
  const body = {
    api_collection_name: default_collection_name,
    is_sharable: true
  }
  return await create(url, JSON.stringify(body))
}

export async function createMyAPICollectionEndpoint(operation_id: string): Promise<any> {
  const url = `/obp/${OBP_API_VERSION}/my/api-collections/${default_collection_name}/api-collection-endpoints`
  const body = {
    operation_id
  }
  return await create(url, JSON.stringify(body))
}

export async function deleteMyAPICollectionEndpoint(operation_id: string): Promise<any> {
  const url = `/obp/${OBP_API_VERSION}/my/api-collections/${default_collection_name}/api-collection-endpoints/${operation_id}`
  return await discard(url)
}

export async function getMyAPICollections(): Promise<any> {
  return await get(`/obp/${OBP_API_VERSION}/my/api-collections`)
}

export async function getMyAPICollectionsEndpoint(collectionName: string): Promise<any> {
  return await get(
    `/obp/${OBP_API_VERSION}/my/api-collections/${collectionName}/api-collection-endpoints`
  )
}

export async function getAPICollectionEndpoints(collectionId: string): Promise<any> {
  return await get(`obp/v6.0.0/api-collections/${collectionId}/api-collection-endpoints`)
}

export async function getOBPBanks(): Promise<any> {
  return await get(`obp/v6.0.0/banks`)
}
