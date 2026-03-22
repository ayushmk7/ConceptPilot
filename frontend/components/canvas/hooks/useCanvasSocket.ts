'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from '@/lib/api';
import type { InfCanvasNode, InfCanvasEdge, InfCanvasMessage } from '@/lib/canvas-api';

/* ── Presence ───────────────────────────────────────────────────────── */

export interface PresenceUser {
  sessionId: string;
  name: string;
  color: string;
}

const PRESENCE_COLORS = [
  '#3B82F6', '#16A34A', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#EC4899', '#F97316',
];

/** Deterministic color from a session ID string. */
function colorForSession(sessionId: string): string {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = (hash * 31 + sessionId.charCodeAt(i)) >>> 0;
  }
  return PRESENCE_COLORS[hash % PRESENCE_COLORS.length];
}

/* ── Server → Client event shapes ──────────────────────────────────── */

interface WSNodeCreated    { type: 'node_created';    node: InfCanvasNode }
interface WSNodeMoved      { type: 'node_moved';      node_id: string; x: number; y: number }
interface WSNodeCollapsed  { type: 'node_collapsed';  node_id: string; is_collapsed: boolean }
interface WSNodeDeleted    { type: 'node_deleted';    node_id: string }
interface WSNodeLocked     { type: 'node_locked';     node_id: string; session_id: string; display_name: string }
interface WSNodeUnlocked   { type: 'node_unlocked';   node_id: string }
interface WSEdgeCreated    { type: 'edge_created';    edge: InfCanvasEdge }
interface WSEdgeDeleted    { type: 'edge_deleted';    edge_id: string }
interface WSMessageComplete { type: 'message_complete'; node_id: string; message: InfCanvasMessage }
interface WSSessionJoined  { type: 'session_joined';    session_id: string; display_name: string }
interface WSSessionLeft    { type: 'session_left';      session_id: string }
interface WSNodeSkillChanged { type: 'node_skill_changed'; node_id: string; skill: string }

type WSEvent =
  | WSNodeCreated | WSNodeMoved | WSNodeCollapsed | WSNodeDeleted
  | WSNodeLocked  | WSNodeUnlocked
  | WSEdgeCreated | WSEdgeDeleted
  | WSMessageComplete
  | WSSessionJoined | WSSessionLeft
  | WSNodeSkillChanged;

/* ── Options ────────────────────────────────────────────────────────── */

export interface UseCanvasSocketOptions {
  /** Called when another client creates a node (broadcast from REST POST). */
  onNodeCreated?: (node: InfCanvasNode) => void;
  /** Called when another client moves a node. */
  onNodeMoved?: (nodeId: string, x: number, y: number) => void;
  /** Called when a node is collapsed or expanded remotely. */
  onNodeCollapsed?: (nodeId: string, isCollapsed: boolean) => void;
  /** Called when a node is deleted remotely. */
  onNodeDeleted?: (nodeId: string) => void;
  /** Called when another client acquires an edit lock on a node. */
  onNodeLocked?: (nodeId: string, sessionId: string, displayName: string) => void;
  /** Called when a node lock is released. */
  onNodeUnlocked?: (nodeId: string) => void;
  /** Called when another client creates an edge. */
  onEdgeCreated?: (edge: InfCanvasEdge) => void;
  /** Called when an edge is deleted remotely. */
  onEdgeDeleted?: (edgeId: string) => void;
  /** Called when a backend-streaming message is finalised on another node. */
  onMessageComplete?: (nodeId: string, message: InfCanvasMessage) => void;
  /** Called when another client changes a node's skill. */
  onNodeSkillChanged?: (nodeId: string, skill: string) => void;
}

/* ── Return ─────────────────────────────────────────────────────────── */

interface UseCanvasSocketReturn {
  isConnected: boolean;
  users: PresenceUser[];
  sendNodeMoved: (nodeId: string, x: number, y: number) => void;
  sendNodeLock: (nodeId: string) => void;
  sendNodeUnlock: (nodeId: string) => void;
}

/* ── Constants ──────────────────────────────────────────────────────── */

const MAX_RECONNECT_ATTEMPTS = 6;
const BASE_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;

/** Convert an HTTP(S) base URL to its WS(S) equivalent. */
function toWsUrl(apiBase: string, projectId: string, sessionId: string): string {
  const wsBase = apiBase.replace(/^https/, 'wss').replace(/^http/, 'ws');
  return `${wsBase}/ws/canvas/${encodeURIComponent(projectId)}/${encodeURIComponent(sessionId)}`;
}

