import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { OpeyController } from "../controllers/OpeyIIController";
import OpeyClientService from '../services/OpeyClientService';
import OBPClientService from '../services/OBPClientService';
import Stream, { Readable } from 'stream';
import { Request, Response } from 'express';
import httpMocks from 'node-mocks-http'
import { EventEmitter } from 'events';

vi.mock("../../server/services/OpeyClientService", () => {
    return {
        default: vi.fn().mockImplementation(() => {
            return {
                getOpeyStatus: vi.fn(async () => {
                    return {status: 'running'}
                }),
                stream: vi.fn(async () => {
                    const readableStream = new Stream.Readable();
                
                    for (let i=0; i<10; i++) {
                        readableStream.push(`Chunk ${i}`);
                    }
                
                    return readableStream as NodeJS.ReadableStream;
                }),
                invoke: vi.fn(async () => {
                    return {
                        content: 'Hi this is Opey',
                    }
                })
            }
        
        }),
    };
});

describe('OpeyController', () => {
    // Mock the OpeyClientService class

    const MockOpeyClientService = {
        authConfig: {},
        opeyConfig: {},
        getOpeyStatus: vi.fn(async () => {
            return {status: 'running'}
        }),
        stream: vi.fn(async () => {

            async function * generator() {
                for (let i=0; i<10; i++) {
                    yield `Chunk ${i}`;
                }
            }

            const readableStream = Stream.Readable.from(generator());

            return readableStream as NodeJS.ReadableStream;
        }),
        invoke: vi.fn(async () => {
            return {
                content: 'Hi this is Opey',
            }
        })
    } as unknown as OpeyClientService


    // Instantiate OpeyController with the mocked OpeyClientService
    const opeyController = new OpeyController(new OBPClientService, MockOpeyClientService)


    it('getStatus', async () => {
        const res = httpMocks.createResponse();

        await opeyController.getStatus(res)
        expect(MockOpeyClientService.getOpeyStatus).toHaveBeenCalled();
        expect(res.statusCode).toBe(200);
    })

    it('streamOpey', async () => {

        const _eventEmitter = new EventEmitter();
        _eventEmitter.addListener('data', () => {
            console.log('Data received')
        })
        // The default event emitter does nothing, so replace
        const res = await httpMocks.createResponse({
            eventEmitter: EventEmitter,
            writableStream: Stream.Writable
        });

        const req = {
            body: {
                message: 'Hello Opey',
                thread_id: '123',
                is_tool_call_approval: false
            }
        } as unknown as Request;

        // Define handelrs for events
        

        
        let chunks: any[] = [];
        try {
            const response = await opeyController.streamOpey({}, req, res)

            response.on('end', async () => {
                console.log('Stream ended')
                console.log(res._getData())
                await expect(res.statusCode).toBe(200);
            })
            
            response.on('data', async (chunk) => {
                console.log(chunk)
                await chunks.push(chunk);
                await expect(chunk).toBeDefined();
            })
        } catch (error) {
            console.error(error)
        }
        

        await expect(chunks.length).toBe(10);
        await expect(MockOpeyClientService.stream).toHaveBeenCalled();
        await expect(res).toBeDefined();
        
    })
})


describe('OpeyController consents flow', () => {
    let mockOBPClientService: OBPClientService

    let opeyController: OpeyController

    beforeAll(() => {
        mockOBPClientService = {
            get: vi.fn(async () => {
                Promise.resolve({})
            })
        } as unknown as OBPClientService       

        const MockOpeyClientService = {
            authConfig: {},
            opeyConfig: {},
            getOpeyStatus: vi.fn(async () => {
                return {status: 'running'}
            }),
            stream: vi.fn(async () => {
    
                async function * generator() {
                    for (let i=0; i<10; i++) {
                        yield `Chunk ${i}`;
                    }
                }
    
                const readableStream = Stream.Readable.from(generator());
    
                return readableStream as NodeJS.ReadableStream;
            }),
            invoke: vi.fn(async () => {
                return {
                    content: 'Hi this is Opey',
                }
            })
        } as unknown as OpeyClientService
    
    
        // Instantiate OpeyController with the mocked OpeyClientService
        opeyController = new OpeyController(new OBPClientService, MockOpeyClientService)

    })
    afterEach(() => {
        vi.clearAllMocks()
    })
    it('should return 200 and consent ID when consent is created at OBP', async () => {

        vi.mock('../services/OBPClientService', () => {
            return {
              default: vi.fn().mockImplementation(() => {
                return {
                  get: vi.fn(async () => ({ user_id: 'mocked-user-id' })),
                  create: vi.fn(async () => ({
                    "consent_request_id": "8ca8a7e4-6d02-40e3-a129-0b2bf89de9f0",
                    "consumer_id": "7uy8a7e4-6d02-40e3-a129-0b2bf89de8uh",
                    "payload": "payload"
                  })),
                }
              }),
            }
          })

        const req = {}
        const res = httpMocks.createResponse()
        await opeyController.getConsentRequest({}, req, res)
        await expect(res.status).toBe(200)

    })
})