import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import OpeyClientService from '../services/OpeyClientService';

describe('getStatus', async () => {
    let opeyClientService: OpeyClientService;

    beforeAll(() => {
        opeyClientService = new OpeyClientService();
    })

    afterEach(() => {
        vi.clearAllMocks();
    })

    it('Should resolve promise with response body if Opey returns 200', async () => {

        // mock the fetch function for an OK response from Opey
        const statusMessage = {"status": "ok"}
        global.fetch = vi.fn(() =>
            Promise.resolve(new Response(JSON.stringify(statusMessage), {
                status: 200,
            }))
        );

        // Call get status
        const status = await opeyClientService.getOpeyStatus()
        expect(status).toStrictEqual(statusMessage)
    })

    it('Should reject the promise and throw an error if Opey II service is down', async () => {
        global.fetch = vi.fn(() =>
            Promise.reject(new Response(JSON.stringify({"status": "down"}), {
                status: 500,
            }))
        );

        await expect(opeyClientService.getOpeyStatus()).rejects.toThrowError()
    })
})

// Need to write tests for stream and invoke methods

describe