import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import OpeyClientService from '../services/OpeyClientService.js';
import { OpeyConfig, UserInput } from '../schema/OpeySchema.js';

describe('getStatus', async () => {
    let opeyClientService: OpeyClientService;
    let opeyConfig: OpeyConfig;

    beforeAll(() => {
        opeyClientService = new OpeyClientService();
        opeyConfig = {
            baseUri: 'http://localhost:5000',
            paths: {},
        }
    })

    afterEach(() => {
        vi.clearAllMocks();
    })

    it('Should resolve promise with response body if Opey returns 200', async () => {

        // mock the fetch function for an OK response from Opey
        const statusMessage = { "status": "ok" }
        global.fetch = vi.fn(() =>
            Promise.resolve(new Response(JSON.stringify(statusMessage), {
                status: 200,
            }))
        );

        // Call get status
        const status = await opeyClientService.getOpeyStatus(opeyConfig)
        expect(status).toStrictEqual(statusMessage)
    })

    it('Should reject the promise and throw an error if Opey II service is down', async () => {
        global.fetch = vi.fn(() =>
            Promise.reject(new Response(JSON.stringify({ "status": "down" }), {
                status: 500,
            }))
        );

        await expect(opeyClientService.getOpeyStatus(opeyConfig)).rejects.toThrowError()
    })
})

// Need to write tests for stream and invoke methods

describe('stream', async () => {
    let opeyClientService: OpeyClientService;
    let opeyConfig: Partial<OpeyConfig>;

    beforeAll(() => {
        opeyClientService = new OpeyClientService();
    })

    beforeEach(() => {
        vi.clearAllMocks();

        // create a mock stream
        const mockStream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(new TextEncoder().encode(`data: {"type":"token","content":"test"}\n`));
                controller.close();
            },
        });

        global.fetch = vi.fn(() => {
            return Promise.resolve(new Response(mockStream, {
                status: 200,
            }))
        })

        opeyConfig = {
            authConfig: {
                obpConsent: {
                    consent_id: 'test-consent-id',
                    status: 'ACCEPTED',
                    jwt: 'test-jwt-token',
                }
            }
        }

    })

    it('should add the obpConsent jwt to the Authorization header', async () => {

        const user_input: UserInput = {
            message: 'test message',
            is_tool_call_approval: false,
        }

        await opeyClientService.stream(user_input, opeyConfig);

        expect(global.fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
                "Consent-JWT": `${opeyConfig.authConfig?.obpConsent.jwt}`,
            }),
        }))

    })

    it('should return a ReadableStream if Opey returns 200', async () => {
        
        // Mock the stream response
        const mockStream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(new TextEncoder().encode(`data: {"type":"token","content":"test"}\n`));
                controller.close();
            },
        });

        global.fetch = vi.fn(() => {
            return Promise.resolve(new Response(mockStream, {
                status: 200,
            }))
        })

        const user_input: UserInput = {
            message: 'test message',
            is_tool_call_approval: false,
        }

        const response = await opeyClientService.stream(user_input, opeyConfig);
        

        expect(response).toBeInstanceOf(ReadableStream);
    });
})

