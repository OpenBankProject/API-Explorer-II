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

import { Controller, Session, Req, Res, Post } from 'routing-controllers'
import { Request, Response } from 'express'
import OBPClientService from '../services/OBPClientService'
import { Service } from 'typedi'
import * as fs from 'fs'
import * as jwt from 'jsonwebtoken'

@Service()
@Controller('/opey')
/**
 * Controller class for handling Opey related operations.
 * This used to hold the /chat endpoint, but that endpoint has become obsolete since using websockets. 
 * Now it serves to get tokens to authenticate the user at websocket handshake.
 * This is called from the frontend when ChatWidget.vue is mounted. (It is done at the backend to keep the private key secret) 
 */
export class OpeyController {
  constructor(
    private obpClientService: OBPClientService,
  ) {}

  @Post('/token')
  /**
   * Retrieves a JWT token for the current user.
   * This only works if the user is logged in. (i.e. the user has a valid session)
   * Request for the token is made to POST /api/opey/token
   * 
   * @param session - The session object.
   * @param request - The request object.
   * @param response - The response object.
   * @returns The response containing the JWT token or an error message.
   * 
   */
  async getToken(
    @Session() session: any,
    @Req() request: Request,
    @Res() response: Response
  ): Response {
    try {
      // Get current user
      const oauthConfig = session['clientConfig']
      const version = this.obpClientService.getOBPVersion()
      const currentUser = await this.obpClientService.get(`/obp/${version}/users/current`, oauthConfig)
      const currentResponseKeys = Object.keys(currentUser)
      // If current user is logged in, issue JWT signed with private key
      if (currentResponseKeys.includes('user_id')) {
        // sign
        const jwtToken = this.generateJWT(currentUser.user_id, currentUser.username, session)
        return response.status(200).json({ token: jwtToken });
      } else {
        return response.status(400).json({ message: 'User not logged in, Authentication required' });
      }
    } catch (error) {
      console.error("Error in token endpoint: ", error);
      return response.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Generates a JSON Web Token (JWT) for the given Open Bank Project (OBP) user.
   * @param obpUserId - The ID of the OBP user.
   * @param obpUsername - The username of the OBP user.
   * @param session - The session object.
   * @returns The generated JWT.
   */
  generateJWT(obpUserId: string, obpUsername: string, session: typeof Session): string {

      // Retrieve secret key
      let privateKey: string;
      if (session['opeyToken']) {
        console.log("Returning cached token");
        return session['opeyToken'];
      }

      // Read private key from file
      // Private key must be in the server/cert directory, this is pretty janky at the moment and should be improved
      // Opey must also have a copy of the public key to verify the JWT
      try {
        privateKey = fs.readFileSync('./server/cert/private_key.pem', {encoding: 'utf-8'});
      } catch (error) {
        console.error("Error reading private key: ", error);
        return '';
      }
      
      // Allows some user data to be passed in the JWT (this could be the obp consent in the future)
      const payload = {
        user_id: obpUserId,
        username: obpUsername,
        exp: Math.floor(Date.now() / 1000) + (60 * 60),
      };
  
      const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
      session['opeyToken'] = token;

      return token
    }
}
