import superagent from 'superagent'

export const version = import.meta.env.VITE_OBP_API_VERSION
const default_collection_name = 'Favourites'

export async function checkServerStatus(): Promise<boolean> {
  const status = (await superagent.get(`/api/status`)).body['status']
  return status
}

export async function get(path: string): Promise<any> {
  try {
    return (await superagent.get(`/api/get?path=${path}`)).body
  } catch (error) {
    console.log(error)
    return { error }
  }
}

export async function create(path: string, body: any): Promise<any> {
  try {
    return (await superagent.post(`/api/create?path=${path}`).send(JSON.parse(body))).body
  } catch (error) {
    console.log(error)
    return { error }
  }
}

export async function update(path: string, body: any): Promise<any> {
  try {
    return (await superagent.put(`/api/update?path=${path}`).send(JSON.parse(body))).body
  } catch (error) {
    console.log(error)
    return { error }
  }
}

export async function discard(path: string): Promise<any> {
  try {
    return (await superagent.delete(`/api/delete?path=${path}`)).body
  } catch (error) {
    console.log(error)
    return { error }
  }
}

export async function getCurrentUser(): Promise<any> {
  try {
    return (await superagent.get(`/api/user/current`)).body
  } catch (error) {
    console.log(error)
    return { error }
  }
}

export async function createEntitlement(bankId: string, roleName: string): Promise<any> {
  const userId = (await getCurrentUser()).user_id
  const url = `/obp/${version}/users/${userId}/entitlements`
  const body = {
    role_name: roleName,
    bank_id: bankId
  }
  return await create(url, JSON.stringify(body))
}

export async function createMyAPICollection(): Promise<any> {
  const url = `/obp/${version}/my/api-collections`
  const body = {
    api_collection_name: default_collection_name,
    is_sharable: true
  }
  return await create(url, JSON.stringify(body))
}

export async function createMyAPICollectionEndpoint(operation_id: string): Promise<any> {
  const url = `/obp/${version}/my/api-collections/${default_collection_name}/api-collection-endpoints`
  const body = {
    operation_id
  }
  return await create(url, JSON.stringify(body))
}

export async function deleteMyAPICollectionEndpoint(operation_id: string): Promise<any> {
  const url = `/obp/${version}/my/api-collections/${default_collection_name}/api-collection-endpoints/${operation_id}`
  return await discard(url)
}

export async function getMyAPICollections(): Promise<any> {
  return await get(`/obp/${version}/my/api-collections`)
}

export async function getMyAPICollectionsEndpoint(collectionName: string): Promise<any> {
  return await get(`/obp/${version}/my/api-collections/${collectionName}/api-collection-endpoints`)
}
