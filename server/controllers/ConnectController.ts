import { Controller, Req, Res, Get, UseBefore } from 'routing-controllers'
import { Request, Response } from 'express'
import OauthRequestTokenMiddleware from '../middlewares/OauthRequestTokenMiddleware'
import { Service } from 'typedi'

@Service()
@Controller()
@UseBefore(OauthRequestTokenMiddleware)
export class ConnectController {
  @Get('/connect')
  connect(@Req() request: Request, @Res() response: Response): Response {
    return response
  }
}
