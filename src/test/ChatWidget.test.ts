import { mount } from '@vue/test-utils';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ChatWidget from '../components/ChatWidget.vue'
import { OpeyStreamContext } from '@/obp/opey-functions';

describe('ChatWidget', () => {
    let mockContext: OpeyStreamContext;

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
    })
    afterEach(() => {
        vi.clearAllMocks()
    })
    it('should call fetch when sending a user message', async () => {
        const wrapper = mount(ChatWidget, {})

        await wrapper.vm.onSubmit()
        expect(global.fetch).toHaveBeenCalled()
    })
    it('should clear the assistant message placeholder from messages list on error', async () => {
        // mock the fetch function with a rejected promise
        const wrapper = mount(ChatWidget, {})

        global.fetch = vi.fn(() =>
            Promise.reject(new Error('Test error'))
        );

        await wrapper.vm.onSubmit()
        expect(wrapper.vm.opeyContext.messages.find(m => m.id === wrapper.vm.opeyContext.currentAssistantMessage.id)).toBeUndefined()


    })
    it('should trigger onSubmit when enter key is pressed in the input', async () => {
        const wrapper = mount(ChatWidget, {})
        
        // This opens the chat widget
        wrapper.vm.chatOpen = true
        await wrapper.vm.$nextTick()

        // Get the input element and trigger the keypress enter event
        // This will probably fail if the class name of the parent div is changed, or if the input type is moved i.e. from textarea to input or el-input
        const input = wrapper.get('.user-input-container textarea')
        input.trigger('keypress.enter')
        expect(global.fetch).toHaveBeenCalled()
    })
    it('displays chat when chatOpen is set to true', async () => {
        const wrapper = mount(ChatWidget, {})
        wrapper.vm.chatOpen = true
        await wrapper.vm.$nextTick()
        expect(wrapper.find('.chat-container').exists()).toBe(true)
    })
})