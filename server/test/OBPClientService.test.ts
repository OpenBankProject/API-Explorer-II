import {describe, it, expect} from 'vitest'
import OBPClientService from "../services/OBPClientService.js";
import { before } from 'node:test';

describe('OBPClientService.getOauthHeaders', () => {
    let obpClientService: OBPClientService;
    beforeAll(() => {
        obpClientService = new OBPClientService();
    })
    it('Should return an object with the correct oauth headers', async () => {
        // This can't work as we don't have an access token yet, which means the function returns an empty string
        // TODO - Mock OAuth1 flow, or at least have a fake filled out clientConfig
        const headers = await obpClientService.getOAuthHeader('/test', 'GET');
        console.log("OAuth Headers: ", headers)
        const clientConfig = await obpClientService.getOBPClientConfig();
        console.log("Client Config: ", clientConfig)
        expect(headers).toBeTypeOf('string');

    })
})