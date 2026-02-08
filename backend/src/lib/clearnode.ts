// backend clearnode WS client, authenticated as broker
// handles app session close on behalf of the backend (player can't sign close after disconnect)
// pattern follows explorations/yellow-test/src/full-flow.ts

import WebSocket from 'ws';
import {
  createECDSAMessageSigner,
  createAuthRequestMessage,
  createAuthVerifyMessageFromChallenge,
  createEIP712AuthMessageSigner,
  createCloseAppSessionMessage,
  createAppSessionMessage,
} from '@erc7824/nitrolite';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import type { Hex, Address } from 'viem';
import { OPERATOR_PRIVATE_KEY, SEPOLIA_RPC_URL } from '../config/main-config.ts';

const CLEARNODE_URL = process.env.CLEARNODE_URL || 'wss://nitrolite.kwek.dev/ws';
const ASSET_SYMBOL = 'usdh';
const APP_NAME = 'the-house-protocol';

let ws: WebSocket | null = null;
let authenticated = false;
let connecting = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;

// broker session key, generated once at startup (used for auth + close operations)
const brokerSessionKey = generatePrivateKey();
const brokerSessionAccount = privateKeyToAccount(brokerSessionKey);
const brokerSessionSigner = createECDSAMessageSigner(brokerSessionKey);

// direct signer using broker's actual private key (used for create_app_session signatures)
// clearnode verifies create_app_session sigs against participant addresses directly,
// so we sign with the real key, not the session key
const brokerDirectSigner = createECDSAMessageSigner(OPERATOR_PRIVATE_KEY as Hex);

