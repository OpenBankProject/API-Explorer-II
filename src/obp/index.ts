import superagent from 'superagent'

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
