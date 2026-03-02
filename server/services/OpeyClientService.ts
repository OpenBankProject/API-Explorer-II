import { Service } from 'typedi'
import { UserInput, StreamInput, OpeyConfig, ConsentRequestResponse } from '../schema/OpeySchema.js'
import OBPClientService from './OBPClientService.js'

@Service()
export default class OpeyClientService {
    private opeyConfig: OpeyConfig
    public obpClientService: OBPClientService
    constructor() {
        this.opeyConfig = {
            baseUri: process.env.VITE_CHATBOT_URL? process.env.VITE_CHATBOT_URL : 'http://localhost:5000',
            paths: {
                status: '/status',
                stream: '/stream',
                invoke: '/invoke',
                approve_tool: '/approve_tool/{thead_id}',
                feedback: '/feedback',
            }
        }
        
    }
    /**
     * Either sets the Opey configuration or returns the current configuration.
     * If a partial config is provided, it will be merged with the current config,
     * only overwriting explicitly defined fields.
     * 
     * @param partialConfig - Optional partial configuration to merge with default config
     * @returns Complete OpeyConfig with merged values
     */
    async getOpeyConfig(partialConfig?: Partial<OpeyConfig>): Promise<OpeyConfig> {
        if (!partialConfig) {
            return this.opeyConfig;
        }
        
        // Create a deep copy of the current config to avoid mutation
        const mergedConfig = JSON.parse(JSON.stringify(this.opeyConfig));
        
        // Merge the base URI if provided
        if (partialConfig.baseUri) {
            mergedConfig.baseUri = partialConfig.baseUri;
        }
        
        // Merge paths if provided (only overwrite defined paths)
        if (partialConfig.paths) {
            mergedConfig.paths = {
                ...mergedConfig.paths,
                ...partialConfig.paths
            };
        }
        
        // Merge authConfig if provided
        if (partialConfig.authConfig) {
            mergedConfig.authConfig = {
                ...mergedConfig.authConfig,
                ...partialConfig.authConfig
            };
            
            // If obpConsent is provided, merge it too
            if (partialConfig.authConfig.obpConsent && mergedConfig.authConfig.obpConsent) {
                mergedConfig.authConfig.obpConsent = {
                    ...mergedConfig.authConfig.obpConsent,
                    ...partialConfig.authConfig.obpConsent
                };
            }
        }
        
        return mergedConfig;
    }

    async getOpeyStatus(opeyConfig?: Partial<OpeyConfig>): Promise<any> {
        // Endpoint to check if Opey is running
        const config = await this.getOpeyConfig(opeyConfig)
        const auth = await this.checkAuthConfig(config)
        if (!auth.valid) {
            console.warn(`AuthConfig is not set: ${auth.reason}\n Other endpoints require authentication`)
        }

        try {
            const url = `${config.baseUri}${config.paths.status}`
            const response = await fetch(url, {
                method: 'GET',
                headers: {}
            })
            if (response.status === 200) {
                const status = await response.json()
                return status
            } else {
                throw new Error(`Could not connect: ${response.status} ${response.statusText}`)
            }
            
            
            

        } catch (error) {
            throw new Error(`Error getting status from Opey: ${error}`)
        }
    }


