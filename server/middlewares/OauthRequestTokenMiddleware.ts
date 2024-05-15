/*
 * Open Bank Project -  API Explorer II
 * Copyright (C) 2023-2024, TESOBE GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * Email: contact@tesobe.com
 * TESOBE GmbH
 * Osloerstrasse 16/17
 * Berlin 13359, Germany
 *
 *   This product includes software developed at
 *   TESOBE (http://www.tesobe.com/)
 *
 */

import { ExpressMiddlewareInterface } from 'routing-controllers'
import { Response, Request } from 'express'
import { Service } from 'typedi'
import OauthInjectedService from '../services/OauthInjectedService'

@Service()
export default class OauthRequestTokenMiddleware implements ExpressMiddlewareInterface {
  constructor(private oauthInjectedService: OauthInjectedService) {}

  use(request: Request, response: Response): any {
    const apiHost = process.env.VITE_OBP_API_HOST
    const oauthService = this.oauthInjectedService
    const consumer = oauthService.getConsumer()
    consumer.getOAuthRequestToken((error: any, oauthTokenKey: string, oauthTokenSecret: string) => {
      if (error) {
        const errorStr = JSON.stringify(error)
        console.error(errorStr)
        response.status(500).send('Error getting OAuth request token: ' + errorStr)
      } else {
        oauthService.requestTokenKey = oauthTokenKey
        oauthService.requestTokenSecret = oauthTokenSecret
        console.log('OauthRequestTokenMiddleware.ts consumer.getOAuthRequestToken says: Redirecting to /oauth/authorize?oauth_token=XXX')
        response.redirect(apiHost + '/oauth/authorize?oauth_token=' + oauthTokenKey)
      }
    })
  }
}
