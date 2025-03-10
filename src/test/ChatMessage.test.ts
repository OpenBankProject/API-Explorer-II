
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import ChatMessage from '../components/ChatMessage.vue'

describe('ChatMessage', () => {
  it('should render correctly on human message', () => {
    const humanMessage = {
      id: 123,
      role: 'user',
      content: 'Hello Opey!',
    }
    const wrapper = mount(ChatMessage, {
      props: {
        message: humanMessage
      }
    })

    expect(wrapper.text()).toContain(humanMessage.content)
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('should render correctly on assistant message', () => {
    const assistantMessage = {
      id: 123,
      role: 'assistant',
      content: 'Hi there, how can I help you today?',
    }
    const wrapper = mount(ChatMessage, {
      props: {
        message: assistantMessage
      }
    })

    expect(wrapper.text()).toContain(assistantMessage.content)
    expect(wrapper.html()).toMatchSnapshot()
  })

  
})

