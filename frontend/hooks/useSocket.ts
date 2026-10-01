'use client';

import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthProvider';
import { useProfile } from '@/context/ProfileProvider';
import { connectSocket, disconnectSocket } from '@/lib/socket';

/**
 * Opens the shared socket while a profile is active, and closes it otherwise.
 *
 * Gated on *both* auth and profile because the server's handshake requires both
 * tokens — connecting before a profile is selected only produces a rejected
 * handshake and a reconnect loop.
 *
 * The socket lives in state rather than a ref because it is rendered *with*:
 * consumers pass it to `useSocketEvent`, and a ref read during render would not
 * re-run them when the connection is replaced.
 */
export function useSocket(): { socket: Socket | null; isConnected: boolean } {
  const { isAuthenticated } = useAuth();
  const { activeProfile } = useProfile();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const profileId = activeProfile?.id;

  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated || !profileId) {
      disconnectSocket();
      // Deferred rather than set inline: a synchronous state write in an effect
      // body cascades an extra render before the browser paints.
      queueMicrotask(() => {
        if (cancelled) return;
        setSocket(null);
        setIsConnected(false);
      });
      return () => {
        cancelled = true;
      };
    }

    const instance = connectSocket();
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    instance.on('connect', onConnect);
    instance.on('disconnect', onDisconnect);

    queueMicrotask(() => {
      if (cancelled) return;
      setSocket(instance);
      setIsConnected(instance.connected);
    });

    return () => {
      cancelled = true;
      instance.off('connect', onConnect);
      instance.off('disconnect', onDisconnect);
    };
    // Re-running on profile change is deliberate: the handshake carries the
    // profile grant, so switching profiles must re-authenticate the socket.
  }, [isAuthenticated, profileId]);

  return { socket, isConnected };
}

/**
 * Subscribes to one socket event for the lifetime of a component.
 *
 * The handler is held in a ref so a re-render does not detach and reattach the
 * listener — which would drop any event that arrived in between.
 */
export function useSocketEvent<T>(
  socket: Socket | null,
  event: string,
  handler: (payload: T) => void,
): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!socket) return;

    const listener = (payload: T) => handlerRef.current(payload);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [socket, event]);
}
