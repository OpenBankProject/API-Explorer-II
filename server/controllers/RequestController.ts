import { Controller, Req, Res, Get, Delete, Post, Put } from 'routing-controllers'
import { Request, Response } from 'express'
import OBPClientService from '../services/OBPClientService'
import { Service } from 'typedi'

@Service()
@Controller()
export class OBPController {
  constructor(private obpClientService: OBPClientService) {}
  @Get('/get')
  async get(@Req() request: Request, @Res() response: Response): Response {
    const path = request.query.path
    return response.json(await this.obpClientService.get(path))
  }

  @Post('/create')
  async create(@Req() request: Request, @Res() response: Response): Response {
    const path = request.query.path
    const data = request.body
    return response.json(await this.obpClientService.create(path, data))
  }

  @Put('/update')
  async update(@Req() request: Request, @Res() response: Response): Response {
    const path = request.query.path
    const data = request.body
    return response.json(await this.obpClientService.update(path, data))
  }

  @Delete('/delete')
  async delete(@Req() request: Request, @Res() response: Response): Response {
    const path = request.query.path
    return response.json(await this.obpClientService.discard(path))
  }
}
