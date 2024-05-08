import { ExpressMiddlewareInterface } from 'routing-controllers'
import { Response, Request } from 'express'
import { Service } from 'typedi'
import OauthInjectedService from '../services/OauthInjectedService'
import OBPClientService from '../services/OBPClientService'

@Service()
export default class OauthAccessTokenMiddleware implements ExpressMiddlewareInterface {
  constructor(
    private obpClientService: OBPClientService,
    private oauthInjectedService: OauthInjectedService
  ) {}

  use(request: Request, response: Response): any {
    const oauthService = this.oauthInjectedService
    const consumer = oauthService.getConsumer()
    const oauthVerifier = request.query.oauth_verifier
    const session = request.session
    console.log('OauthAccessTokenMiddleware.ts use says: Before consumer.getOAuthAccessToken')
    consumer.getOAuthAccessToken(
      oauthService.requestTokenKey,
      oauthService.requestTokenSecret,
      oauthVerifier,
      (error: any, oauthTokenKey: string, oauthTokenSecret: string) => {
        if (error) {
          const errorStr = JSON.stringify(error)
          console.error(errorStr)
          response.status(500).send('Error getting OAuth access token: ' + errorStr)
        } else {
          const clientConfig = JSON.parse(
            JSON.stringify(this.obpClientService.getOBPClientConfig())
          ) //Deep copy
          clientConfig['oauthConfig']['accessToken'] = {
            key: oauthTokenKey,
            secret: oauthTokenSecret
          }
          session['clientConfig'] = clientConfig
          console.log('OauthAccessTokenMiddleware.ts use says: Seems OK, redirecting..')
          response.redirect(`${process.env.VITE_OBP_API_EXPLORER_HOST}`)
        }
      }
    )
  }
}
