import { Controller, Session, Req, Res, Post, Get } from 'routing-controllers'
import { Request, Response } from 'express'
import { Transform, pipeline, Readable } from "node:stream"
import { ReadableStream as WebReadableStream } from "stream/web"
import { Service } from 'typedi'
import OBPClientService from '../services/OBPClientService'
import OpeyClientService from '../services/OpeyClientService'

import { UserInput } from '../schema/OpeySchema'
import { APIApi, Configuration, ConsentApi, ConsumerConsentrequestsBody, InlineResponse20151 } from 'obp-api-typescript'

@Service()
@Controller('/opey')

export class OpeyController {
    constructor(
      public obpClientService: OBPClientService,
      public opeyClientService: OpeyClientService,
    ) {}

    @Get('/')
    async getStatus(
        @Res() response: Response
    ): Promise<Response | any> {

        try {
          const opeyStatus = await this.opeyClientService.getOpeyStatus()
          console.log("Opey status: ", opeyStatus)
          return response.status(200).json({status: 'Opey is running'});

        } catch (error) {
          console.error("Error in /opey endpoint: ", error);
          return response.status(500).json({ error: 'Internal Server Error' });
        }

        
    }

    @Post('/stream')

    async streamOpey(
        @Session() session: any,
        @Req() request: Request,
        @Res() response: Response,
    ) {

        // Read user input from request body
        let user_input: UserInput
        try {
          console.log("Request body: ", request.body)
          user_input = {
            "message": request.body.message,
            "thread_id": request.body.thread_id,
            "is_tool_call_approval": request.body.is_tool_call_approval
          }
        } catch (error) {
          console.error("Error in stream endpoint, could not parse into UserInput: ", error)
          return response.status(500).json({ error: 'Internal Server Error' })
        }
        

        // Define a function to transform the response from Opey (which is a text stream) into a TS-Native langchain stream
        const frontendTransformer = new TransformStream({
          transform(chunk, controller) {
            // Decode the chunk to a string
            const decodedChunk = new TextDecoder().decode(chunk)
          
            console.log("Sending chunk", decodedChunk)
            controller.enqueue(decodedChunk);
          },
          flush(controller) {
            console.log('[flush]');
            // Close ReadableStream when done
            controller.terminate();
          },
        });


        let stream: ReadableStream | null = null
        
        try {
          // Read web stream from OpeyClientService
          console.log("Calling OpeyClientService.stream")
          stream = await this.opeyClientService.stream(user_input)
          
        } catch (error) {
          console.error("Error reading stream: ", error)
          return response.status(500).json({ error: 'Internal Server Error' })
        }

        if (!stream) {
          console.error("Stream is not recieved or not readable")
          return response.status(500).json({ error: 'Internal Server Error' })
        }

        
        // Transform our stream if needed, right now this is just a passthrough
        const frontendStream: ReadableStream = stream.pipeThrough(frontendTransformer)
        
        // If we need to split the stream into two, we can use the tee method as below 

        // const streamTee = langchainStream.tee()
        // if (!streamTee) {
        //   console.error("Stream is not tee'd")
        //   return response.status(500).json({ error: 'Internal Server Error' })
        // }
        // const [stream1, stream2] = streamTee

        

        const nodeStream = Readable.fromWeb(frontendStream as WebReadableStream<any>)

        response.setHeader('x-vercel-ai-data-stream', 'v1')
        response.setHeader('Content-Type', 'text/event-stream');
        response.setHeader('Cache-Control', 'no-cache');
        response.setHeader('Connection', 'keep-alive');
        nodeStream.pipe(response);
      

        return new Promise<Response>((resolve, reject) => {
          nodeStream.on('end', () => {
            resolve(response);
          });
          nodeStream.on('error', (error) => {
            console.error('Stream error:', error);
            reject(error);
          });
          
        })

        
    }

    @Post('/invoke')
    async invokeOpey(
        @Session() session: any,
        @Req() request: Request,
        @Res() response: Response
    ): Promise<Response | any> {

        let user_input: UserInput
        try {
          user_input = {
            "message": request.body.message,
            "thread_id": request.body.thread_id,
            "is_tool_call_approval": request.body.is_tool_call_approval
          }
        } catch (error) {
          console.error("Error in invoke endpoint, could not parse into UserInput: ", error)
          return response.status(500).json({ error: 'Internal Server Error' })
        }

        try {
          const opey_response = await this.opeyClientService.invoke(user_input)

          //console.log("Opey response: ", opey_response)
          return response.status(200).json(opey_response)
        } catch (error) {
          console.error(error)
          return response.status(500).json({ error: 'Internal Server Error' })
        }
    }