// broker wallet for EIP-712 auth signing
const brokerAccount = privateKeyToAccount(OPERATOR_PRIVATE_KEY as Hex);
const brokerWalletClient = createWalletClient({
  account: brokerAccount,
  chain: sepolia,
  transport: http(SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'),
});

function scheduleReconnect() {
  if (reconnectTimer) return;
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
  reconnectAttempts++;
  console.log(`[Clearnode] reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect().catch((err) => {
      console.error('[Clearnode] reconnect failed:', err.message);
    });
  }, delay);
}

function connect(): Promise<void> {
  if (authenticated && ws?.readyState === WebSocket.OPEN) {
    return Promise.resolve();
  }
  if (connecting) {
    return Promise.resolve();
  }

  connecting = true;

  return new Promise((resolve, reject) => {
    if (ws) {
      ws.removeAllListeners();
      ws.close();
    }

    ws = new WebSocket(CLEARNODE_URL);

    const authParams = {
      address: brokerAccount.address,
      session_key: brokerSessionAccount.address,
      application: APP_NAME,
      scope: APP_NAME,
      expires_at: BigInt(Math.floor(Date.now() / 1000) + 86400), // 24h
      allowances: [{ asset: ASSET_SYMBOL, amount: '100000000000' }],
    };

    const timeout = setTimeout(() => {
      connecting = false;
      reject(new Error('Clearnode auth timeout'));
    }, 30000);

    ws.on('open', async () => {
      try {
        const msg = await createAuthRequestMessage({
          address: authParams.address,
          application: authParams.application,
          session_key: authParams.session_key,
          allowances: authParams.allowances,
          expires_at: authParams.expires_at,
          scope: authParams.scope,
        });
        ws!.send(msg);
      } catch (err) {
        clearTimeout(timeout);
        connecting = false;
        reject(err);
      }
    });

    ws.on('message', async (data: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (!parsed.res) return;

        const method = parsed.res[1];
        const params = parsed.res[2];

        if (method === 'auth_challenge') {
          const challenge = params?.challenge_message;
          if (challenge) {
            const eip712Signer = createEIP712AuthMessageSigner(
              brokerWalletClient as any,
              {
                scope: authParams.scope,
                session_key: authParams.session_key,
                expires_at: authParams.expires_at,
                allowances: authParams.allowances,
              },
              { name: authParams.application },
            );
            const verifyMsg = await createAuthVerifyMessageFromChallenge(eip712Signer, challenge);
            ws!.send(verifyMsg);
          }
        }

        if (method === 'auth_verify' && params?.success) {
          clearTimeout(timeout);
          authenticated = true;
          connecting = false;
          reconnectAttempts = 0;
          console.log(`[Clearnode] Connected and authenticated as broker ${brokerAccount.address}`);
          resolve();
        }

        if (method === 'error') {
          clearTimeout(timeout);
          connecting = false;
          reject(new Error(params?.error || params?.message || 'Auth failed'));
        }
      } catch {
        // ignore parse errors from non-auth messages
      }
    });

    ws.on('close', () => {
      authenticated = false;
      connecting = false;
      console.log('[Clearnode] disconnected');
      scheduleReconnect();
    });

    ws.on('error', (err: Error) => {
      console.error('[Clearnode] ws error:', err.message);
    });
  });
}

// create an app session, broker signs and sends to clearnode
// for 2-participant sessions the player also needs to sign via their own clearnode connection
// timeout is configurable since 2-party signing takes longer (player auth + sign)
async function createAppSession(
  definition: Record<string, unknown>,
  allocations: Array<{ participant: Address; asset: string; amount: string }>,
  timeoutMs = 60000,
): Promise<string> {
  if (!authenticated || !ws || ws.readyState !== WebSocket.OPEN) {
    await connect();
  }

  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      if (ws) ws.off('message', handleMessage);
      reject(new Error('Timeout creating app session on clearnode'));
    }, timeoutMs);

    function handleMessage(data: Buffer | ArrayBuffer | Buffer[]) {
      try {
        const parsed = JSON.parse(data.toString());
        if (!parsed.res) return;

        const method = parsed.res[1];
        const params = parsed.res[2];

        if (method === 'create_app_session') {
          clearTimeout(timeout);
          ws!.off('message', handleMessage);
          if (params?.app_session_id) {
            resolve(params.app_session_id);
          } else {
            reject(new Error(params?.error || 'Failed to create app session'));
          }
        }

        if (method === 'error') {
          clearTimeout(timeout);
          ws!.off('message', handleMessage);
          reject(new Error(params?.error || params?.message || 'Create failed'));
        }
      } catch { /* ignore */ }
    }

    ws!.on('message', handleMessage);

    try {
      const msg = await createAppSessionMessage(brokerSessionSigner, {
        definition, allocations,
      } as any);
      ws!.send(msg);
    } catch (err) {
      clearTimeout(timeout);
      ws!.off('message', handleMessage);
      reject(err);
    }
  });
}

// close an app session as the broker
// allocations use human-readable amounts (not 6-decimal on-chain units)
async function closeAppSession(
  appSessionId: string,
  allocations: Array<{ participant: Address; asset: string; amount: string }>,
): Promise<void> {
  // lazy connect on first use
  if (!authenticated || !ws || ws.readyState !== WebSocket.OPEN) {
    await connect();
  }

  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      if (ws) ws.off('message', handleMessage);
      reject(new Error('Timeout closing app session on clearnode'));
    }, 15000);

    function handleMessage(data: Buffer | ArrayBuffer | Buffer[]) {
      try {
        const parsed = JSON.parse(data.toString());
        if (!parsed.res) return;

        const method = parsed.res[1];
        const params = parsed.res[2];

        if (method === 'close_app_session') {
          clearTimeout(timeout);
          ws!.off('message', handleMessage);
          if (params?.status === 'closed' || params?.app_session_id) {
            console.log(`[Clearnode] app session closed: ${appSessionId.slice(0, 18)}...`);
            resolve();
          } else {
            reject(new Error(params?.error || 'Failed to close app session'));
          }
        }

        if (method === 'error') {
          clearTimeout(timeout);
          ws!.off('message', handleMessage);
          reject(new Error(params?.error || params?.message || 'Close failed'));
        }
      } catch {
        // ignore
      }
    }

    ws!.on('message', handleMessage);

    try {
      console.log("ALLOCATIONS_WHEN_CLOSING", {
        allocations,
        appSessionId
      })
      const msg = await createCloseAppSessionMessage(brokerSessionSigner, {
        app_session_id: appSessionId as Hex,
        allocations,
      });
      ws!.send(msg);
    } catch (err) {
      clearTimeout(timeout);
      ws!.off('message', handleMessage);
      reject(err);
    }
  });
}

// pre-sign a create_app_session request as the broker, returns just the signature
// player will combine this with their own signature and submit to clearnode
async function signCreateAppSession(
  definition: Record<string, unknown>,
  allocations: Array<{ participant: Address; asset: string; amount: string }>,
): Promise<{ signature: string; requestId: number; timestamp: number }> {
  const requestId = Math.floor(Math.random() * 1000000);
  const timestamp = Date.now();

  const msg = await createAppSessionMessage(brokerDirectSigner, {
    definition, allocations,
  } as any, requestId, timestamp);
  const parsed = JSON.parse(msg);

  return {
    signature: parsed.sig[0],
    requestId,
    timestamp,
  };
}

export const ClearnodeBackend = {
  connect,
  createAppSession,
  closeAppSession,
  signCreateAppSession,
};
