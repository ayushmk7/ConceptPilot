'use client';

import { useEffect, useRef, useState } from 'react';

export interface PresenceUser {
  sessionId: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
}

interface UseCanvasSocketReturn {
  isConnected: boolean;
  users: PresenceUser[];
  sendCursorMove: (x: number, y: number) => void;
  sendNodeLock: (nodeId: string) => void;
  sendNodeUnlock: (nodeId: string) => void;
}

/**
 * Stub hook for multiplayer canvas via WebSocket.
 *
 * The backend does not have a WebSocket endpoint yet.
 * This hook provides the interface so components can be built against it.
 * Once `ws://API_BASE/ws/canvas/{projectId}/{sessionId}` exists,
 * wire up the real connection here.
 */
export function useCanvasSocket(
  _projectId: string,
  _sessionId: string | null,
): UseCanvasSocketReturn {
  const [isConnected] = useState(false);
  const [users] = useState<PresenceUser[]>([]);

  // TODO: implement WebSocket connection when backend supports it
  // const ws = useRef<WebSocket | null>(null);
  // useEffect(() => {
  //   if (!_sessionId) return;
  //   const url = `${process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws')}/ws/canvas/${_projectId}/${_sessionId}`;
  //   ws.current = new WebSocket(url);
  //   ws.current.onopen = () => setIsConnected(true);
  //   ws.current.onclose = () => setIsConnected(false);
  //   return () => ws.current?.close();
  // }, [_projectId, _sessionId]);

  const sendCursorMove = (_x: number, _y: number) => {
    // no-op until backend exists
  };

  const sendNodeLock = (_nodeId: string) => {
    // no-op until backend exists
  };

  const sendNodeUnlock = (_nodeId: string) => {
    // no-op until backend exists
  };

  return { isConnected, users, sendCursorMove, sendNodeLock, sendNodeUnlock };
}