describe('getOpeyConfig', async () => {
    let opeyClientService: OpeyClientService;

    beforeAll(() => {
        opeyClientService = new OpeyClientService();
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return default config when no config is provided', async () => {
        const config = await opeyClientService.getOpeyConfig();
        expect(config).toEqual({
            baseUri: expect.any(String),
            paths: {
                status: '/status',
                stream: '/stream',
                invoke: '/invoke',
                approve_tool: '/approve_tool/{thead_id}',
                feedback: '/feedback',
            }
        });
    });

    it('should merge baseUri when provided', async () => {
        const partialConfig: Partial<OpeyConfig> = {
            baseUri: 'https://custom-api.example.com'
        };

        const resultConfig = await opeyClientService.getOpeyConfig(partialConfig);

        // Verify the baseUri was overwritten
        expect(resultConfig.baseUri).toBe('https://custom-api.example.com');

        // Verify the paths were preserved from default
        expect(resultConfig.paths).toEqual({
            status: '/status',
            stream: '/stream',
            invoke: '/invoke',
            approve_tool: '/approve_tool/{thead_id}',
            feedback: '/feedback',
        });
    });

    it('should merge specific paths when provided', async () => {
        const partialConfig: Partial<OpeyConfig> = {
            paths: {
                status: '/custom-status',
                stream: '/custom-stream',
            }
        };

        const resultConfig = await opeyClientService.getOpeyConfig(partialConfig);

        // Verify only specified paths were overwritten
        expect(resultConfig.paths.status).toBe('/custom-status');
        expect(resultConfig.paths.stream).toBe('/custom-stream');

        // Verify other paths remain unchanged
        expect(resultConfig.paths.invoke).toBe('/invoke');
        expect(resultConfig.paths.approve_tool).toBe('/approve_tool/{thead_id}');
        expect(resultConfig.paths.feedback).toBe('/feedback');
    });

    it('should merge authConfig when provided', async () => {
        const partialConfig: Partial<OpeyConfig> = {
            authConfig: {
                obpConsent: {
                    consent_id: 'test-consent-id',
                    status: 'ACCEPTED',
                    jwt: 'test-jwt-token',
                }
            }
        };

        const resultConfig = await opeyClientService.getOpeyConfig(partialConfig);

        // Verify authConfig was added with correct values
        expect(resultConfig.authConfig).toBeDefined();
        expect(resultConfig.authConfig!.obpConsent).toEqual({
            consent_id: 'test-consent-id',
            status: 'ACCEPTED',
            jwt: 'test-jwt-token',
        });

        // Verify original config fields remain
        expect(resultConfig)
        expect(resultConfig.baseUri).toBe('http://localhost:5000');
        expect(resultConfig.paths).toBeDefined();
    });


    it('should not modify the original default config', async () => {
        // Get a copy of the original default config
        const originalConfig = JSON.parse(JSON.stringify(await opeyClientService.getOpeyConfig()));

        // Apply some changes
        const partialConfig: Partial<OpeyConfig> = {
            baseUri: 'https://modified.example.com',
            paths: {
                status: '/modified-status',
            }
        };

        await opeyClientService.getOpeyConfig(partialConfig);

        // Get the default config again with no arguments
        const currentDefaultConfig = await opeyClientService.getOpeyConfig();

        // The default config should not have changed
        expect(currentDefaultConfig).toEqual(originalConfig);
    });
});


describe('checkAuthConfig', async () => {
    let opeyClientService: OpeyClientService;

    beforeAll(() => {
        opeyClientService = new OpeyClientService();
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return invalid when authConfig is missing', async () => {
        const opeyConfig: OpeyConfig = {
            baseUri: 'http://localhost:5000',
            paths: {
                status: '/status',
                stream: '/stream',
            }
            // authConfig intentionally missing
        };

        const result = await opeyClientService.checkAuthConfig(opeyConfig);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('No authConfig set in opeyConfig, authentication required');
    });

    it('should return invalid when obpConsent is missing', async () => {
        const opeyConfig: OpeyConfig = {
            baseUri: 'http://localhost:5000',
            paths: {
                status: '/status',
            },
            authConfig: {
                // obpConsent intentionally missing
            }
        };

        const result = await opeyClientService.checkAuthConfig(opeyConfig);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('No authConfig set in opeyConfig, authentication required');
    });

    it('should return invalid when consent status is not ACCEPTED', async () => {
        const opeyConfig: OpeyConfig = {
            baseUri: 'http://localhost:5000',
            paths: {
                status: '/status',
            },
            authConfig: {
                obpConsent: {
                    status: 'INITIATED',
                    jwt: 'test-token',
                    consent_id: '12345',
                }
            }
        };

        const result = await opeyClientService.checkAuthConfig(opeyConfig);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Opey consent status is not ACCEPTED');
    });


    it('should return valid when consent status is ACCEPTED', async () => {
        const opeyConfig: OpeyConfig = {
            baseUri: 'http://localhost:5000',
            paths: {
                status: '/status',
            },
            authConfig: {
                obpConsent: {
                    status: 'ACCEPTED',
                    jwt: 'test-token',
                    consent_id: '12345',
                }
            }
        };

        const result = await opeyClientService.checkAuthConfig(opeyConfig);

        expect(result.valid).toBe(true);
        expect(result.reason).toBe('AuthConfig is valid');
    });

    it('should validate correctly even with additional fields present', async () => {
        const opeyConfig: OpeyConfig = {
            baseUri: 'http://localhost:5000',
            paths: {
                status: '/status',
            },
            authConfig: {
                obpConsent: {
                    status: 'ACCEPTED',
                    jwt: 'test-token',
                    consent_id: '12345',
                    user_id: 'user1',
                    created_at: '2025-03-13T12:00:00Z',
                    expires_at: '2025-04-13T12:00:00Z'
                },
                otherAuth: {
                    someField: 'someValue'
                }
            }
        };

        const result = await opeyClientService.checkAuthConfig(opeyConfig);

        expect(result.valid).toBe(true);
        expect(result.reason).toBe('AuthConfig is valid');
    });
});