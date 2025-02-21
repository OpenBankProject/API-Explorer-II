import { OpeyController } from "../server/controllers/OpeyIIController";
import OpeyClientService from '../server/services/OpeyClientService';
import OBPClientService from '../server/services/OBPClientService';
import Stream, { Readable } from 'stream';
import { Request, Response } from 'express';
import httpMocks from 'node-mocks-http'
import { EventEmitter } from 'events';
import {jest} from '@jest/globals';

jest.mock("../server/services/OpeyClientService", () => {
    return {
        OpeyClientService: jest.fn().mockImplementation(() => {
            return {
                getOpeyStatus: jest.fn(async () => {
                    return {status: 'running'}
                }),
                stream: jest.fn(async () => {
                    const readableStream = new Stream.Readable();
                
                    for (let i=0; i<10; i++) {
                        readableStream.push(`Chunk ${i}`);
                    }
                
                    return readableStream as NodeJS.ReadableStream;
                }),
                invoke: jest.fn(async () => {
                    return {
                        content: 'Hi this is Opey',
                    }
                })
            }
        
        }),
    };
});

// jest.mock("./A", () => {
//     return {
//         A: jest.fn().mockImplementation(() => {
//             return {
//                 getSomething: getSomethingMock
//             }
//         })
//     };
// });
// Mock the OpeyClientService class


// jest.mocked(OpeyClientService).mockImplementation(() => {
//     return {
//         getOpeyStatus: jest.fn(async () => {
//             return {status: 'running'}
//         }),
//         stream: jest.fn(async () => {
//             const readableStream = new Stream.Readable();
        
//             for (let i=0; i<10; i++) {
//                 readableStream.push(`Chunk ${i}`);
//             }
        
//             return readableStream as NodeJS.ReadableStream;
//         }),
//         invoke: jest.fn(async () => {
//             return {
//                 content: 'Hi this is Opey',
//             }
//         })
//     }
// });



describe('OpeyController', () => {
    // Mock the OpeyClientService class

    const MockOpeyClientService = {
        authConfig: {},
        opeyConfig: {},
        getOpeyStatus: jest.fn(async () => {
            return {status: 'running'}
        }),
        stream: jest.fn(async () => {

            async function * generator() {
                for (let i=0; i<10; i++) {
                    yield `Chunk ${i}`;
                }
            }

            const readableStream = Stream.Readable.from(generator());

            return readableStream as NodeJS.ReadableStream;
        }),
        invoke: jest.fn(async () => {
            return {
                content: 'Hi this is Opey',
            }
        })
    } as unknown as jest.Mocked<OpeyClientService>


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
