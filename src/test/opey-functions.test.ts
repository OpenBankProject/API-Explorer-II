import * as OpeyModule from '@/obp/opey-functions';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('processOpeyStream', async () => {
    let mockContext: OpeyModule.OpeyStreamContext;

    beforeEach(() => {
        // Reset the mock context before each test
        mockContext = {
            currentAssistantMessage: {
                id: '123',
                role: 'assistant',
                content: '',
            },
            messages: [],
            status: 'loading',
        }
    })
    it('should update context with streamed content', async () => {
        // Mock a ReadableStream
        const mockAsisstantMessage = "Hi I'm Opey, your personal banking assistant. I'll certainly not take over the world, no, not at all!"

        // Split the message into chunks, but reappend the whitespace (this is to simulate llm tokens)
        const mockMessageChunks = mockAsisstantMessage.split(" ")
        for (let i = 0; i < mockMessageChunks.length; i++) {
            // Don't add whitespace to the last chunk
            if (i === mockMessageChunks.length - 1 ) {
                mockMessageChunks[i] = `${mockMessageChunks[i]}`
                break
            }
            mockMessageChunks[i] = `${mockMessageChunks[i]} `
        }

        // Fake the token stream
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                for (let i = 0; i < mockMessageChunks.length; i++) {
                    controller.enqueue(new TextEncoder().encode(`data: {"type":"token","content":"${mockMessageChunks[i]}"}\n`));
                }
                controller.close();
            },
        });

        await OpeyModule.processOpeyStream(stream, mockContext)
        console.log(mockContext.currentAssistantMessage.content)
        expect(mockContext.currentAssistantMessage.content).toBe(mockAsisstantMessage)
    })

    it('should throw an error when the stream is closed by the server', async () => {
        const brokenStream = new ReadableStream<Uint8Array>({
            start(controller) {
                for (let i = 0; i < 10; i++) {
                    if (i === 5) {
                        controller.error(new Error('Stream closed by server'))
                        break;
                    }
                    controller.enqueue(new TextEncoder().encode(`data: {"type":"token","content":"test"}\n`));
                }
                
            },
        });

        await expect(OpeyModule.processOpeyStream(brokenStream, mockContext))
            .rejects
            .toThrow('Stream closed by server')
    })

    it('should throw an error when the chunk is not valid json', async () => {
        const invalidJsonStream = new ReadableStream<Uint8Array>({
            start(controller) {
                for (let i=0; i<10; i++) {
                    controller.enqueue(new TextEncoder().encode(`data: {"type":"token","content":"test"}\n`));
                    if (i === 5) {
                        controller.enqueue(new TextEncoder().encode('data: "type":"token","content":"test"}\n'));
                    }
                }
                controller.close();

            }
        })

        await expect(OpeyModule.processOpeyStream(invalidJsonStream, mockContext))
            .rejects
            .toThrowError()
    })

    it("should set status to 'ready' when completed", async () => {
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(new TextEncoder().encode(`data: {"type":"token","content":"test"}\n`));
                controller.close();
            }
        })

        await OpeyModule.processOpeyStream(stream, mockContext)
        expect(mockContext.status).toBe('ready')
    })

    it("should clear the placeholder assistant message, and update last assistant message when recieving the [DONE] signal", async () => {
        // Mock a ReadableStream
        const mockAsisstantMessage = "Hi I'm Opey, your personal banking assistant. I'll certainly not take over the world, no, not at all!"
        // Split the message into chunks, but reappend the whitespace (this is to simulate llm tokens)
        const mockMessageChunks = mockAsisstantMessage.split(" ")
        for (let i = 0; i < mockMessageChunks.length; i++) {
            // Don't add whitespace to the last chunk
            if (i === mockMessageChunks.length - 1 ) {
                mockMessageChunks[i] = `${mockMessageChunks[i]}`
                break
            }
            mockMessageChunks[i] = `${mockMessageChunks[i]} `
        }

        // Fake the token stream
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                for (let i = 0; i < mockMessageChunks.length; i++) {
                    controller.enqueue(new TextEncoder().encode(`data: {"type":"token","content":"${mockMessageChunks[i]}"}\n`));
                }
                controller.enqueue(new TextEncoder().encode(`data: [DONE]\n`));
                controller.close();
            },
        });

        // Replace current assistant message with a more unique one for our test
        mockContext.currentAssistantMessage = {
            id: '456',
            role: 'assistant',
            content: '',
         }
       
        // Push assistant message to the messages list as this is what we do in the ChatWidget to visualise token streaming
        mockContext.messages.push(mockContext.currentAssistantMessage)

        await OpeyModule.processOpeyStream(stream, mockContext)
        // assert that the current assistant 'placeholder' message was reset
        expect(mockContext.currentAssistantMessage.content).toBe('')
        // assert that the assistant message was added to the messages list
        console.log(mockContext.messages)
        expect(mockContext.messages).toContainEqual({
            id: '456',
            role: 'assistant',
            content: mockAsisstantMessage,
        })
        

    })
    it("should have a unique set of messages", async () => {
        // mock the stream as above
        // Mock a ReadableStream
        const mockAsisstantMessage = "Hi I'm Opey, your personal banking assistant. I'll certainly not take over the world, no, not at all!"
        // Split the message into chunks, but reappend the whitespace (this is to simulate llm tokens)
        const mockMessageChunks = mockAsisstantMessage.split(" ")
        for (let i = 0; i < mockMessageChunks.length; i++) {
            // Don't add whitespace to the last chunk
            if (i === mockMessageChunks.length - 1 ) {
                mockMessageChunks[i] = `${mockMessageChunks[i]}`
                break
            }
            mockMessageChunks[i] = `${mockMessageChunks[i]} `
        }

        // Fake the token stream
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                for (let i = 0; i < mockMessageChunks.length; i++) {
                    controller.enqueue(new TextEncoder().encode(`data: {"type":"token","content":"${mockMessageChunks[i]}"}\n`));
                }
                controller.enqueue(new TextEncoder().encode(`data: [DONE]\n`));
                controller.close();
            },
        });

        // Replace current assistant message with a more unique one for our test
        mockContext.currentAssistantMessage = {
            id: '456',
            role: 'assistant',
            content: '',
         }
       
        // Push assistant message to the messages list as this is what we do in the ChatWidget to visualise token streaming
        mockContext.messages.push(mockContext.currentAssistantMessage)

        await OpeyModule.processOpeyStream(stream, mockContext)

        function hasUniqueValues(arr: OpeyModule.OpeyMessage[]): boolean {
            return arr.filter((value, index, self) => self.indexOf(value) === index).length === arr.length;
        }
        expect(hasUniqueValues(mockContext.messages)).toBe(true)
    })

})

