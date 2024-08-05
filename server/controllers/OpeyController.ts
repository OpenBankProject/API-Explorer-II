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
import axios from 'axios';
import OBPClientService from '../services/OBPClientService'
import OauthInjectedService from '../services/OauthInjectedService'
import { Service } from 'typedi'
import * as fs from 'fs'
import * as jwt from 'jsonwebtoken'
import WebSocket from 'ws'
import superagent from 'superagent'

@Service()
@Controller('/opey')
export class OpeyController {
  private obpExplorerHome = process.env.VITE_OBP_API_EXPLORER_HOST
  private chatBotUrl = process.env.VITE_CHATBOT_URL
  private opeySecret = process.env.VITE_OPEY_SECRET
  constructor(
    private obpClientService: OBPClientService,
    private oauthInjectedService: OauthInjectedService
  ) {}

  @Post('/chat')
  async chat(
    @Session() session: any,
    @Req() request: Request,
    @Res() response: Response
  ): Response {
    try {
      const oauthService = this.oauthInjectedService
      const consumer = oauthService.getConsumer()
      // Get current user
      const oauthConfig = session['clientConfig']
      const version = this.obpClientService.getOBPVersion()
      const currentUser = await this.obpClientService.get(`/obp/${version}/users/current`, oauthConfig)
      const currentResponseKeys = Object.keys(currentUser)
      // If current user is logged in, issue JWT signed with private key
      if (currentResponseKeys.includes('user_id')) {
        // sign
        const jwtToken = this.generateJWT(currentUser.user_id, currentUser.username, session)
        
        // Establish websocket connection
        const ws = new WebSocket(`${this.chatBotUrl.replace('http', 'ws')}/chat`, {
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        });

        // Send request with jwt token
        ws.on('open', () => {
          // Send request data
          ws.send(JSON.stringify({
            session_id: request.body.session_id,
            message: request.body.message,
            obp_api_host: request.body.obp_api_host,
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          // Handle incoming message
          console.log("Message delta: ", message);
          response.write(JSON.stringify(message));
        });

        ws.on('close', () => {
          response.end();
        });

        ws.on('error', (error) => {
          console.error("WebSocket error: ", error);
          response.status(500).json({ error: 'WebSocket Error' });
        });

        request.on('close', () => {
          ws.close();
        });
        
        return response;
      } else {
        return response.status(400).json({ message: 'User not logged in, Authentication required' });
      }
    } catch (error) {
      console.error("Error in chat endpoint: ", error);
      return response.status(500).json({ error: 'Internal Server Error' });
    }
  }

  @Post('/token')
  async getToken(
    @Session() session: any,
    @Req() request: Request,
    @Res() response: Response
  ): Response {
    try {
      const oauthService = this.oauthInjectedService
      const consumer = oauthService.getConsumer()
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

  generateJWT(obpUserId: string, obpUsername: string, session: typeof Session): string {
      // Retrieve secret key
      let privateKey: string;
      if (session['opeyToken']) {
        console.log("Returning cached token");
        return session['opeyToken'];
      }

      try {
        privateKey = fs.readFileSync('./server/cert/private_key.pem', {encoding: 'utf-8'});
      } catch (error) {
        console.error("Error reading private key: ", error);
        return '';
      }
      
  
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
