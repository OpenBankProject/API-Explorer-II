<!--
placeholder for Opey II Chat widget
--> 
<script lang="ts">

import { ref, reactive } from 'vue'
import { Close, Top as ElTop } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ChatMessage from './ChatMessage.vue';
import { v4 as uuidv4 } from 'uuid';
import { OpeyStreamContext, OpeyMessage, UserMessage, sendOpeyMessage } from '@/obp/opey-functions';

export default {
    setup () {
        return { 
            Close,
            ElTop
        }
    },
    data() {
        return {
            chatOpen: false,
            thread_id: uuidv4(),
            input: '',
            lastUserMessasgeFailed: false,
            userHasConsented: false,
            opeyContext: reactive({
                currentAssistantMessage: {
                    id: '',
                    role: 'assistant',
                    content: ''
                },
                messages: new Array<OpeyMessage>(),
                status: 'ready'
            } as OpeyStreamContext),
        }
    },
    components: {
        ChatMessage,
    },
    methods: {
        async toggleChat() {
            this.chatOpen = !this.chatOpen
            if (!this.userHasConsented) {
                await this.initiateConsentFlow()
            }
        },
        async initiateConsentFlow() {
            const consentResponse = await fetch('/api/opey/consent/request', {
                method: 'POST',
            })

            if (consentResponse.ok) {
                const consentData = await consentResponse.json()
                if (consentData.success) {
                    this.userHasConsented = true
                    ElMessage.success('Consent granted. You can now chat with Opey.')
                } else {
                    ElMessage.error('Failed to grant consent. Please try again.')
                }
            } else {
                ElMessage.error('Failed to grant consent. Please try again.')
            }
        },
        async onSubmit() {
            // Add user message to the messages array
            const userMessage: UserMessage = {
                id: uuidv4(),
                role: 'user',
                content: this.input,
                isToolCallApproval: false,
            };
            this.opeyContext.messages.push(userMessage);
            
            // Create a placeholder for the assistant's response
            this.opeyContext.currentAssistantMessage = {
                id: uuidv4(),
                role: 'assistant',
                content: ''
            };
            this.opeyContext.messages.push(this.opeyContext.currentAssistantMessage);
            
            // Set status to loading
            this.opeyContext.status = 'loading';
            
            // Clear input field after sending
            this.input = '';
            
            


                
            try {
                await sendOpeyMessage(
                    userMessage,
                    this.thread_id,
                    this.opeyContext
                )
                console.log('Opey Status: ', this.opeyContext.status)
            } catch (error) {
                console.error('Error in chat:', error);
                // on error, remove the assistant message placeholder, as it will be empty.
                this.opeyContext.messages = this.opeyContext.messages.filter(m => m.id !== this.opeyContext.currentAssistantMessage.id);
                this.lastUserMessasgeFailed = true;
                this.opeyContext.messages[this.opeyContext.messages.length - 1].error = "Failed to send message. Please try again.";

            } finally {
                this.opeyContext.status = 'ready';
            }
        },
    },
}

</script>

<template>
    <div v-if="!chatOpen" class="chat-widget-button-container">
        <el-tooltip content="Chat with our AI, Opey" placement="left" effect="light">
            <el-button class="chat-widget-button" type="primary" size="large" @click="toggleChat" circle >
                <img alt="AI Help" src="@/assets/opey-icon-white.png" />
            </el-button>
        </el-tooltip>
    </div>

    <div v-if="chatOpen" class="chat-container">
        <div class="chat-container-inner" id="chat-container">
            <el-container direction="vertical">
                <el-header>
                    <img alt="Opey Logo" src="@/assets/opey-logo-inv.png"> 
                    <el-button type="danger" :icon="Close" @click="toggleChat" size="small" circle></el-button>
                </el-header>
                <el-main>
                    <div class="messages-container">
                        <el-scrollbar>
                            <ChatMessage v-for="message in opeyContext.messages" :key="message.id" :message="message" />
                        </el-scrollbar>
                    </div>
                </el-main>
                <el-footer>
                    <div class="user-input-container">
                        <div class="user-input">
                            <textarea v-model="input" type="textarea" placeholder="Type your message..." :disabled="opeyContext.status !== 'ready'" @keypress.enter="onSubmit" />
                        </div>
                        <el-button type="primary" @click="onSubmit" color="#253047" :icon="ElTop" circle></el-button>
                    </div>
                </el-footer>
            </el-container>
        </div>
    </div>
</template>

<style>


.chat-widget-button-container {
    position: fixed;
    bottom: 20px;
    right: 50px;
    width: 60px;
    height: 60px;
}

.chat-widget-button {
    width: 70px !important;
    height: 70px !important;
}

.chat-widget-button img {
    width: 100%;
    height: 100%;
}

.chat-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 650px;
    height: 625px;
    min-width: 390px;
    min-height: 470px;
    max-height: 90vh;
    max-width: 90vw;
    background-color: tomato;
    resize: both;
    overflow: auto;
    transform: rotate(180deg);
    border-radius: 10px;
    box-shadow: 0 10px 20px 0 rgba(0, 0, 0, 0.2);
}

.chat-header {
    font-family: Roboto-Light, sans-serif;
}

.chat-container .el-header, .chat-container .el-footer, .chat-container .el-main {
    display: flex;
    justify-content: center;
    align-items: center;
}

.chat-container .el-container {
    height: 100%;
}

.chat-container .el-header {
    justify-content: space-between;
}

.chat-container .el-header img {
    height: 70%;
    margin-left: -7px;
}

.chat-container .el-header, .chat-container .el-footer {
    color: #fff;
    background-color: #253047;
}

.chat-container .el-footer {
    height: 150px;
}

.chat-container .el-main {
    background-color:#151d30;
    color: #fff;
}

.chat-container-inner {
    height: 100%;
    transform: rotate(180deg);
}

.messages-container {
    padding-left: 10px;
    padding-right: 10px;
    width: 100%;
    height: 100%;
}

.user-input-container {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: flex-start;
    background-color: #151d30;
    border-radius: 10px;
    padding: 10px;
    width: 70%;
    max-width: 500px;
    height: 70%;
    color: #fff;
}

.user-input-container:hover {
    border: 1px solid #979797;
}

.user-input-container:focus-within {
    border: 1px solid #fff;
}

.user-input {
    width: 100%;
    height: 100%;
    margin-right: 10px;
}

.user-input textarea {
  border-radius: 5px;
  font-size: 14px;
  border: none;
  text-wrap: wrap;
  overflow-x: auto;
  overflow-y: auto;
  background-color: #151d30;
  resize: none;
  height: 100%;
  width: 100%;
  margin-bottom: 0px;
  color: #fff;
}

/* width */
textarea::-webkit-scrollbar {
    width: 7px;
}

/* Track */
textarea::-webkit-scrollbar-track {
    background: none;
    margin-left: 2px;
}

/* Handle */
textarea::-webkit-scrollbar-thumb {
    background: #555;
    width: 7px;
    border-radius: 3.5px;
}

/* Handle on hover */
textarea::-webkit-scrollbar-thumb:hover {
  
  background: #888;
}

.user-input-container textarea:focus {
    border: none;
    outline: 0;
}

.user-input-container button {
    margin-bottom: 0px;
}
</style>