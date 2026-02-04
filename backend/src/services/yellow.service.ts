import {
  NitroliteClient,
  WalletStateSigner,
  type Channel,
} from '@erc7824/nitrolite';
import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Address,
  type Hex,
  type Account,
} from 'viem';
import { sepolia, mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import WebSocket from 'ws';
import { prismaQuery } from '../lib/prisma.ts';

const CLEARINGNODE_WS = process.env.CLEARINGNODE_WS || 'wss://clearingnode.yellow.com/ws';
const CHALLENGE_DURATION = 86400n;

const SEPOLIA_ADDRESSES = {
  custody: '0x019B65A265EB3363822f2752141b3dF16131b262' as Address,
  adjudicator: '0x7c7ccbc98469190849BCC6c926307794fDfB11F2' as Address,
  usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address,
};

const MAINNET_ADDRESSES = {
  custody: '0x0000000000000000000000000000000000000000' as Address,
  adjudicator: '0x0000000000000000000000000000000000000000' as Address,
  usdc: '0x0000000000000000000000000000000000000000' as Address,
};

interface ChannelConfig {
  playerAddress: Address;
  playerDeposit: bigint;
  houseDeposit: bigint;
  tokenAddress: Address;
}

interface ChannelStateUpdate {
  channelId: Hex;
  version: bigint;
  intent: number;
  playerBalance: bigint;
  houseBalance: bigint;
  data: Hex;
  playerSig: string;
  houseSig: string;
}

const OPERATOR_PK = process.env.OPERATOR_PK as `0x${string}`;
const NETWORK = process.env.NETWORK || 'sepolia';

function getChain() {
  if (NETWORK === 'mainnet') return mainnet;
  return sepolia;
}

function getRpcUrl() {
  if (NETWORK === 'mainnet') return process.env.MAINNET_RPC_URL;
  return process.env.SEPOLIA_RPC_URL;
}

function getAddresses() {
  if (NETWORK === 'mainnet') return MAINNET_ADDRESSES;
  return SEPOLIA_ADDRESSES;
}

function getDefaultTokenAddress(): Address {
  return getAddresses().usdc;
}

let publicClient: PublicClient | null = null;
let walletClient: WalletClient | null = null;
let nitroliteClient: NitroliteClient | null = null;
let wsConnection: WebSocket | null = null;

function getPublicClient(): PublicClient {
  if (!publicClient) {
    publicClient = createPublicClient({
      chain: getChain(),
      transport: http(getRpcUrl()),
    });
  }
  return publicClient;
}

function getAccount(): Account {
  if (!OPERATOR_PK) throw new Error('OPERATOR_PK not configured');
  return privateKeyToAccount(OPERATOR_PK);
}

function getWalletClient(): WalletClient {
  if (!walletClient) {
    const account = getAccount();
    walletClient = createWalletClient({
      account,
      chain: getChain(),
      transport: http(getRpcUrl()),
    });
  }
  return walletClient;
}

function getNitroliteClient(): NitroliteClient {
  if (!nitroliteClient) {
    const wallet = getWalletClient();
    const addresses = getAddresses();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = {
      publicClient: getPublicClient(),
      walletClient: wallet,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stateSigner: new WalletStateSigner(wallet as any),
      addresses: {
        custody: addresses.custody,
        adjudicator: addresses.adjudicator,
      },
      chainId: getChain().id,
      challengeDuration: CHALLENGE_DURATION,
    };

    nitroliteClient = new NitroliteClient(config);
  }
  return nitroliteClient;
}

function connectToClearingnode(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      resolve(wsConnection);
      return;
    }

    wsConnection = new WebSocket(CLEARINGNODE_WS);

    wsConnection.on('open', () => {
      console.log('connected to Yellow clearingnode');
      resolve(wsConnection!);
    });

    wsConnection.on('error', (err) => {
      console.error('clearingnode ws error:', err);
      reject(err);
    });

    wsConnection.on('close', () => {
      console.log('clearingnode connection closed');
      wsConnection = null;
    });
  });
}

