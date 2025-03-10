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

import { defineStore } from "pinia";
import { socket } from "@/socket";

/**
 * Creates a connection store using Pinia's defineStore function.
 * The connection store manages the connection status and provides actions to connect and bind websocket events.
 */
export const useConnectionStore = defineStore("connection", {
  state: () => ({
    isConnected: false,
  }),

  actions: {
    /**
     * Binds events to the socket connection.
     * Updates the `isConnected` state when the socket connects or disconnects.
     */
    bindEvents() {
      socket.on("connect", () => {
        console.log("connectionStore says: websocket connection established")
        this.isConnected = true;
      });

      socket.on("reconnecting", (reconnectionNo) => {
        console.log(`connectionStore says: attempting recconnection... tried ${reconnectionNo} time(s) `)
        this.isConnected = true;
      });

      // Handle errors and disconnections
      socket.on("disconnect", (error) => {
        this.isConnected = false;
        console.error("connectionStore says: socket disconnected", error)
      });
      
      socket.on("connect_timeout", (error) => {
        console.error("connectionStore says: socket connection timeout", error)
      });

      socket.on("connect_error", (error) => {
        console.error("connectionStore says: websocket connection error", error)
      });

      socket.on("connect_failed", (error) => {
        console.error("connectionStore says: websocket connection failed", error)
      });

    },

    /**
     * Connects to the server using the provided token.
     * Sets the `auth` property of the socket and connects to the server.
     * @param token - The authentication token. I.e. a JWT
     */
    connect(token: string) {
      socket.auth = { token };
      console.log("connectionStore says: connecting to websocket")
      try {
        socket.connect();
      } catch (error) { 
        console.error("connectionStore says: error connecting to websocket", error)
      }
      
    }
  },
});