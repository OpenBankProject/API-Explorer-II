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

import { Controller, Session, Req, Res, Get, Delete, Post, Put } from 'routing-controllers'
import { Request, Response } from 'express'
import OBPClientService from '../services/OBPClientService'
import { Service } from 'typedi'

@Service()
@Controller()
export class OBPController {
  constructor(private obpClientService: OBPClientService) {}
  @Get('/get')
  async get(@Session() session: any, @Req() request: Request, @Res() response: Response): Response {
    const path = request.query.path
    const oauthConfig = session['clientConfig']
    return response.json(await this.obpClientService.get(path, oauthConfig))
  }

  @Post('/create')
  async create(
    @Session() session: any,
    @Req() request: Request,
    @Res() response: Response
  ): Response {
    const path = request.query.path
    const data = request.body
    const oauthConfig = session['clientConfig']
    return response.json(await this.obpClientService.create(path, data, oauthConfig))
  }

  @Put('/update')
  async update(
    @Session() session: any,
    @Req() request: Request,
    @Res() response: Response
  ): Response {
    const path = request.query.path
    const data = request.body
    const oauthConfig = session['clientConfig']
    return response.json(await this.obpClientService.update(path, data, oauthConfig))
  }

  @Delete('/delete')
  async delete(
    @Session() session: any,
    @Req() request: Request,
    @Res() response: Response
  ): Response {
    const path = request.query.path
    const oauthConfig = session['clientConfig']
    return response.json(await this.obpClientService.discard(path, oauthConfig))
  }
}