    /**
     * Streams a response from Opey by posting a user input message.
     * 
     * This method performs the following operations:
     * 1. Retrieves the Opey configuration
     * 2. Validates authentication credentials
     * 3. Makes a POST request to the Opey stream endpoint
     * 4. Processes and returns the API response as a ReadableStream
     * 
     * @param user_input - The user's input message and settings to send to Opey
     * @param opeyConfig - Configuration object for Opey connection
     *                     Contains details like baseUri, paths, and authentication settings
     * 
     * @returns A Promise resolving to a ReadableStream containing the streamed response
     * @throws Error if authentication is not valid
     * @throws Error if there's no response body
     * @throws Error if there's any issue streaming from Opey
     */
    async stream(user_input: UserInput, opeyConfig?: Partial<OpeyConfig>): Promise<ReadableStream> {
        console.log("OpeyConfig: ", opeyConfig) //DEBUG
        
        const config = await this.getOpeyConfig(opeyConfig)

        console.log("OpeyConfig after getting: ", config) //DEBUG

        // Check if we have the consent for Opey
        const auth = await this.checkAuthConfig(config)
        if (!auth.valid) {
            throw new Error(`AuthConfig not valid: ${auth.reason}`)
        }

        // Get auth headers
        const authHeaders = await this.getConsentAuthHeaders(config)

        
        try {

            const url = `${config.baseUri}${config.paths.stream}`
            // We need to set whether we want to stream tokens or not
            const stream_input = user_input as StreamInput
            stream_input.stream_tokens = true

            console.log(`Posting to Opey with streaming: ${JSON.stringify(stream_input)}\n URL: ${url}`) //DEBUG
            
            const response = await fetch(url, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(stream_input)
            })
            if (!response.body) {
                throw new Error("No response body")
            }

            console.log("Got response body: ", response.body) //DEBUG

            return response.body as unknown as ReadableStream<any>
        }
        catch (error) {
            throw new Error(`Error streaming from Opey: ${error}`)
        }
    }

    /**
     * Invokes the Opey API with the provided user input and optional configuration.
     * 
     * This method performs the following operations:
     * 1. Retrieves the Opey configuration
     * 2. Validates authentication credentials
     * 3. Makes a POST request to the Opey invoke endpoint
     * 4. Processes and returns the API response
     * 
     * @param user_input - The input data to be sent to the Opey API
     * @param opeyConfig - Optional configuration overrides for this specific request
     * @returns A Promise resolving to the response from the Opey API
     * @throws Error if authentication is invalid or if the API request fails
     */
    async invoke(user_input: UserInput, opeyConfig?: Partial<OpeyConfig>): Promise<any> {
        
        const config = await this.getOpeyConfig(opeyConfig)

        // Check if we have the consent for Opey
        const auth = await this.checkAuthConfig(config)
        if (!auth.valid) {
            throw new Error(`AuthConfig not valid: ${auth.reason}`)
        }

        // Get auth headers
        const authHeaders = await this.getConsentAuthHeaders(config)
        
        const url = `${config.baseUri}${config.paths.invoke}`

        console.log(`Posting to Opey, STREAMING OFF: ${JSON.stringify(user_input)}\n URL: ${url}`) //DEBUG

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: authHeaders,
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

    // async respondToToolApproval(tool_approval_response): Promise<ReadableStream> {

    // }


    /**
     * Checks if the authentication configuration in the OpeyConfig is valid.
     * 
     * This method validates that:
     * - authConfig exists and contains obpConsent
     * - the OBP consent object has a status of 'ACCEPTED'
     * 
     * @param opeyConfig - The configuration object to validate
     * @returns An object with validation result:
     *          - valid: boolean indicating if the auth config is valid
     *          - reason: string explaining the validation result
     */
    async checkAuthConfig(opeyConfig: OpeyConfig): Promise<{ valid: boolean; reason: string }> {
        
        console.log("Checking auth config: ", opeyConfig) //DEBUG

        if (!opeyConfig.authConfig || !opeyConfig.authConfig.obpConsent) {
            return { valid: false, reason: 'No authConfig set in opeyConfig, authentication required' }
        } else if (!opeyConfig.authConfig.obpConsent) {
            return { valid: false, reason: 'Opey consent missing in opeyConfig.authConfig' }
        }

        if (!(opeyConfig.authConfig.obpConsent.status === 'ACCEPTED')) {
            return { valid: false, reason: 'Opey consent status is not ACCEPTED' }
        }

        return { valid: true, reason: 'AuthConfig is valid' }
    }

    async getConsentAuthHeaders(opeyConfig: OpeyConfig): Promise<{ [key: string]: string } | undefined> {
        
        if (!opeyConfig.authConfig || !opeyConfig.authConfig.obpConsent) {
            throw new Error('AuthConfig not found or obpConsent missing')
        }
        return {
            'Consent-JWT': opeyConfig.authConfig.obpConsent.jwt,
            'Content-Type': 'application/json'
        }
    }
}