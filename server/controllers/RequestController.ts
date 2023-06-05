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
