import { ExpressMiddlewareInterface } from 'routing-controllers'
import { Response, Request } from 'express'
import { Service } from 'typedi'
import OauthInjectedService from '../services/OauthInjectedService'

@Service()
export default class OauthAccessTokenMiddleware implements ExpressMiddlewareInterface {
  constructor(private oauthInjectedService: OauthInjectedService) {}

  use(request: Request, response: Response): any {
    const oauthService = this.oauthInjectedService
    const consumer = oauthService.getConsumer()
    const oauthVerifier = request.query.oauth_verifier
    consumer.getOAuthAccessToken(
      oauthService.requestTokenKey,
      oauthService.requestTokenSecret,
      oauthVerifier,
      (error: any, oauthTokenKey: string, oauthTokenSecret: string) => {
        if (error) {
          console.log(error)
          response.status(500).send('Error getting OAuth access token: ' + error)
        } else {
          response.redirect(
            process.env.VITE_HOST + '?accessKey=' + oauthTokenKey + '&secret=' + oauthTokenSecret
          )
        }
      }
    )
  }
}
