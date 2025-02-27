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
  import { inject } from 'vue';
  import { obpApiHostKey } from '@/obp/keys';
  import { getCurrentUser } from '../obp';
  import { getOpeyJWT } from '@/obp/common-functions'
  import { storeToRefs } from "pinia";
  import { socket } from '@/socket';
  import { useConnectionStore } from '@/stores/connection';
  import { useChatStore } from '@/stores/chat';
  import { ElMessage } from 'element-plus';

  import 'prismjs/components/prism-markup';
  import 'prismjs/components/prism-javascript';
  import 'prismjs/components/prism-json';
  import 'prismjs/components/prism-bash';
  import 'prismjs/components/prism-http';
  import 'prismjs/components/prism-python';
  import 'prismjs/components/prism-go';
  import 'prismjs/themes/prism-okaidia.css';

  export default {
    setup() {
      /**
       * Pinia stores only work properly in the vue composition API, hence the setup() call here, which allows us to use the vue composition API within the vue options API
       * See https://vueschool.io/articles/vuejs-tutorials/options-api-vs-composition-api/ 
       * and https://vuejs.org/api/composition-api-setup.html
       * */ 
       
      // We use a pinia store to store the chat messages, and status data like if there is a message stream currently happening or an error state.
      const chatStore = useChatStore();

      // The connection store merely handles connection to the websocket, and connection status
      const connectionStore = useConnectionStore();

      socket.off()

      chatStore.bindEvents();
      connectionStore.bindEvents();

      const { isStreaming, chatMessages, currentMessageSnapshot, lastError } = storeToRefs(chatStore);

      const { isConnected } = storeToRefs(connectionStore);

      return {isStreaming, chatMessages, lastError, currentMessageSnapshot, chatStore, connectionStore, isConnected}
    },
    data() {
      return {
        isOpen: false,
        userInput: '',
        sessionId: uuidv4(),
        isLoading: false,
        obpApiHost: null,
        isLoggedIn: null,
        errorState: false,
      };
    },
    created() {
      this.chatBotUrl = import.meta.env.VITE_CHATBOT_URL
      console.log('here is this.chatBotUrl: ', this.chatBotUrl)
      this.obpApiHost = inject(obpApiHostKey);
      this.checkLoginStatus();
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
      /**
       * checks the log in status of the user on mount
       */
      async checkLoginStatus() {
        const currentUser = await getCurrentUser()
        const currentResponseKeys = Object.keys(currentUser)
        if (currentResponseKeys.includes('username')) {
          this.isLoggedIn = true
          this.establishWebSocketConnection();
        } else {
          this.isLoggedIn = null
        }
      },
      async establishWebSocketConnection() {
        // Get the Opey JWT token
        let token = ''
        try {
          token = await getOpeyJWT()
        } catch (error) {
          console.log('Error creating JWT for opey: ', error)
          this.errorState = true
          ElMessage({
            message: 'Error getting Opey JWT token',
            type: 'error'
          });
          
        }
 
        // Establish the WebSocket connection
        console.log('Establishing WebSocket connection');
        try{
          this.connectionStore.connect(token)
        } catch (error) {
          console.log('Error establishing WebSocket connection: ', error)
          this.errorState = true
          ElMessage({
            message: 'Error establishing WebSocket connection',
            type: 'error'
          });
        }
      
      },
      async sendMessage() {
        if (this.userInput.trim()) {
          // Message in OpenAI standard format for user message
          const newMessage = { role: 'user', content: this.userInput };

          // Push message to pinia store
          this.chatMessages.push(newMessage);
          this.userInput = '';
          this.isLoading = true;
          this.errorState = false;
          this.currentMessage = "",

          // Send the user message to the backend and get the response
          console.log('Sending message:', newMessage.content);
          socket.emit('chat', {
              session_id: this.sessionId,
              message: newMessage.content,
              obp_api_host: this.obpApiHost
          });

          socket.on('response stream start', (response) => {
            this.isLoading = false;
          });

          socket.on('error', () => {
            this.errorState = true;
            this.isLoading = false;
            console.log(this.lastError);
          });
        }
      },
      /**
       * This function highlights code blocks in the chat messages
       * 
       * @param content 
       * @param language 
       */
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
      // Following three functions resize the chat widget window
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
        <div v-if="this.isLoggedIn" v-loading="!this.isConnected" element-loading-text="Awaiting Connection..." class="chat-messages" ref="messages">
          <div v-for="(message, index) in chatMessages" :key="index" :class="['chat-message', message.role]">
            <div v-if="(this.isStreaming)&&(index === this.chatMessages.length -1)">
              <div v-html="renderMarkdown(this.currentMessageSnapshot)"></div>
            </div>
            <div v-else>
              <div v-html="renderMarkdown(message.content)"></div>
            </div>
            <div class="feedback">
              <el-tooltip content="Approve content" effect="light">
                <button class="approve">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-hand-thumbs-up" viewBox="0 0 16 16">
                    <path d="M8.864.046C7.908-.193 7.02.53 6.956 1.466c-.072 1.051-.23 2.016-.428 2.59-.125.36-.479 1.013-1.04 1.639-.557.623-1.282 1.178-2.131 1.41C2.685 7.288 2 7.87 2 8.72v4.001c0 .845.682 1.464 1.448 1.545 1.07.114 1.564.415 2.068.723l.048.03c.272.165.578.348.97.484.397.136.861.217 1.466.217h3.5c.937 0 1.599-.477 1.934-1.064a1.86 1.86 0 0 0 .254-.912c0-.152-.023-.312-.077-.464.201-.263.38-.578.488-.901.11-.33.172-.762.004-1.149.069-.13.12-.269.159-.403.077-.27.113-.568.113-.857 0-.288-.036-.585-.113-.856a2 2 0 0 0-.138-.362 1.9 1.9 0 0 0 .234-1.734c-.206-.592-.682-1.1-1.2-1.272-.847-.282-1.803-.276-2.516-.211a10 10 0 0 0-.443.05 9.4 9.4 0 0 0-.062-4.509A1.38 1.38 0 0 0 9.125.111zM11.5 14.721H8c-.51 0-.863-.069-1.14-.164-.281-.097-.506-.228-.776-.393l-.04-.024c-.555-.339-1.198-.731-2.49-.868-.333-.036-.554-.29-.554-.55V8.72c0-.254.226-.543.62-.65 1.095-.3 1.977-.996 2.614-1.708.635-.71 1.064-1.475 1.238-1.978.243-.7.407-1.768.482-2.85.025-.362.36-.594.667-.518l.262.066c.16.04.258.143.288.255a8.34 8.34 0 0 1-.145 4.725.5.5 0 0 0 .595.644l.003-.001.014-.003.058-.014a9 9 0 0 1 1.036-.157c.663-.06 1.457-.054 2.11.164.175.058.45.3.57.65.107.308.087.67-.266 1.022l-.353.353.353.354c.043.043.105.141.154.315.048.167.075.37.075.581 0 .212-.027.414-.075.582-.05.174-.111.272-.154.315l-.353.353.353.354c.047.047.109.177.005.488a2.2 2.2 0 0 1-.505.805l-.353.353.353.354c.006.005.041.05.041.17a.9.9 0 0 1-.121.416c-.165.288-.503.56-1.066.56z"/>
                  </svg>
                </button>
              </el-tooltip>
              <el-tooltip content="Bad Response" effect="light">
                <button class="bad-response">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-hand-thumbs-down" viewBox="0 0 16 16">
                    <path d="M8.864 15.674c-.956.24-1.843-.484-1.908-1.42-.072-1.05-.23-2.015-.428-2.59-.125-.36-.479-1.012-1.04-1.638-.557-.624-1.282-1.179-2.131-1.41C2.685 8.432 2 7.85 2 7V3c0-.845.682-1.464 1.448-1.546 1.07-.113 1.564-.415 2.068-.723l.048-.029c.272-.166.578-.349.97-.484C6.931.08 7.395 0 8 0h3.5c.937 0 1.599.478 1.934 1.064.164.287.254.607.254.913 0 .152-.023.312-.077.464.201.262.38.577.488.9.11.33.172.762.004 1.15.069.13.12.268.159.403.077.27.113.567.113.856s-.036.586-.113.856c-.035.12-.08.244-.138.363.394.571.418 1.2.234 1.733-.206.592-.682 1.1-1.2 1.272-.847.283-1.803.276-2.516.211a10 10 0 0 1-.443-.05 9.36 9.36 0 0 1-.062 4.51c-.138.508-.55.848-1.012.964zM11.5 1H8c-.51 0-.863.068-1.14.163-.281.097-.506.229-.776.393l-.04.025c-.555.338-1.198.73-2.49.868-.333.035-.554.29-.554.55V7c0 .255.226.543.62.65 1.095.3 1.977.997 2.614 1.709.635.71 1.064 1.475 1.238 1.977.243.7.407 1.768.482 2.85.025.362.36.595.667.518l.262-.065c.16-.04.258-.144.288-.255a8.34 8.34 0 0 0-.145-4.726.5.5 0 0 1 .595-.643h.003l.014.004.058.013a9 9 0 0 0 1.036.157c.663.06 1.457.054 2.11-.163.175-.059.45-.301.57-.651.107-.308.087-.67-.266-1.021L12.793 7l.353-.354c.043-.042.105-.14.154-.315.048-.167.075-.37.075-.581s-.027-.414-.075-.581c-.05-.174-.111-.273-.154-.315l-.353-.354.353-.354c.047-.047.109-.176.005-.488a2.2 2.2 0 0 0-.505-.804l-.353-.354.353-.354c.006-.005.041-.05.041-.17a.9.9 0 0 0-.121-.415C12.4 1.272 12.063 1 11.5 1"/>
                  </svg>
                </button>
              </el-tooltip>
              <el-tooltip content="Regenerate" effect="light">
                <button class="regenerate">
                  <el-icon><Refresh /></el-icon>
                </button>
              </el-tooltip>
              <el-tooltip content="Copy" effect="light">
                <button class="copy">
                  <el-icon><DocumentCopy /></el-icon>
                </button>
              </el-tooltip>
              <div class="detail">
                
              </div>
            </div>
          </div>
          <div v-if="isLoading" class="chat-message assistant typing">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
          
          
        </div>
        <div v-else class="chat-messages">
          <p>Opey is only availabled when logged in. <a v-bind:href="'/api/connect'">Log In</a> </p>
        </div>
        <el-alert
          v-if="this.errorState"
          title="Trouble connecting to Opey"
          type="error"
          :description="this.lastError"
          show-icon
        />
        <div class="chat-input">
          <el-input
            v-model="userInput"
            placeholder="Type your message..."
            @keypress="submitEnter"
            type="textarea"
            :disabled="!isLoggedIn || !this.isConnected ? '' : disabled"
          >
          </el-input>
          <!--<textarea v-model="userInput" placeholder="Type your message..." @keypress="submitEnter"></textarea>-->
          <button 
            @click="sendMessage" 
            :disabled="!isLoggedIn || !this.isConnected ? '' : disabled"
            :style="!isLoggedIn || !this.isConnected ? 'background-color:#929292; cursor:not-allowed' : ''"
          >
          Send
          </button>
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

.el-alert {
  font-family: ui-sans-serif,-apple-system,system-ui,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif,Helvetica,Apple Color Emoji,Arial,Segoe UI Emoji,Segoe UI Symbol;
}

.quit-button-container {
  position: relative;
}

.feedback button {
  background-color: #fff;
  color: #989898;
  border: none;
  font-size: 20px;
}

.feedback .approve:hover {
  color: #72bc39;
}

.feedback .bad-response:hover {
  color: #bc3939;
}

.feedback .regenerate:hover {
  color: #eb9c09;
}

.feedback .copy:hover {
  color: #0991eb;
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
  max-width: 90vw;
  max-height: 90vh;
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

.feedback {
  display:none;
  align-items: end;
}

.chat-message.assistant:hover .feedback {
  display:block;
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