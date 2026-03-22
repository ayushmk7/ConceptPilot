/**
 * WebSocket Multiplayer Service
 *
 * Manages real-time connections for collaborative canvas/room features.
 * Presence is empty until a real WebSocket server is wired; the public API
 * remains stable for future integration.
 */

import type { MultiplayerUser, MultiplayerEvent } from './types';

type EventHandler = (event: MultiplayerEvent) => void;

class MultiplayerService {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private _connected = false;
  private _roomId: string | null = null;
  private _users: MultiplayerUser[] = [];
  private _lockHolder: string | null = null;

  get connected() {
    return this._connected;
  }
  get roomId() {
    return this._roomId;
  }
  get users() {
    return this._users;
  }
  get lockHolder() {
    return this._lockHolder;
  }

  connect(roomId: string, _userId: string): void {
    this._roomId = roomId;
    this._connected = true;
    this._users = [];
  }

  disconnect(): void {
    this._connected = false;
    this._roomId = null;
    this._users = [];
    this._lockHolder = null;
  }

  on(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) this.handlers.set(eventType, new Set());
    this.handlers.get(eventType)!.add(handler);
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  private emit(eventType: string, event: MultiplayerEvent): void {
    this.handlers.get(eventType)?.forEach((h) => h(event));
    this.handlers.get('*')?.forEach((h) => h(event));
  }

  acquireLock(nodeId: string, userId: string): boolean {
    if (this._lockHolder && this._lockHolder !== userId) return false;
    this._lockHolder = userId;
    this.emit('lock_acquired', {
      type: 'lock_acquired',
      userId,
      payload: { nodeId },
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  releaseLock(userId: string): void {
    if (this._lockHolder === userId) {
      this._lockHolder = null;
      this.emit('lock_released', {
        type: 'lock_released',
        userId,
        payload: {},
        timestamp: new Date().toISOString(),
      });
    }
  }

  broadcastNodeUpdate(nodeId: string, data: Record<string, unknown>): void {
    this.emit('node_update', {
      type: 'node_update',
      userId: '',
      payload: { nodeId, ...data },
      timestamp: new Date().toISOString(),
    });
  }

  broadcastCursorMove(userId: string, x: number, y: number): void {
    this.emit('cursor_move', {
      type: 'cursor_move',
      userId,
      payload: { x, y },
      timestamp: new Date().toISOString(),
    });
  }
}

export const multiplayer = new MultiplayerService();
