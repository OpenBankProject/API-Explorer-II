import { reactive } from "vue";
import { io } from "socket.io-client";
import axios from 'axios';

import { getOpeyJWT } from './obp/common-functions'

export const state = reactive({
  connected: false,
});

// "undefined" means the URL will be computed from the `window.location` object
const URL = import.meta.env.VITE_CHATBOT_URL

export const socket = io(
  URL,
  {
    extraHeaders: {
      Authorization: `Bearer ${getOpeyJWT()}`
    }
  }
);

socket.on("connect", () => {
  console.log("Websocket connection established");
  state.connected = true;
});

socket.on('open', () => {
  console.log('WebSocket connection established, authenticating...');
});

socket.on("disconnect", () => {
  state.connected = false;
});

socket.on("message", (message) => {
  console.log(message);
});