import {describe, beforeAll, it, vi, Mock } from 'vitest'
import { ConsentApi } from 'obp-api-typescript'

const mockGetOAuthHeader = vi.fn(async () => (`OAuth oauth_consumer_key="jgaawf2fnj4yixqdsfaq4gipt4v1wvgsxgre",oauth_nonce="JiGDBWA3MAyKtsd9qkfWCxfju36bMjsA",oauth_signature_method="HMAC-SHA1",oauth_timestamp="1741364123",oauth_version="1.0",oauth_signature="sa%2FRylnsdfLK8VPZI%2F2WkGFlTKs%3D"`));
const mockGetDirectLoginToken = vi.fn(async () => {
    return "eyJhbGciOisdReI1NiJ9.eyIiOiIifQ.neaNv-ltBoEEyErvmhmEbYIG8KLdjqRfT7hA7uKPdvs"
});

vi.mock('../services/OBPClientService', () => {
    return {
      default: vi.fn().mockImplementation(() => {
        return {
            // mock getOAuthHeader
            getOBPClientConfig: vi.fn(() => ({baseUri: 'https://test.openbankproject.com'})),
            getOAuthHeader: mockGetOAuthHeader,
            getDirectLoginToken: mockGetDirectLoginToken,
        }
      }),
    }
})

import OBPConsentsService from '../services/OBPConsentsService';

describe('OBPConsentsService.createConsentClient', () => {
    let obpConsentsService: OBPConsentsService;
    let mockedOAuthHeaders: string;

    beforeEach(async () => {
        
        vi.clearAllMocks();

        mockGetOAuthHeader.mockImplementation(async () => `OAuth oauth_consumer_key="jgaawf2fnj4yixqdsfaq4gipt4v1wvgsxgre",oauth_nonce="JiGDBWA3MAyKtsd9qkfWCxfju36bMjsA",oauth_signature_method="HMAC-SHA1",oauth_timestamp="1741364123",oauth_version="1.0",oauth_signature="sa%2FRylnsdfLK8VPZI%2F2WkGFlTKs%3D"`);
        // Mock the OBP Client service for getting the OAuth and direct login headers
        obpConsentsService = new OBPConsentsService();
    });

    it('should return a ConsentApi client for logged in user', async () => {
        const consentClient = await obpConsentsService.createConsentClient('/consents', 'POST', 'logged_in_user');
        expect(consentClient).toBeDefined();
        expect(obpConsentsService.consentsClient).toBe(consentClient);
        expect(consentClient).toBeInstanceOf(ConsentApi);
    })

    it('should return a ConsentApi client for API Explorer', async () => {
        const consentClient = await obpConsentsService.createConsentClient('/consents', 'POST', 'API_Explorer');
        expect(consentClient).toBeDefined();
        expect(obpConsentsService.consentsClient).toBe(consentClient);
        expect(consentClient).toBeInstanceOf(ConsentApi);
    })

    it('should throw an error if the client type is not recognized', async () => {
        await expect(obpConsentsService.createConsentClient('/consents', 'POST', 'unknown')).rejects.toThrow();
    })

    it('should throw correct error if OBPClientService.getOAuthHeader fails for logged in user', async () => {

        mockGetOAuthHeader.mockImplementationOnce(async () => {
            throw new Error('OAuth header error');
        });

        await expect(obpConsentsService.createConsentClient('/consents', 'POST', 'logged_in_user'))
            .rejects.toThrow(`Could not create Consents API client for logged in user, Error: OAuth header error`);
    })

    it('should throw correct error if OBPClientService.getDirectLoginToken fails for API Explorer', async () => {

        mockGetDirectLoginToken.mockImplementationOnce(async () => {
            throw new Error('Direct login token error');
        });

        await expect(obpConsentsService.createConsentClient('/consents', 'POST', 'API_Explorer'))
            .rejects.toThrow(`Could not create Consents API client for API Explorer, Error: Direct login token error`);
    })
})