/*
 * *
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

import { Controller, Session, Req, Res, Get } from 'routing-controllers'
import { Request, Response } from 'express'
import OBPClientService from '../services/OBPClientService'
import OauthInjectedService from '../services/OauthInjectedService'
import { Service } from 'typedi'
import superagent from 'superagent'

@Service()
@Controller('/user')
export class UserController {
  private obpExplorerHome = process.env.VITE_OBP_API_EXPLORER_HOST
  constructor(
    private obpClientService: OBPClientService,
    private oauthInjectedService: OauthInjectedService
  ) {}
  @Get('/logoff')
  async logout(
    @Session() session: any,
    @Req() request: Request,
    @Res() response: Response
  ): Response {
    this.oauthInjectedService.requestTokenKey = undefined
    this.oauthInjectedService.requestTokenSecret = undefined
    session['clientConfig'] = undefined
    response.redirect(this.obpExplorerHome)
    return response
  }

  @Get('/current')
  async current(
    @Session() session: any,
    @Req() request: Request,
    @Res() response: Response
  ): Response {
    const oauthConfig = session['clientConfig']
    const version = this.obpClientService.getOBPVersion()
    return response.json(
      await this.obpClientService.get(`/obp/${version}/users/current`, oauthConfig)
    )
  }
}
