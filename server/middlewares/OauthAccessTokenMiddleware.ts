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
