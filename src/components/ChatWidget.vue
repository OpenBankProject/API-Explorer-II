<!--
  - Open Bank Project -  API Explorer II
  - Copyright (C) 2023-2024, TESOBE GmbH
  -
  - This program is free software: you can redistribute it and/or modify
  - it under the terms of the GNU Affero General Public License as published by
  - the Free Software Foundation, either version 3 of the License, or
  - (at your option) any later version.
  -
  - This program is distributed in the hope that it will be useful,
  - but WITHOUT ANY WARRANTY; without even the implied warranty of
  - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  - GNU Affero General Public License for more details.
  -
  - You should have received a copy of the GNU Affero General Public License
  - along with this program.  If not, see <http://www.gnu.org/licenses/>.
  -
  - Email: contact@tesobe.com
  - TESOBE GmbH
  - Osloerstrasse 16/17
  - Berlin 13359, Germany
  -
  -   This product includes software developed at
  -   TESOBE (http://www.tesobe.com/)
  -
  -->

<script>
  import Prism from 'prismjs';
  import MarkdownIt from "markdown-it";
  import 'prismjs/themes/prism.css'; // Choose a theme you like
  import { v4 as uuidv4 } from 'uuid';
  import axios from 'axios';
  import { inject } from 'vue';
  import { obpApiHostKey } from '@/obp/keys';

  import 'prismjs/components/prism-markup';
  import 'prismjs/components/prism-javascript';
  import 'prismjs/components/prism-json';
  import 'prismjs/components/prism-bash';
  import 'prismjs/components/prism-http';
  import 'prismjs/components/prism-python';
  import 'prismjs/components/prism-go';

  import 'prismjs/themes/prism-okaidia.css';
  

  export default {
    data() {
      return {
        isOpen: false,
        userInput: '',
        messages: [],
        sessionId: uuidv4(),
        isLoading: false,
        obpApiHost: null
      };
    },
    created() {
      this.obpApiHost = inject(obpApiHostKey);
    },
    methods: {
      toggleChat() {
        this.isOpen = !this.isOpen;
        this.$nextTick(() => {
          if (this.isOpen) {
            this.scrollToBottom();
          }
        });
      },
      async sendMessage() {
        if (this.userInput.trim()) {
          const newMessage = { role: 'user', content: this.userInput };
          this.messages.push(newMessage);
          this.userInput = '';
          this.isLoading = true;
  
          // Send the user message to the backend and get the response
          console.log('Sending message:', newMessage.content);

          // DEBUG
          console.log('OBP API HOST: ', this.obpApiHost)

          try {
            const response = await axios.post('http://localhost:5000/chat', {
                session_id: this.sessionId,
                message: newMessage.content,
                obp_api_host: this.obpApiHost
            });

            
            if (response.status != 200) {
              console.log(`Response: ${response.status} ${response.data} `);
              throw new Error("We're having trouble connecting you to Opey right now...");
            }
            this.messages.push({ role: 'assistant', content: response.data.reply });
          } catch (error) {
            console.error('Error:', error);
            this.messages.push({ role: 'error', content: "We're having trouble connecting you to Opey right now..."})
          } finally {
            this.isLoading = false;
          }
  
          this.$nextTick(() => {
            this.scrollToBottom();
          });
        }
      },
      highlightCode(content, language) {
        if (Prism.languages[language]) {
          return Prism.highlight(content, Prism.languages[language], language);
        } else {
          console.log(`could not highlight ${language} code block, add language to dependencies`)
          // If the language is not recognized, return the content as is
          return content;
        }
      },
      renderMarkdown(content) {
        const markdown = new MarkdownIt({
          highlight: (str, lang) => {
            if (lang && Prism.languages[lang]) {
              try {
                return `<pre class="language-${lang}"><code>${this.highlightCode(str, lang)}</code></pre>`;
              } catch (error) {
                console.log(`error hilighting ${lang} code block: ${error}`)
              }
            }

            // If the language is not specified or not recognized, use a default language
            return `<pre class="language-"><code>${markdown.utils.escapeHtml(str)}</code></pre>`;
          }
        });

        return markdown.render(content);
      },
      scrollToBottom() {
        const messages = this.$refs.messages;
        messages.scrollTop = messages.scrollHeight;
      },
      initResize(event) {
        this.isResizing = true;
        this.startX = event.clientX;
        this.startY = event.clientY;
        this.startWidth = parseInt(document.defaultView.getComputedStyle(this.$refs.chatContainer).width, 10);
        this.startHeight = parseInt(document.defaultView.getComputedStyle(this.$refs.chatContainer).height, 10);
        window.addEventListener('mousemove', this.resize);
        window.addEventListener('mouseup', this.stopResize);
      },
      resize(event) {
        if (this.isResizing) {
            const chatContainer = this.$refs.chatContainer;
            const newWidth = this.startWidth - (event.clientX - this.startX);
            const newHeight = this.startHeight - (event.clientY - this.startY);

            if (newWidth > 100) {
                chatContainer.style.width = `${newWidth}px`;
            }
            if (newHeight > 100) {
                chatContainer.style.height = `${newHeight}px`;
            }
        }
      },
      stopResize() {
        this.isResizing = false;
        window.removeEventListener('mousemove', this.resize);
        window.removeEventListener('mouseup', this.stopResize);
      },
      submitEnter(event) {
        if (event.key == 'Enter' && !event.shiftKey) {
          event.preventDefault();
          console.log("enter logged")
          this.sendMessage();
        }
      }
    }
  };
</script>

<template>

  <div>
    <el-tooltip content="Chat with our AI, Opey" placement="left" effect="light">
      <div class="chat-button" @click="toggleChat">
        <img alt="AI Help" src="@/assets/chatbot.png" />
      </div>
    </el-tooltip>
    <div v-if="isOpen" class="chat-container" ref="chatContainer">
      <div class="quit-button-container">
        <button class="quit-button" @click="toggleChat">X</button>
      </div>
      <div class="chat-container-inner">
        <div class="resizer" @mousedown="initResize"></div>
        <div class="chat-header">
          <span>Chat with Opey</span>
          <img alt="Powered by OpenAI" src="@/assets/powered-by-openai-badge-outlined-on-dark.svg" height="32">
        </div>
        <div class="chat-messages" ref="messages">
          <div v-for="(message, index) in messages" :key="index" :class="['chat-message', message.role]">
            <div v-if="message.role=='error'">
              <el-icon><Warning /></el-icon> <div v-html="renderMarkdown(message.content)"></div>
            </div>
            <div v-else>
              <div v-html="renderMarkdown(message.content)"></div>
            </div>
          </div>
          <div if="isLoading" class="chat-message assistant typing">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
        </div>
        <div class="chat-input">
          <textarea v-model="userInput" placeholder="Type your message..." @keypress="submitEnter"></textarea>
          <button @click="sendMessage">Send</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.chat-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 60px;
  height: 60px;
  background-color: white;
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 0 20px rgba(0, 123, 255, 0.6);
  transition: box-shadow 0.3s;
}

