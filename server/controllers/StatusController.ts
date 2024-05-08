import { Controller, Session, Req, Res, Get } from 'routing-controllers'
import { Request, Response } from 'express'
import OBPClientService from '../services/OBPClientService'
import OauthInjectedService from '../services/OauthInjectedService'
import { Service } from 'typedi'
import { OAuthConfig } from 'obp-typescript'

@Service()
@Controller('/status')
export class StatusController {
  private obpExplorerHome = process.env.VITE_OBP_API_EXPLORER_HOST
  private connectors = [
    'kafka_vSept2018',
    'akka_vDec2018',
    'rest_vMar2019',
    'stored_procedure_vDec2019'
  ]
  constructor(
    private obpClientService: OBPClientService,
    private oauthInjectedService: OauthInjectedService
  ) {}
  @Get('/')
  async index(
    @Session() session: any,
    @Req() request: Request,
    @Res() response: Response
  ): Response {
    const oauthConfig = session['clientConfig']
    const version = this.obpClientService.getOBPVersion()
    const apiVersions = await this.checkApiVersions(oauthConfig, version)
    const messageDocs = await this.checkMessagDocs(oauthConfig, version)
    const resourceDocs = await this.checkResourceDocs(oauthConfig, version)
    return response.json({
      status: apiVersions && messageDocs && resourceDocs,
      apiVersions,
      messageDocs,
      resourceDocs
    })
  }

  isCodeError(response: any, path: string): boolean {
    console.log(`Validating ${path} response...`)
    if (!response || Object.keys(response).length == 0) return true
    if (Object.keys(response).includes('code')) {
      const code = response['code']
      if (code >= 400) {
        console.log(response) // Log error responce
        return true
      }
    }
    return false
  }

  async checkResourceDocs(oauthConfig: OAuthConfig, version: string): Promise<boolean> {
    try {
      const path = `/obp/${version}/resource-docs/${version}/obp`
      const resourceDocs = await this.obpClientService.get(
        path,
        oauthConfig
      )
      return !this.isCodeError(resourceDocs, path)
    } catch (error) {
      return false
    }
  }
  async checkMessagDocs(oauthConfig: OAuthConfig, version: string): Promise<boolean> {
    try {
      const messageDocsCodeResult = await Promise.all(
        this.connectors.map(async (connector) => {
          const path = `/obp/${version}/message-docs/${connector}`
          return !this.isCodeError(
            await this.obpClientService.get(
              path,
              oauthConfig
            ),
            path
          )
        })
      )
      return messageDocsCodeResult.every((isCodeError: boolean) => isCodeError)
    } catch (error) {
      return false
    }
  }

  async checkApiVersions(oauthConfig: OAuthConfig, version: string): Promise<boolean> {
    try {
      const path = `/obp/${version}/api/versions`
      const versions = await this.obpClientService.get(path, oauthConfig)
      return !this.isCodeError(versions, path)
    } catch (error) {
      return false
    }
  }
}
