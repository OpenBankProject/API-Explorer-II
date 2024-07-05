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
import superagent from 'superagent'

@Service()
@Controller('/opey')
export class OpeyController {
  private obpExplorerHome = process.env.VITE_OBP_API_EXPLORER_HOST
  private chatBotUrl = process.env.VITE_CHATBOT_URL
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

    
      const oauthConfig = session['clientConfig']
      this.printRequest(request)
      console.log(oauthConfig.json)
      const chatResponse = await axios.post(`${this.chatBotUrl}/chat`, {
          session_id: request.body.session_id,
          message: request.body.message,
          obp_api_host: request.body.obp_api_host,
          
        }
      );
      return response.json(chatResponse.data)
    } catch (error) {
      console.error("Error in chat endpoint: ", error)
      return response.status(500).json({ error: 'Internal Server Error'})
    }
  }

  printRequest(request: any) {
    console.log(`Request caught by opey controller: ${request.body.session_id}\n${request.body.message}\n${request.body.obp_api_host}`)
  }

  printResponse(response: any) {
    console.log(`Response caught by opey controller: ${response.data}`)
  }
}