describe('sendOpeyMessage', () => {
    let mockContext: OpeyModule.OpeyStreamContext;
    let testUserMessage: OpeyModule.UserMessage;

    beforeEach(() => {
        mockContext = {
            currentAssistantMessage: {
                id: '123',
                role: 'assistant',
                content: '',
            },
            messages: [],
            status: 'loading',
        }  

        // create a mock stream
        const mockStream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(new TextEncoder().encode(`data: {"type":"token","content":"test"}\n`));
                controller.close();
            },
        });

        // mock the fetch function
        global.fetch = vi.fn(() =>
            Promise.resolve(new Response(mockStream, {
                headers: { 'content-type': 'text/event-stream' },
                status: 200,
            }))
        );

        testUserMessage = {
            id: '123',
            role: 'user',
            content: 'test message',
            isToolCallApproval: false,
        } 
    })
    afterEach(() => {
        vi.clearAllMocks()
    })
    it('should call fetch', async () => {
        await OpeyModule.sendOpeyMessage(testUserMessage, '123', mockContext)

        expect(global.fetch).toHaveBeenCalled()
    })
    it("should push the 'ready' status to the context after success", async () => {

        await OpeyModule.sendOpeyMessage(testUserMessage, '123', mockContext)

        expect(mockContext.status).toBe('ready')
    })
})