/* ── Hook ───────────────────────────────────────────────────────────── */

/**
 * Manages the multiplayer WebSocket connection for a canvas project.
 *
 * Reconnects automatically with exponential backoff on unexpected disconnects.
 * All server→client events are dispatched via callbacks in `options`.
 * The canvas page wires these callbacks in (Task 7).
 */
export function useCanvasSocket(
  projectId: string,
  sessionId: string | null,
  options?: UseCanvasSocketOptions,
): UseCanvasSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<PresenceUser[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track intentional closes so we don't reconnect after unmount.
  const intentionalCloseRef = useRef(false);

  // Store callbacks in refs so changing them never triggers a reconnect.
  // Assigned synchronously in render (not in useEffect) so the ref is always
  // current before any async WebSocket message fires.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const connect = useCallback(() => {
    if (!sessionId) return;

    intentionalCloseRef.current = false;
    const url = toWsUrl(API_BASE, projectId, sessionId);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectCountRef.current = 0;
    };

    ws.onmessage = (event: MessageEvent) => {
      let parsed: WSEvent;
      try {
        parsed = JSON.parse(event.data as string) as WSEvent;
      } catch {
        return; // ignore malformed frames
      }

      const cb = optionsRef.current;

      switch (parsed.type) {
        case 'node_created':
          cb?.onNodeCreated?.(parsed.node);
          break;

        case 'node_moved':
          cb?.onNodeMoved?.(parsed.node_id, parsed.x, parsed.y);
          break;

        case 'node_collapsed':
          cb?.onNodeCollapsed?.(parsed.node_id, parsed.is_collapsed);
          break;

        case 'node_deleted':
          cb?.onNodeDeleted?.(parsed.node_id);
          break;

        case 'node_locked':
          cb?.onNodeLocked?.(parsed.node_id, parsed.session_id, parsed.display_name);
          break;

        case 'node_unlocked':
          cb?.onNodeUnlocked?.(parsed.node_id);
          break;

        case 'edge_created':
          cb?.onEdgeCreated?.(parsed.edge);
          break;

        case 'edge_deleted':
          cb?.onEdgeDeleted?.(parsed.edge_id);
          break;

        case 'message_complete':
          cb?.onMessageComplete?.(parsed.node_id, parsed.message);
          break;

        case 'node_skill_changed':
          cb?.onNodeSkillChanged?.(parsed.node_id, parsed.skill);
          break;

        case 'session_joined':
          setUsers((prev) => {
            if (prev.some((u) => u.sessionId === parsed.session_id)) return prev;
            return [
              ...prev,
              {
                sessionId: parsed.session_id,
                name: parsed.display_name,
                color: colorForSession(parsed.session_id),
              },
            ];
          });
          break;

        case 'session_left':
          setUsers((prev) => prev.filter((u) => u.sessionId !== parsed.session_id));
          break;
      }
    };

    ws.onerror = () => {
      // onclose fires right after onerror — handle reconnect there.
    };

    ws.onclose = (event: CloseEvent) => {
      setIsConnected(false);
      setUsers([]);
      wsRef.current = null;

      if (intentionalCloseRef.current) return;
      // Code 1000 = normal closure (server-initiated clean shutdown).
      if (event.code === 1000) return;

      if (reconnectCountRef.current >= MAX_RECONNECT_ATTEMPTS) return;

      const delay = Math.min(
        BASE_RECONNECT_MS * 2 ** reconnectCountRef.current,
        MAX_RECONNECT_MS,
      );
      reconnectCountRef.current += 1;
      reconnectTimerRef.current = setTimeout(connect, delay);
    };
  }, [projectId, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    connect();

    return () => {
      intentionalCloseRef.current = true;
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      wsRef.current?.close(1000, 'component unmount');
      wsRef.current = null;
      reconnectCountRef.current = 0;
    };
  }, [projectId, sessionId, connect]);

  /* ── Client → Server senders ──────────────────────────────────────── */

  const sendNodeMoved = useCallback((nodeId: string, x: number, y: number) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'node_moved', node_id: nodeId, x, y }));
  }, []);

  const sendNodeLock = useCallback((nodeId: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'lock_request', node_id: nodeId }));
  }, []);

  const sendNodeUnlock = useCallback((nodeId: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'lock_release', node_id: nodeId }));
  }, []);

  return { isConnected, users, sendNodeMoved, sendNodeLock, sendNodeUnlock };
}
