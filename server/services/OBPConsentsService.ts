import { Service, Container } from 'typedi'
import {
  Configuration,
  ConsentApi,
  ConsentsIMPLICITBody1,
  ConsumerConsentrequestsBody,
  InlineResponse20151,
  InlineResponse2017,
  ErrorUserNotLoggedIn
} from 'obp-api-typescript'
import OBPClientService from './OBPClientService.js'
import { AxiosResponse } from 'axios'
import axios from 'axios'
import { Session } from 'express-session'
import { DEFAULT_OBP_API_VERSION } from '../../src/shared-constants.js'

@Service()
/**
 * Service for managing Open Banking Project (OBP) consents functionality.
 * This class handles the creation of consent clients, consent creation, and retrieval
 * based on user sessions.
 *
 * @class OBPConsentsService
 * @description Provides methods to interact with OBP Consent APIs, allowing the application
 * to create and manage consents that permit access to user accounts via API Explorer II.
 *
 * Key functionalities:
 * - Creating consent API clients based on user sessions
 * - Creating implicit consents for access delegation i.e. for opey
 * - Retrieving existing consents by ID
 * - Finding consents associated with specific consumers (e.g., Opey)
 *
 * @requires OBPClientService
 * @requires Configuration
 * @requires ConsentApi
 * @requires InlineResponse2017
 * @requires ConsentsIMPLICITBody1
 * @requires axios
 */
export default class OBPConsentsService {
  private consentApiConfig: Configuration
  public obpClientService: OBPClientService

  constructor() {
    // Explicitly get OBPClientService from the container to avoid injection issues
    this.obpClientService = Container.get(OBPClientService)
  }
  /**
   * Function to create a OBP Consents API client
   * at differnt times in the consent flow we will either need to be acting as the logged in user, or the API Explorer II consumer
   *
   * @param path
   * @param method
   * @param as_client
   * @returns
   */
  async createUserConsentsClient(
    session: any,
    path: string,
    method: string
  ): Promise<ConsentApi | undefined> {
    // This function creates a Consents API client as the logged in user, using their OAuth2 Bearer token

    // Check if the user is logged in
    const clientConfig = session['clientConfig']
    if (!clientConfig || !clientConfig.oauth2?.accessToken) {
      throw new Error('User is not logged in')
    }

    try {
      // Get the OAuth2 Bearer token for the logged in user
      const bearerToken = `Bearer ${clientConfig.oauth2.accessToken}`

      // Set config for the Consents API client from the new typescript SDK
      this.consentApiConfig = new Configuration({
        basePath: this.obpClientService.getOBPClientConfig().baseUri,
        apiKey: bearerToken
      })

      // Create the Consents API client
      return new ConsentApi(this.consentApiConfig)
    } catch (error) {
      console.error(error)
      throw new Error(`Could not create Consents API client for logged in user, ${error}`)
    }
  }

  async createConsent(session: Session): Promise<InlineResponse2017 | undefined> {
    // Create a consent as the logged in user, using Opey's consumerID
    // I.e. give permission to Opey to do anything on behalf of the logged in user

    // Get the Consents API client from the OBP SDK
    // Always use v5.1.0 for application infrastructure - stable and debuggable
    const client = await this.createUserConsentsClient(
      session,
      `/obp/${DEFAULT_OBP_API_VERSION}/my/consents/IMPLICIT`,
      'POST'
    )
    if (!client) {
      throw new Error('Could not create Consents API client')
    }

    // get consumer ID for Opey
    const opeyConsumerID = process.env.VITE_OPEY_CONSUMER_ID
    if (!opeyConsumerID) {
      throw new Error('Opey Consumer ID is missing, please set VITE_OPEY_CONSUMER_ID')
    }

    // Format date for OBP, this is a mess
    const today = new Date().toISOString().split('.')[0] + 'Z' // get rid of milliseconds as OBP doesn't like them;

    const body: ConsentsIMPLICITBody1 = {
      everything: true,
      entitlements: [],
      consumer_id: opeyConsumerID,
      views: [],
      valid_from: today,
      time_to_live: 3600
    }

    try {
      const consentResponse = await client.oBPv510CreateConsentImplicit(body, {
        headers: { 'Content-Type': 'application/json' }
      })

      // Save the consent in the session
      session['opeyConfig'] = {
        authConfig: {
          obpConsent: consentResponse.data
        }
      }

      return consentResponse.data
    } catch (error: any) {
      console.log('error', error)
      if (error.response && error.response.data) {
        const errorData = error.response.data
        if (errorData.message) {
          throw new Error(`OBP Error: ${JSON.stringify(errorData)}`)
        }
      }
      throw new Error(`Could not create consent, ${error}`)
    }
  }

