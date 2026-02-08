// singleton WebSocket connection to game backend
// not a react context, just a module level instance

type MessageHandler = (payload: unknown) => void

let wsBaseUrl: string | null = null
let apiKey: string | undefined

let ws: WebSocket | null = null
let playerAddress: string | null = null
const subscribers = new Map<string, Set<MessageHandler>>()
let reconnectAttempts = 0
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let pingInterval: ReturnType<typeof setInterval> | null = null
let connecting = false

function getWsUrl(address: string): string {
  if (!wsBaseUrl) throw new Error('GameSocket not configured, call configure() first')
  const url = new URL(`${wsBaseUrl}/ws/game`)
  url.searchParams.set('address', address)
  if (apiKey) url.searchParams.set('apiKey', apiKey)
  return url.toString()
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
      connect(playerAddress).catch(() => {
        // reconnect will be scheduled again by onclose
      })
    }
  }, delay)
}

// set the backend URL before connecting. call this once on init.
// apiUrl should be http(s), gets converted to ws(s) automatically.
export function configure(apiUrl: string, key?: string) {
  wsBaseUrl = apiUrl.replace(/^http/, 'ws')
  apiKey = key
}

export function connect(address: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws?.readyState === WebSocket.OPEN && playerAddress === address) {
      resolve()
      return
    }

    if (connecting) {
      resolve()
      return
    }

    disconnect()
    playerAddress = address
    reconnectAttempts = 0
    connecting = true

    const socket = new WebSocket(getWsUrl(address))
    ws = socket

    let settled = false

    socket.onopen = () => {
      console.log('[ws] connected')
      connecting = false
      reconnectAttempts = 0
      startPing()
      if (!settled) {
        settled = true
        resolve()
      }
    }

    socket.onmessage = handleMessage

    socket.onclose = () => {
      console.log('[ws] disconnected')
      connecting = false
      stopPing()
      if (!settled) {
        settled = true
        reject(new Error('WebSocket connection failed'))
      }
      if (playerAddress) {
        scheduleReconnect()
      }
    }

    socket.onerror = (err) => {
      console.error('[ws] error', err)
    }
  })
}

export function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  stopPing()
  connecting = false
  if (ws) {
    ws.onclose = null
    ws.onerror = null
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

export function waitForOrError<T = unknown>(type: string, timeout = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error(`Timeout waiting for ${type}`))
    }, timeout)

    function cleanup() {
      clearTimeout(timer)
      typeUnsub()
      errorUnsub()
    }

    const typeUnsub = subscribe(type, (payload) => {
      cleanup()
      resolve(payload as T)
    })

    const errorUnsub = subscribe('error', (payload) => {
      cleanup()
      const p = payload as { error: string; code?: string }
      reject(new Error(p.error))
    })
  })
}

export function isConnected(): boolean {
  return ws?.readyState === WebSocket.OPEN
}

export const GameSocket = {
  configure,
  connect,
  disconnect,
  send,
  subscribe,
  waitFor,
  waitForOrError,
  isConnected,
}
