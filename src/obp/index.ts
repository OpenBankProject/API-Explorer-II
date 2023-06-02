import superagent from 'superagent'
import { Version } from 'obp-typescript'

export async function get(path: string): Promise<any> {
  try {
    return (await superagent.get(`/api/get?path=${path}`)).body
  } catch (error) {
    console.log(error)
    return error
  }
}

export async function create(path: string, body: any): Promise<any> {
  try {
    return (await superagent.post(`/api/create?path=${path}`).send(JSON.parse(body))).body
  } catch (error) {
    console.log(error)
    return error
  }
}

export async function update(path: string, body: any): Promise<any> {
  try {
    return (await superagent.put(`/api/update?path=${path}`).send(JSON.parse(body))).body
  } catch (error) {
    console.log(error)
    return error
  }
}

export async function discard(path: string): Promise<any> {
  try {
    return (await superagent.delete(`/api/delete?path=${path}`)).body
  } catch (error) {
    console.log(error)
    return error
  }
}

export async function getCurrentUser(): Promise<any> {
  try {
    return (await superagent.get(`/api/user/current`)).body
  } catch (error) {
    console.log(error)
  }
}

export async function createEntitlement(bankId: string, roleName: string): Promise<any> {
  const userId = (await getCurrentUser()).user_id
  const version = import.meta.env.VITE_OBP_API_VERSION
  const url = `/obp/${version}/users/${userId}/entitlements`
  const body = {
    role_name: roleName,
    bank_id: bankId
  }
  return await create(url, JSON.stringify(body))
}
