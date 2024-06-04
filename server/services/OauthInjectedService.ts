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