    @Post('/consent/request')
    /**
     * Retrieves a consent request from OBP
     * 
     */
    async getConsentRequest(
        @Session() session: any,
        @Req() request: Request,
        @Res() response: Response,
    ): Promise<Response | any> {
      try {

        let obpToken: string

        obpToken = await this.obpClientService.getDirectLoginToken()
        console.log("Got token: ", obpToken)
        const authHeader = `DirectLogin token="${obpToken}"`
        console.log("Auth header: ", authHeader)

        const obpOAuthHeaders = await this.obpClientService.getOAuthHeader('/consents', 'POST')
        console.log("OBP OAuth Headers: ", obpOAuthHeaders)

        const obpConfig: Configuration = {
          apiKey: authHeader,
          basePath: process.env.VITE_OBP_API_HOST,
        }

        console.log("OBP Config: ", obpConfig)

        const consentAPI = new ConsentApi(obpConfig, process.env.VITE_OBP_API_HOST)
        

        // OBP sdk naming is a bit mad, can be rectified in the future
        const consentRequestResponse = await consentAPI.oBPv500CreateConsentRequest({
            accountAccess: [],
            everything: false,
            entitlements: [], 
            consumerId: '',
          } as unknown as ConsumerConsentrequestsBody,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        //console.log("Consent request response: ", consentRequestResponse)
        
        console.log({consentId: consentRequestResponse.data.consent_request_id})
        session['obpConsentRequestId'] = consentRequestResponse.data.consent_request_id

        return response.status(200).json(JSON.stringify({consentId: consentRequestResponse.data.consent_request_id}))
        //console.log(await response.body.json())
        

      } catch (error) {
        console.error("Error in consent/request endpoint: ", error);
        return response.status(500).json({ error: 'Internal Server Error' });
      }
    }

    @Post('/consent')
    /**
    * Retrieves a consent from OBP for the current user
    */
    async getConsent(
        @Session() session: any,
        @Req() request: Request,
        @Res() response: Response
    ): Promise<Response | any> {
        try {
        console.log("Getting consent from OBP")
        // Check if consent is already in session
        if (session['obpConsent']) {
            console.log("Consent found in session, returning cached consent ID")
            const obpConsent = session['obpConsent']
            // NOTE: Arguably we should not return the consent to the frontend as it could be hijacked,
            // we can keep everything in the backend and only return the JWT token
            return response.status(200).json({consent_id: obpConsent.consent_id});
        }

        const oauthConfig = session['clientConfig']
        const version = this.obpClientService.getOBPVersion()
        // Obbiously this should not be hard-coded, especially the consumer_id, but for now it is
        const consentRequestBody = {
            "everything": false,
            "views": [],
            "entitlements": [],
            "consumer_id": "33e0a1bd-9f1d-4128-911b-8936110f802f"
        }

        // Get current user, only proceed if user is logged in
        const currentUser = await this.obpClientService.get(`/obp/${version}/users/current`, oauthConfig)
        const currentResponseKeys = Object.keys(currentUser)
        if (!currentResponseKeys.includes('user_id')) {
            return response.status(400).json({ message: 'User not logged in, Authentication required' });
        }

        // url needs to be changed once we get the 'bankless' consent endpoint
        // this creates a consent for the current logged in user, and starts SCA flow i.e. sends SMS or email OTP to user
        const consent = await this.obpClientService.create(`/obp/${version}/banks/gh.29.uk/my/consents/IMPLICIT`, consentRequestBody, oauthConfig)
        console.log("Consent: ", consent)

        // store consent in session, return consent 200 OK
        session['obpConsent'] = consent
        return response.status(200).json({consent_id: consent.consent_id});
        } catch (error) {
        console.error("Error in consent endpoint: ", error);
        return response.status(500).json({ error: 'Internal Server Error '});
        }
    }


    @Post('/consent/answer-challenge')
    /**
     * Endpoint to answer the consent challenge with code i.e. SMS or email OTP for SCA
     * If successful, returns a Consent-JWT for use by Opey to access endpoints/ roles that the consenting user has
     * This completes (i.e. is the final step in) the consent flow
     */
    async answerConsentChallenge(
      @Session() session: any,
      @Req() request: Request,
      @Res() response: Response
    ): Promise<Response | any> {
      try {
        const oauthConfig = session['clientConfig']
        const version = this.obpClientService.getOBPVersion()
  
        const obpConsent = session['obpConsent']
        if (!obpConsent) {
          return response.status(400).json({ message: 'Consent not found in session' });
        } else if (obpConsent.status === 'ACCEPTED') {
          return response.status(400).json({ message: 'Consent already accepted' });
        }
        const answerBody = request.body
  
        const consentJWT = await this.obpClientService.create(`/obp/${version}/banks/gh.29.uk/consents/${obpConsent.consent_id}/challenge`, answerBody, oauthConfig)
        console.log("Consent JWT: ", consentJWT)
        // store consent JWT in session, return consent JWT 200 OK
        session['obpConsentJWT'] = consentJWT
        return response.status(200).json(true);
  
      } catch (error) { 
        console.error("Error in consent/answer-challenge endpoint: ", error);
        return response.status(500).json({ error: 'Internal Server Error' });
      }
      
    }

    
}