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
  
  export default {
    data() {
      return {
        isOpen: false,
        userInput: '',
        messages: []
      };
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
  
          // Send the user message to the backend and get the response
          const response = await fetch('http://localhost:5000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: newMessage.content })
          });

          console.log('Response status:', response.status);
          console.log('Response headers:', response.headers);

          const data = await response.json();
          this.messages.push({ role: 'assistant', content: data.reply });
  
          this.$nextTick(() => {
            this.scrollToBottom();
          });
        }
      },
      highlightCode(content) {
        return Prism.highlight(content, Prism.languages.markup, 'markup');
      },
      renderMarkdown(content) {
        const markdown = new MarkdownIt();
        return markdown.render(content);    
      },
      scrollToBottom() {
        const messages = this.$refs.messages;
        messages.scrollTop = messages.scrollHeight;
      },
      initResize(event) {
        console.log("resizing")
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
      }
    }
  };
</script>

<template>
    <div>
      <div class="chat-button" @click="toggleChat">
        <img alt="AI Help" v-show="!logo" src="@/assets/chatbot.png" />
      </div>
      <div v-if="isOpen" class="chat-container" ref="chatContainer">
        <div class="resizer" @mousedown="initResize"></div>
        <div class="chat-header">
          <span>Chat with us</span>
          <button @click="toggleChat">X</button>
        </div>
        <div class="chat-messages" ref="messages">
          <div v-for="(message, index) in messages" :key="index" :class="['chat-message', message.role]">
            <div v-html="renderMarkdown(message.content)"></div>
          </div>
        </div>
        <div class="chat-input">
          <textarea v-model="userInput" placeholder="Type your message..."></textarea>
          <button @click="sendMessage">Send</button>
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
  width: 300px;
  height: 400px;
  border: 1px solid #ccc;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  display: flex;
  flex-direction: column;
  z-index: 1000;
  overflow: hidden;
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

.chat-input {
  display: flex;
  padding: 10px;
  border-top: 1px solid #ccc;
  background-color: #fff;
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
  width: 15px;
  height: 15px;
  background: #ccc;
  position: absolute;
  left: 0;
  top: 0;
  cursor: nwse-resize;
  z-index: 1001;
}
</style>