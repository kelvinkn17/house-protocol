// singleton WebSocket connection to game backend
// not a react context, just a module level instance

type MessageHandler = (payload: unknown) => void

const API_BASE = typeof window !== 'undefined'
  ? (import.meta.env.VITE_API_URL || 'http://localhost:3700')
  : 'http://localhost:3700'

// http -> ws, https -> wss
const WS_BASE = API_BASE.replace(/^http/, 'ws')

let ws: WebSocket | null = null
let playerAddress: string | null = null
const subscribers = new Map<string, Set<MessageHandler>>()
let reconnectAttempts = 0
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let pingInterval: ReturnType<typeof setInterval> | null = null

function getWsUrl(address: string): string {
  return `${WS_BASE}/ws/game?address=${encodeURIComponent(address)}`
}

function handleMessage(event: MessageEvent) {
  try {
    const { type, payload } = JSON.parse(event.data)
    const handlers = subscribers.get(type)
    if (handlers) {
      handlers.forEach(h => h(payload))
    }
  } catch {
    // ignore malformed messages
  }
}

function startPing() {
  stopPing()
  pingInterval = setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping', payload: {} }))
    }
  }, 30000)
}

function stopPing() {
  if (pingInterval) {
    clearInterval(pingInterval)
    pingInterval = null
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return
  if (!playerAddress) return

  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000)
  reconnectAttempts++

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    if (playerAddress) {
      connect(playerAddress)
    }
  }, delay)
}

export function connect(address: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // if already connected with same address, skip
    if (ws?.readyState === WebSocket.OPEN && playerAddress === address) {
      resolve()
      return
    }

    // close existing
    disconnect()
    playerAddress = address
    reconnectAttempts = 0

    ws = new WebSocket(getWsUrl(address))

    ws.onopen = () => {
      console.log('[ws] connected')
      reconnectAttempts = 0
      startPing()
      resolve()
    }

    ws.onmessage = handleMessage

    ws.onclose = () => {
      console.log('[ws] disconnected')
      stopPing()
      scheduleReconnect()
    }

    ws.onerror = (err) => {
      console.error('[ws] error', err)
      reject(err)
    }
  })
}

export function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  stopPing()
  if (ws) {
    ws.onclose = null // prevent reconnect
    ws.close()
    ws = null
  }
  playerAddress = null
}

export function send(type: string, payload: unknown) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('[ws] not connected, dropping message:', type)
    return
  }
  ws.send(JSON.stringify({ type, payload }))
}

// subscribe to a message type, returns unsubscribe function
export function subscribe(type: string, handler: MessageHandler): () => void {
  if (!subscribers.has(type)) {
    subscribers.set(type, new Set())
  }
  subscribers.get(type)!.add(handler)

  return () => {
    const handlers = subscribers.get(type)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) subscribers.delete(type)
    }
  }
}

// wait for a specific message type (one-shot)
export function waitFor<T = unknown>(type: string, timeout = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsub()
      reject(new Error(`Timeout waiting for ${type}`))
    }, timeout)

    const unsub = subscribe(type, (payload) => {
      clearTimeout(timer)
      unsub()
      resolve(payload as T)
    })
  })
}

export function isConnected(): boolean {
  return ws?.readyState === WebSocket.OPEN
}

export const GameSocket = {
  connect,
  disconnect,
  send,
  subscribe,
  waitFor,
  isConnected,
}
