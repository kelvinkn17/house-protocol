export type ConnectionStatus = "connecting" | "connected" | "disconnected";

// response format: { res: [REQUEST_ID, "METHOD_NAME", {result_data}, TIMESTAMP], sig: ["..."] }
interface RawResponse {
  res: [number, string, unknown, number];
  sig: string[];
}

type MessageHandler = (data: unknown) => void;

let requestIdCounter = 1;
function generateRequestId(): number {
  return requestIdCounter++;
}

function getCurrentTimestamp(): number {
  return Date.now();
}

function buildRpcMessage(
  method: string,
  params: Record<string, unknown> = {}
): string {
  const requestId = generateRequestId();
  const timestamp = getCurrentTimestamp();
  return JSON.stringify({
    req: [requestId, method, params, timestamp],
  });
}

class ClearnodeClient {
  private ws: WebSocket | null = null;
  private url: string;
  private pendingRequests: Map<number, (data: unknown) => void> = new Map();
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _status: ConnectionStatus = "disconnected";

  constructor(url: string) {
    this.url = url;
  }

  get status() {
    return this._status;
  }

  private setStatus(status: ConnectionStatus) {
    this._status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  onStatusChange(listener: (status: ConnectionStatus) => void) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.setStatus("connecting");

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log("[clearnode] connected");
        this.setStatus("connected");
      };

      this.ws.onclose = () => {
        console.log("[clearnode] disconnected");
        this.setStatus("disconnected");
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error("[clearnode] error:", err);
      };

      this.ws.onmessage = (event) => {
        try {
          const raw: RawResponse = JSON.parse(event.data);
          const [requestId, , result] = raw.res;

          const handler = this.pendingRequests.get(requestId);
          if (handler) {
            handler(result);
            this.pendingRequests.delete(requestId);
          }
        } catch (e) {
          console.error("[clearnode] parse error:", e);
        }
      };
    } catch (e) {
      console.error("[clearnode] connection error:", e);
      this.setStatus("disconnected");
      this.scheduleReconnect();
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  private send<T>(message: string): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket not connected"));
        return;
      }

      const parsed = JSON.parse(message);
      const requestId = parsed.req[0] as number;

      this.pendingRequests.set(requestId, resolve as MessageHandler);
      this.ws.send(message);

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error("Request timeout"));
        }
      }, 10000);
    });
  }

  async ping() {
    const msg = buildRpcMessage("ping");
    return this.send(msg);
  }

  // API returns snake_case, we keep it as is
  async getConfig() {
    const msg = buildRpcMessage("get_config");
    return this.send<{
      broker_address: string;
      networks: Array<{
        chain_id: number;
        name: string;
        custody_address: string;
        adjudicator_address: string;
      }>;
    }>(msg);
  }

  async getChannels(participant?: string, status?: "open" | "closed") {
    const params: Record<string, unknown> = {};
    if (participant) params.participant = participant;
    if (status) params.status = status;

    const msg = buildRpcMessage("get_channels", params);
    return this.send<{
      channels: Array<{
        channel_id: string;
        participant: string;
        wallet: string;
        status: string;
        token: string;
        amount: string;
        chain_id: number;
        adjudicator: string;
        challenge: number;
        nonce: number;
        version: number;
        created_at: string;
        updated_at: string;
      }>;
      metadata?: {
        page: number;
        per_page: number;
        total_count: number;
        page_count: number;
      };
    }>(msg);
  }

  async getAppSessions(participant?: string) {
    const params: Record<string, unknown> = {};
    if (participant) params.participant = participant;

    const msg = buildRpcMessage("get_app_sessions", params);
    return this.send<{
      app_sessions: Array<{
        app_session_id: string;
        application: string;
        status: string;
        participants: string[];
        protocol: string;
        challenge: number;
        weights: number[];
        quorum: number;
        version: number;
        nonce: number;
        created_at: string;
        updated_at: string;
        session_data?: string;
      }>;
    }>(msg);
  }

  async getAssets(chainId?: number) {
    const params: Record<string, unknown> = {};
    if (chainId) params.chain_id = chainId;

    const msg = buildRpcMessage("get_assets", params);
    return this.send<{
      assets: Array<{
        token: string;
        chain_id: number;
        symbol: string;
        decimals: number;
      }>;
    }>(msg);
  }
}

const clearnodeUrl =
  import.meta.env.VITE_CLEARNODE_URL || "ws://localhost:4242";
export const clearnode = new ClearnodeClient(clearnodeUrl);