.quit-button-container {
  position: relative;
}

.quit-button {
  position: absolute;
  top: -12px; 
  right: -12px; 
  width: 24px;
  height: 24px;
  background-color: red;
  color: #fff;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
  font-weight: bold;
  z-index: 1002; /* Ensure it appears above the chat container and its contents */
}

.chat-button:hover {
  box-shadow: 0 0 30px rgba(0, 123, 255, 0.8);
}

.chat-button img {
  width: 30px;
}

.chat-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 390px;
  height: 470px;
  min-width: 390px;
  min-height: 470px;
  border: 1px solid #ccc;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  display: flex;
  flex-direction: column;
  z-index: 1000; /* Lower than the quit button */
  overflow: visible;
}

.chat-container-inner {
  display: flex;
  overflow: hidden;
  border-radius: inherit;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  padding: 10px;
  background-color: #007bff;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-messages {
  flex: 1;
  padding: 10px;
  overflow-y: auto;
  background-color: #f9f9f9;
}

.chat-message {
  font-family: ui-sans-serif,-apple-system,system-ui,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif,Helvetica,Apple Color Emoji,Arial,Segoe UI Emoji,Segoe UI Symbol;
}

.chat-header span {
  font-family: ui-sans-serif,-apple-system,system-ui,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif,Helvetica;
  font-weight: 500;
}

.chat-message {
  margin-bottom: 10px;
  padding: 10px;
  border-radius: 5px;
}

.chat-message.user {
  background-color: #e1ffc7;
  align-self: flex-end;
}

.chat-message.assistant {
  background-color: #fff;
}

.chat-message.error {
  background-color: #eec2c2;
  color: #b10101;
}

.chat-message.typing {
  display: flex;
  justify-content: center;
  align-items: center;
  color: #333;
  border-radius: 5px;
  padding: 10px;
  margin-bottom: 10px;
  font-size: 14px;
  max-width: 70%;
}

.typing .dot {
  width: 8px;
  height: 8px;
  margin: 0 5px;
  background-color: #007bff;
  border-radius: 50%;
  animation: loading 1s infinite;
}

.typing .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes loading {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}
.chat-input {
  display: flex;
  padding: 10px;
  border-top: 1px solid #ccc;
  background-color: #fff;
  position: sticky;
  bottom: 0;
}

.chat-input textarea {
  flex: 1;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  resize: none;
  font-size: 14px;
}

.chat-input button {
  margin-left: 10px;
  padding: 10px 20px;
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.chat-input button:hover {
  background-color: #0056b3;
}

.resizer {
  width: 13px;
  height: 13px;
  background: repeating-linear-gradient(
    -45deg,
    rgba(50, 50, 50, 50%),
    rgba(50, 50, 50, 50%) 1px,
    transparent 1px,
    transparent 3px
  );
  position: absolute;
  left: 0;
  top: 0;
  cursor: nwse-resize;
  z-index: 1001;
}
</style>