import { Controller, Req, Res, Get, UseBefore } from 'routing-controllers'
import { Request, Response } from 'express'
import { Service } from 'typedi'
import OauthAccessTokenMiddleware from '../middlewares/OauthAccessTokenMiddleware'

@Service()
@Controller()
@UseBefore(OauthAccessTokenMiddleware)
export default class CallbackController {
  @Get('/callback')
  callback(@Req() request: Request, @Res() response: Response): Response {
    return response
  }
}
