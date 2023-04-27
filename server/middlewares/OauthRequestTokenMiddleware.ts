import { ExpressMiddlewareInterface } from 'routing-controllers'
import { Response, Request } from 'express'
import { Service } from 'typedi'
import OauthInjectedService from '../services/OauthInjectedService'

@Service()
export default class OauthRequestTokenMiddleware implements ExpressMiddlewareInterface {
  constructor(private oauthInjectedService: OauthInjectedService) {}

  use(request: Request, response: Response): any {
    const apiHost = process.env.VITE_API_HOST
    const oauthService = this.oauthInjectedService
    const consumer = oauthService.getConsumer()
    consumer.getOAuthRequestToken((error: any, oauthTokenKey: string, oauthTokenSecret: string) => {
      if (error) {
        console.error(error)
        response.status(500).send('Error getting OAuth request token: ' + error)
      } else {
        oauthService.requestTokenKey = oauthTokenKey
        oauthService.requestTokenSecret = oauthTokenSecret
        response.redirect(apiHost + '/oauth/authorize?oauth_token=' + oauthTokenKey)
      }
    })
  }
}
