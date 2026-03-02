<!--
placeholder for Opey II Chat widget
-->
<script lang="ts">

import { ref, reactive, computed } from 'vue'
import { Close, Top as ElTop, WarnTriangleFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ChatMessage from './ChatMessage.vue';
import { v4 as uuidv4 } from 'uuid';
import { OpeyMessage, UserMessage } from '@/models/MessageModel';
import { getCurrentUser } from '@/obp';
import { useChat } from '@/stores/chat';
import { useRoute } from 'vue-router'

export default {
    setup () {
        const route = useRoute()
        const getLoginUrl = computed(() => {
            const currentPath = route.path
            const queryString = new URLSearchParams(route.query as Record<string, string>).toString()
            const fullPath = queryString ? `${currentPath}?${queryString}` : currentPath
            return `/api/oauth2/connect?redirect=${encodeURIComponent(fullPath)}`
        })

        return {
            Close,
            ElTop,
            WarnTriangleFilled,
            getLoginUrl,
        }
    },
    data() {
        return {
            chatOpen: false,
            input: '',
            lastUserMessasgeFailed: false,
            errorState: <{ type?: "authenticationError", message?: string, icon?: any }> {}, // add types of error as needed
            chat: useChat(),
        }
    },
    components: {
        ChatMessage,
    },
    async mounted() {
        this.chat = useChat()
        const isLoggedIn = await this.checkLoginStatus()
        console.log('Is logged in: ', isLoggedIn)

    },
    methods: {
        async toggleChat() {
            this.chatOpen = !this.chatOpen
        },
        async checkLoginStatus(): Promise<boolean> {
            const currentUser = await getCurrentUser()
            const currentResponseKeys = Object.keys(currentUser)
            if (currentResponseKeys.includes('username')) {
                if (!this.chat.userIsAuthenticated) {
                    try {
                        await this.chat.handleAuthentication()
                    } catch (error) {
                        console.error('Error in chat:', error);
                        this.errorState.type = "authenticationError"
                        this.errorState.message = "Woops! Looks like we are having trouble connecting to Opey..."
                        this.errorState.icon = WarnTriangleFilled
                    }

                }
                return true
            } else {
                return false
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

            // Set status to loading // Clear input field after sending
            this.chat.status = 'loading';
            this.input = '';

            try {
                await this.chat.stream({
                    message: userMessage,
                }

                )
                console.log('Opey Status: ', this.chat.status)
            } catch (error) {
                console.error('Error in chat:', error);
                // on error, remove the assistant message placeholder, as it will be empty.
                this.chat.removeMessage(this.chat.currentAssistantMessage.id);
                this.lastUserMessasgeFailed = true;
                this.chat.messages[this.chat.messages.length - 1].error = "Failed to send message. Please try again.";

            } finally {
                this.chat.status = 'ready';
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

                    <div v-if="errorState.type === 'authenticationError'" class="login-container">
                        <el-icon :size="40" color="#FF4D4F">
                            <component :is="errorState.icon" />
                        </el-icon>
                        <p class="login-message" size="large">{{ errorState.message }}</p>
                    </div>
                    <div v-else-if="!chat.userIsAuthenticated" class="login-container">
                        <p class="login-message" size="large">Opey is only available once logged on.</p>
                        <a :href="getLoginUrl" class="login-button router-link">Log on</a>
                    </div>
                    <div v-else class="messages-container" v-bind:class="{ disabled: !chat.userIsAuthenticated }">
                        <el-scrollbar>
                            <ChatMessage v-for="message in chat.messages" :key="message.id" :message="message" :loading="message.loading" />
                        </el-scrollbar>
                    </div>
                </el-main>
                <el-footer v-bind:class="{ disabled: !chat.userIsAuthenticated }">
                    <div class="user-input-container">
                        <div class="user-input">
                            <textarea v-model="input" type="textarea" placeholder="Type your message..." :disabled="(chat.status !== 'ready') || (!chat.userIsAuthenticated)" @keypress.enter="onSubmit" />
                        </div>
                        <el-button type="primary" name="send" @click="onSubmit" color="#253047" :icon="ElTop" circle></el-button>
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
    background-color: #151d30;
    resize: both;
    overflow: auto;
    transform: rotate(180deg);
    border-radius: 10px;
    box-shadow: 0 10px 20px 0 rgba(0, 0, 0, 0.2);
}

.login-container {
    display: flex;
    justify-content: center;
    flex-direction: column;
    align-items: center;
    height: 100%;
    margin:auto;
    width: 100%;
}

.login-message {
    color: #fff;
    font-family: 'Courier New', Courier, monospace;
    font-size: large;
    font-weight: bold;
    margin-left: 100px;
    margin-right: 100px;
}

.chat-header {
    font-family: Roboto-Light, sans-serif;
}

.chat-container .el-header, .chat-container .el-footer, .chat-container .el-main {
    display: flex;
    justify-content: center;
    align-items: center;
}

.disabled {
    pointer-events: none;
    cursor: not-allowed;
    filter: blur(2px);
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
