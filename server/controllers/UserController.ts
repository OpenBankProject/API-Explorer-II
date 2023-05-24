import { Controller, Req, Res, Get } from 'routing-controllers'
import { Request, Response } from 'express'
import OBPClientService from '../services/OBPClientService'
import OauthInjectedService from '../services/OauthInjectedService'
import { Service } from 'typedi'
import superagent from 'superagent'

@Service()
@Controller('/user')
export class UserController {
  private obpExplorerHome = process.env.VITE_OBP_EXPLORER_HOST
  constructor(
    private obpClientService: OBPClientService,
    private oauthInjectedService: OauthInjectedService
  ) {}
  @Get('/logoff')
  async logout(@Req() request: Request, @Res() response: Response): Response {
    this.oauthInjectedService.requestTokenKey = undefined
    this.oauthInjectedService.requestTokenSecret = undefined
    this.obpClientService.setAccessToken(undefined, undefined)
    response.redirect(this.obpExplorerHome)
    return response
  }

  @Get('/current')
  async current(@Req() request: Request, @Res() response: Response): Response {
    const version = this.obpClientService.getOBPVersion()
    return response.json(await this.obpClientService.get(`/obp/${version}/users/current`))
  }
}
