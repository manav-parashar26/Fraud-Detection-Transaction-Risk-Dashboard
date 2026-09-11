import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Support explicit VITE_SOCKET_URL or VITE_WS_URL, fallback to stripped API_BASE
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_WS_URL ||
  API_BASE.replace(/\/api\/?$/, '');

class SocketService {
  constructor() {
    this.socket = null;
    this.statusListeners = new Set();
    this.connected = false;
  }

  connect() {
    if (this.socket) {
      if (!this.socket.connected) {
        this.socket.connect();
      }
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this.notifyStatus(true);
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      this.notifyStatus(false);
    });

    this.socket.on('connect_error', () => {
      this.connected = false;
      this.notifyStatus(false);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.notifyStatus(false);
    }
  }

  isConnected() {
    return this.connected && Boolean(this.socket && this.socket.connected);
  }

  on(event, callback) {
    if (!this.socket) this.connect();
    this.socket.on(event, callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  onConnectionChange(callback) {
    this.statusListeners.add(callback);
    callback(this.isConnected());
    return () => this.statusListeners.delete(callback);
  }

  notifyStatus(status) {
    for (const listener of this.statusListeners) {
      try {
        listener(status);
      } catch (err) {
        console.error('[Socket Status Listener Error]', err);
      }
    }
  }
}

export const socketService = new SocketService();
export default socketService;