async function sendRpcMessage(method: string, params: unknown): Promise<unknown> {
  const ws = await connectToClearingnode();

  return new Promise((resolve, reject) => {
    const id = Date.now();
    const message = JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params,
    });

    const timeout = setTimeout(() => {
      reject(new Error('RPC timeout'));
    }, 30000);

    const handler = (data: WebSocket.RawData) => {
      try {
        const response = JSON.parse(data.toString());
        if (response.id === id) {
          clearTimeout(timeout);
          ws.off('message', handler);
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
        }
      } catch {
      }
    };

    ws.on('message', handler);
    ws.send(message);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prismaQuery as any;

export async function createChannel(config: ChannelConfig): Promise<{
  channelId: Hex;
  sessionId: string;
}> {
  const account = getAccount();
  const addresses = getAddresses();
  const houseAddress = account.address;

  const response = await sendRpcMessage('create_channel', {
    participants: [config.playerAddress, houseAddress],
    token: config.tokenAddress,
    playerDeposit: config.playerDeposit.toString(),
    houseDeposit: config.houseDeposit.toString(),
  }) as { channelId: Hex; serverSignature: Hex };

  const client = getNitroliteClient();

  const channelParams: Channel = {
    participants: [config.playerAddress, houseAddress],
    adjudicator: addresses.adjudicator,
    challenge: CHALLENGE_DURATION,
    nonce: BigInt(Date.now()),
  };

  const { channelId } = await client.createChannel({
    channel: channelParams,
    unsignedInitialState: {
      intent: 0,
      version: 0n,
      data: '0x' as Hex,
      allocations: [
        {
          destination: config.playerAddress,
          token: config.tokenAddress,
          amount: config.playerDeposit,
        },
        {
          destination: houseAddress,
          token: config.tokenAddress,
          amount: config.houseDeposit,
        },
      ],
    },
    serverSignature: response.serverSignature,
  });

  const session = await db.session.create({
    data: {
      playerId: config.playerAddress, 
      channelId: channelId,
      playerDeposit: config.playerDeposit.toString(),
      houseDeposit: config.houseDeposit.toString(),
      status: 'ACTIVE',
    },
  });

  await db.channelState.create({
    data: {
      sessionId: session.id,
      version: 0,
      intent: 'initialize',
      playerBalance: config.playerDeposit.toString(),
      houseBalance: config.houseDeposit.toString(),
      data: '0x',
      playerSig: '', 
      houseSig: '',
    },
  });

  return { channelId, sessionId: session.id };
}

export async function updateChannelState(
  sessionId: string,
  newPlayerBalance: bigint,
  newHouseBalance: bigint,
  stateData: Hex
): Promise<ChannelStateUpdate> {
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { states: { orderBy: { version: 'desc' }, take: 1 } },
  });

  if (!session) throw new Error('Session not found');
  if (session.status !== 'ACTIVE') throw new Error('Session not active');

  const lastState = session.states[0];
  const newVersion = lastState ? lastState.version + 1 : 1;

  const wallet = getWalletClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stateSigner = new WalletStateSigner(wallet as any);
  const account = getAccount();

  const tokenAddress = getDefaultTokenAddress();
  const stateToSign = {
    intent: 1, // Operate
    version: BigInt(newVersion),
    data: stateData,
    allocations: [
      {
        destination: session.playerId as Address,
        token: tokenAddress,
        amount: newPlayerBalance,
      },
      {
        destination: account.address,
        token: tokenAddress,
        amount: newHouseBalance,
      },
    ],
    sigs: [] as string[],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const houseSig = await stateSigner.signState(session.channelId as Hex, stateToSign as any);

  const response = await sendRpcMessage('sign_state', {
    channelId: session.channelId,
    state: stateToSign,
    houseSig,
  }) as { playerSig: string };

  // store the new state
  await db.channelState.create({
    data: {
      sessionId,
      version: newVersion,
      intent: 'operate',
      playerBalance: newPlayerBalance.toString(),
      houseBalance: newHouseBalance.toString(),
      data: stateData,
      playerSig: response.playerSig,
      houseSig,
    },
  });

  return {
    channelId: session.channelId as Hex,
    version: BigInt(newVersion),
    intent: 1,
    playerBalance: newPlayerBalance,
    houseBalance: newHouseBalance,
    data: stateData,
    playerSig: response.playerSig,
    houseSig,
  };
}

export async function closeChannel(sessionId: string): Promise<Hex> {
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { states: { orderBy: { version: 'desc' }, take: 1 } },
  });

  if (!session) throw new Error('Session not found');

  const lastState = session.states[0];
  if (!lastState) throw new Error('No channel state found');

  const account = getAccount();
  const client = getNitroliteClient();

  const response = await sendRpcMessage('close_channel', {
    channelId: session.channelId,
  }) as { serverSignature: Hex };

  const tokenAddress = getDefaultTokenAddress();
  const txHash = await client.closeChannel({
    finalState: {
      intent: 3, 
      channelId: session.channelId as Hex,
      data: lastState.data as Hex,
      allocations: [
        {
          destination: session.playerId as Address,
          token: tokenAddress,
          amount: BigInt(lastState.playerBalance.toString()),
        },
        {
          destination: account.address,
          token: tokenAddress,
          amount: BigInt(lastState.houseBalance.toString()),
        },
      ],
      version: BigInt(lastState.version),
      serverSignature: response.serverSignature,
    },
    stateData: lastState.data as Hex,
  });

  await db.session.update({
    where: { id: sessionId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
    },
  });

  return txHash;
}

export async function getSessionState(sessionId: string) {
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      states: { orderBy: { version: 'desc' }, take: 1 },
      rounds: { orderBy: { roundNumber: 'desc' } },
    },
  });

  if (!session) return null;

  const lastState = session.states[0];
  const totalRounds = session.rounds.length;
  const wins = session.rounds.filter((r: { playerWon: boolean | null }) => r.playerWon === true).length;
  const losses = session.rounds.filter((r: { playerWon: boolean | null }) => r.playerWon === false).length;

  return {
    sessionId: session.id,
    channelId: session.channelId,
    status: session.status,
    playerBalance: lastState ? BigInt(lastState.playerBalance.toString()) : BigInt(session.playerDeposit.toString()),
    houseBalance: lastState ? BigInt(lastState.houseBalance.toString()) : BigInt(session.houseDeposit.toString()),
    version: lastState?.version || 0,
    stats: { totalRounds, wins, losses },
    createdAt: session.createdAt,
    closedAt: session.closedAt,
  };
}

export const YellowService = {
  createChannel,
  updateChannelState,
  closeChannel,
  getSessionState,
  connectToClearingnode,
};
