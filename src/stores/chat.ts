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

export const useChatStore = defineStore('chat', {
    state: () => ({
        chatMessages: [] as {role: string; content: string}[],
        isStreaming: false,
        currentMessageSnapshot: "" as string,
        waitingForResponse: false,
    }),
    actions: {
        bindEvents() {
            socket.on("connect", () => {
                console.log("Connected to chatbot");
            })

            socket.on('response stream start', (response) => {
                this.isStreaming = true;
                this.waitingForResponse = true;
                this.chatMessages.push({ role: 'assistant', content: " "})
            });

            socket.on('response stream delta', (response) => {
                this.currentMessageSnapshot += response.assistant;
            });

            socket.on('response stream end', (response) => {
                this.isStreaming = false;
                console.log(this.chatMessages[this.chatMessages.length - 1].content)
                this.chatMessages[this.chatMessages.length - 1].content = this.currentMessageSnapshot
                this.currentMessageSnapshot = ""
                console.log(this.chatMessages)
            });
        }
    }
})