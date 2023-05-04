import { Service } from 'typedi'
import oauth from 'oauth'

@Service()
export default class OauthInjectedService {
  public requestTokenKey: string
  public requestTokenSecret: string
  private oauth: oauth.OAuth
  constructor() {
    const apiHost = process.env.VITE_OBP_API_HOST
    const consumerKey = process.env.VITE_OBP_CONSUMER_KEY
    const consumerSecret = process.env.VITE_OBP_CONSUMER_SECRET
    const redirectUrl = process.env.VITE_OBP_REDIRECT_URL
    this.oauth = new oauth.OAuth(
      apiHost + '/oauth/initiate',
      apiHost + '/oauth/token',
      consumerKey,
      consumerSecret,
      '1.0',
      redirectUrl,
      'HMAC-SHA1'
    )
  }

  getConsumer(): oauth.OAuth {
    return this.oauth
  }
}
