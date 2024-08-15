/*
 * Open Bank Project -  API Explorer II
 * Copyright (C) 2023-2024, TESOBE GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * Email: contact@tesobe.com
 * TESOBE GmbH
 * Osloerstrasse 16/17
 * Berlin 13359, Germany
 *
 *   This product includes software developed at
 *   TESOBE (http://www.tesobe.com/)
 *
 */

import { defineStore } from 'pinia'
import { socket } from '@/socket'

/**
 * Represents a Pinia store for managing chat messages and chatbot responses.
 */
export const useChatStore = defineStore('chat', {
    state: () => ({
        // Messages a list of messages in the OpenAI format
        chatMessages: [] as {role: string; content: string}[],
        // Tells us wether a response from the chatbot is currently being streamed or not
        isStreaming: false,
        // The partial message at a particular moment in time
        currentMessageSnapshot: "" as string,
        lastError: "" as string,
        waitingForResponse: false,
    }),
    actions: {
        bindEvents() {
            // TODO: Maybe we don't need to log this except for DEBUG, keep same for now
            socket.on("connect", () => {
                console.log("Connected to chatbot");
            })

            // When the assistant stream response starts, we set isStreaming to true
            socket.on('response stream start', (response) => {
                this.isStreaming = true;
                this.waitingForResponse = true;
                // We create a temporary blank assistant message for the ChatWidget to render and add text deltas to when they come in
                this.chatMessages.push({ role: 'assistant', content: " "})
            });

            // Text deltas received from the assistant stream (they are like little snippets of the generated response)
            socket.on('response stream delta', (response) => {
                this.currentMessageSnapshot += response.assistant;
            });

            socket.on('error', (error) => {
                this.lastError = error.error;
                console.error(error.error);
            })

            socket.on('response stream end', (response) => {
                this.isStreaming = false;
                this.chatMessages[this.chatMessages.length - 1].content = this.currentMessageSnapshot
                this.currentMessageSnapshot = ""
            });
        }
    }
})