  /**
   * Retrieves a consent by consent ID for the current user.
   *
   * This method fetches a specific consent using its ID and updates the session
   * with the retrieved consent data under the opeyConfig property.
   *
   * @param session - The user's session object, which must contain clientConfig with valid OAuth tokens
   * @param consentId - The unique identifier of the consent to retrieve
   * @returns Promise resolving to the consent data retrieved from OBP API
   * @throws Error if the user is not logged in (no valid clientConfig or accessToken)
   * @throws Error if the request to get the consent fails
   */
  async getConsentByConsentId(session: Session, consentId: string): Promise<any> {
    const clientConfig = session['clientConfig']
    if (!clientConfig || !clientConfig.oauth2?.accessToken) {
      throw new Error('User is not logged in')
    }

    try {
      // Always use v5.1.0 for application infrastructure - stable and debuggable
      const response = await this._sendOBPRequest(
        `/obp/${DEFAULT_OBP_API_VERSION}/user/current/consents/${consentId}`,
        'GET',
        clientConfig
      )

      session['opeyConfig'] = {
        authConfig: {
          obpConsent: response.data
        }
      }

      return response.data
    } catch (error) {
      console.error(error)
      throw new Error(`Consent with ID ${consentId} not retrieved: ${error}`)
    }
  }

  async checkConsentExpired(consent: any): Promise<boolean> {
    //DEBUG
    // Check if the consent is expired
    // Decode the JWT and check the exp field

    const exp = consent.jwt_payload.exp
    const now = Math.floor(Date.now() / 1000)
    return exp < now
  }

  async getExistingOpeyConsentId(session: Session): Promise<any> {
    // Get Consents for the current user, check if any of them are for Opey
    // If so, return the consent

    // I.e. this is done by iterating and finding the consent with the correct consumer ID

    // Get the Consents API client from the OBP SDK
    // The OBP SDK is messed up here, so we'll need to use Fetch until the SWAGGER WILL ACTUALLY WORK
    // const client = await this.createUserConsentsClient(session, `/obp/${process.env.VITE_OBP_API_VERSION ?? DEFAULT_OBP_API_VERSION}/my/consents/IMPLICIT`, 'POST')
    // if (!client) {
    //     throw new Error('Could not create Consents API client')
    // }

    // Function to send an OBP request using the logged in user's OAuth2 Bearer token

    const clientConfig = session['clientConfig']
    if (!clientConfig || !clientConfig.oauth2?.accessToken) {
      throw new Error('User is not logged in')
    }

    // We need to change this back to consent infos once OBP shows 'EXPIRED' in the status
    // Right now we have to check the JWT ourselves
    // Always use v5.1.0 for application infrastructure - stable and debuggable
    const consentInfosPath = `/obp/${DEFAULT_OBP_API_VERSION}/my/consents`
    //const consentInfosPath = `/obp/${DEFAULT_OBP_API_VERSION}/my/consent-infos`

    let opeyConsentId: string | null = null
    try {
      const response = await this._sendOBPRequest(consentInfosPath, 'GET', clientConfig)
      const consents = response.data.consents

      const opeyConsumerID = process.env.VITE_OPEY_CONSUMER_ID
      if (!opeyConsumerID) {
        throw new Error('Opey Consumer ID is missing, please set VITE_OPEY_CONSUMER_ID')
      }

      for (const consent of consents) {
        console.log(
          `consent_consumer_id: ${consent.consumer_id}, opey_consumer_id: ${opeyConsumerID}\n consent_status: ${consent.status}`
        ) //DEBUG
        if (consent.consumer_id === opeyConsumerID && consent.status === 'ACCEPTED') {
          // Check if the consent is expired
          const isExpired = await this.checkConsentExpired(consent)
          if (isExpired) {
            console.log('getExistingConsent: Consent is expired')
            continue
          }
          opeyConsentId = consent.consent_id
          break
        }
      }

      if (!opeyConsentId) {
        console.log('getExistingConsent: No consent found for Opey for current user')
        return null
      } else {
        return opeyConsentId
      }
    } catch (error) {
      console.error(error)
      throw new Error(`Could not get existing consent info, ${error}`)
    }
  }

  async _sendOBPRequest(path: string, method: string, clientConfig: any) {
    // Get OAuth2 Bearer token from clientConfig
    if (!clientConfig.oauth2?.accessToken) {
      throw new Error('OAuth2 access token not found in clientConfig')
    }

    const bearerToken = `Bearer ${clientConfig.oauth2.accessToken}`
    const config = {
      headers: {
        Authorization: bearerToken,
        'Content-Type': 'application/json'
      }
    }
    return axios.get(`${clientConfig.baseUri}${path}`, config)
  }

  // Probably not needed, but will keep for later

  // async createConsentRequest(): Promise<InlineResponse20151 | undefined> {
  //     // this should be done as API Explorer II, so set client on instance for that
  //     const client = await this.createConsentClient('API_Explorer')
  //     if (!client) {
  //         throw new Error('Could not create Consents API client')
  //     }
  //     // Create a consent request
  //     // Parameters in body to be changed later to fit our needs, or match parameters given to this function
  //     try {
  //         const consentRequestResponse = await client.oBPv500CreateConsentRequest(
  //             {
  //                 accountAccess: [],
  //                 everything: false,
  //                 entitlements: [],
  //                 consumerId: '',
  //             } as unknown as ConsumerConsentrequestsBody,
  //             {
  //                 headers: {
  //                     'Content-Type': 'application/json',
  //                 },
  //             }
  //         )

  //         return consentRequestResponse.data
  //     } catch (error) {
  //         console.error(error)
  //         throw new Error(`Could not create consent request, ${error}`)
  //     }

  // }
}
