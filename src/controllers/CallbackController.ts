import { Controller, Req, Res, Get, Redirect } from "routing-controllers";
import { Request, Response } from "express";
import { Service } from "typedi";
import OauthInjectedService from "../services/OauthInjectedService";

@Controller()
@Service()
export default class CallbackController {
  constructor(private oauthInjectedService: OauthInjectedService) {}
  @Get("/callback")
  @Redirect("/signed_in")
  callback(@Req() request: Request, @Res() response: Response): any {
    return;
  }
}
