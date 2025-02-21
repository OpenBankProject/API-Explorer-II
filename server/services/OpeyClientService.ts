import { Service } from 'typedi'
import { UserInput, StreamInput, OpeyConfig, AuthConfig } from '../schema/OpeySchema'
import { Readable } from "stream"
import fetch from 'node-fetch'

@Service()
export default class OpeyClientService {
    private authConfig: AuthConfig
    private opeyConfig: OpeyConfig
    constructor() {
        this.authConfig = {
            consentId: '',
            opeyJWT: ''
        }
        this.opeyConfig = {
            baseUri: process.env.VITE_CHATBOT_URL? process.env.VITE_CHATBOT_URL : 'http://localhost:5000',
            authConfig: this.authConfig,
            paths: {
                status: '/status',
                stream: '/stream',
                invoke: '/invoke',
                approve_tool: '/approve_tool/{thead_id}',
                feedback: '/feedback',
            }
        }
        
    }
    async getOpeyStatus(): Promise<any> {
        // Endpoint to check if Opey is running
        try {
            const url = `${this.opeyConfig.baseUri}${this.opeyConfig.paths.status}`
            const response = await fetch(url, {
                method: 'GET',
                headers: {}
            })
            if (response.status === 200) {
                const status = await response.json()
                return status
            } else {
                throw new Error(`Error getting status from Opey: ${response.status} ${response.statusText}`)
            }
            
            
            

        } catch (error) {
            throw new Error(`Error getting status from Opey: ${error}`)
        }
    }

    async stream(user_input: UserInput): Promise<any> {
        // Endpoint to post a message to Opey and stream the response tokens/messages
        try {

            const url = `${this.opeyConfig.baseUri}${this.opeyConfig.paths.stream}`
            // We need to set whether we want to stream tokens or not
            const stream_input = user_input as StreamInput
            stream_input.stream_tokens = true

            console.log(`Posting to Opey with streaming: ${JSON.stringify(stream_input)}\n URL: ${url}`) //DEBUG
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${this.opeyConfig.authConfig.opeyJWT}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(stream_input)
            })
            if (!response.body) {
                throw new Error("No response body")
            }

            console.log("Got response body: ", response.body) //DEBUG

            return response.body
        }
        catch (error) {
            throw new Error(`Error streaming from Opey: ${error}`)
        }
    }

    async invoke(user_input: UserInput): Promise<any> {
        // Endpoint to post a message to Opey and get a response without stream
        // I.e. a normal REST call
        const url = `${this.opeyConfig.baseUri}${this.opeyConfig.paths.invoke}`

        console.log(`Posting to Opey, STREAMING OFF: ${JSON.stringify(user_input)}\n URL: ${url}`) //DEBUG

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${this.opeyConfig.authConfig.opeyJWT}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(user_input)
            })
            if (response.status === 200) {
                const opey_response = await response.json()
                return opey_response
            } else {
                throw new Error(`Error invoking Opey: ${response.status} ${response.statusText}`)
            }
        } catch (error) {
            throw new Error(`Error invoking Opey: ${error}`)
        }
    }
}