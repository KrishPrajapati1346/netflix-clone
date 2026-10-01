'use client';

import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL, getAccessToken, getProfileGrant } from './api-client';

/**
 * The single Socket.IO connection for the app.
 *
 * One shared socket rather than one per feature: the server addresses a profile
 * by room, so notifications, presence and party events all arrive on the same
 * pipe. Opening a second connection would double the handshakes and make
 * "am I online?" ambiguous.
 *
 * Credentials are read at connect time rather than captured once, so a
 * reconnect after a token refresh presents the *current* token instead of the
 * expired one it was created with.
 */
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  socket = io(API_BASE_URL, {
    autoConnect: false,
    withCredentials: true,
    // Polling first, then upgrade. Starting on websocket alone fails behind
    // proxies that do not pass the upgrade through, and the fallback is what
    // keeps this working on free-tier hosting.
    transports: ['polling', 'websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    auth: (callback) => {
      callback({ token: getAccessToken(), profileToken: getProfileGrant() });
    },
  });

  return socket;
}

export function connectSocket(): Socket {
  const instance = getSocket();
  if (!instance.connected) instance.connect();
  return instance;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
