import { useEffect, useState, useCallback } from "react";
import { clearnode, type ConnectionStatus } from "./lib/clearnode";
import { ChannelsTable } from "./components/ChannelsTable";
import { SessionsTable } from "./components/SessionsTable";
import { ConfigView } from "./components/ConfigView";

type Tab = "channels" | "sessions" | "config";

const TABS: Tab[] = ["channels", "sessions", "config"];

function getTabFromHash(): Tab {
  const hash = window.location.hash.slice(1);
  return TABS.includes(hash as Tab) ? (hash as Tab) : "channels";
}

export interface Channel {
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
}

export interface AppSession {
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
}

export interface Network {
  chain_id: number;
  name: string;
  custody_address: string;
  adjudicator_address: string;
}

export interface Asset {
  token: string;
  chain_id: number;
  symbol: string;
  decimals: number;
}

function StatusIndicator({ status }: { status: ConnectionStatus }) {
  const colors: Record<ConnectionStatus, string> = {
    connected: "bg-black",
    connecting: "bg-gray-400 animate-pulse",
    disconnected: "bg-white border border-black",
  };
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 ${colors[status]}`} />
      <span className="text-xs uppercase tracking-wide">{status}</span>
    </div>
  );
}

function App() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [tab, setTab] = useState<Tab>(getTabFromHash);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [sessions, setSessions] = useState<AppSession[]>([]);
  const [brokerAddress, setBrokerAddress] = useState<string | null>(null);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  // sync tab with URL hash
  const changeTab = (newTab: Tab) => {
    setTab(newTab);
    window.location.hash = newTab;
  };

  // listen to hash changes (back/forward)
  useEffect(() => {
    const onHashChange = () => setTab(getTabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const fetchData = useCallback(async () => {
    if (status !== "connected") return;

    setLoading(true);
    try {
      const [channelsRes, sessionsRes, configRes, assetsRes] = await Promise.all([
        clearnode.getChannels(),
        clearnode.getAppSessions(),
        clearnode.getConfig(),
        clearnode.getAssets(),
      ]);

      // debug
      console.log("[scanner] channels:", channelsRes);
      console.log("[scanner] sessions:", sessionsRes);

      setChannels(channelsRes.channels || []);
      setSessions(sessionsRes.app_sessions || []);
      setBrokerAddress(configRes.broker_address || null);
      setNetworks(configRes.networks || []);
      setAssets(assetsRes.assets || []);
      setLastRefresh(new Date());
    } catch (e) {
      console.error("fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [status]);

  // connect on mount
  useEffect(() => {
    clearnode.connect();
    const unsub = clearnode.onStatusChange(setStatus);
    return () => {
      unsub();
      clearnode.disconnect();
    };
  }, []);

  // fetch on connect and every 5s
  useEffect(() => {
    if (status === "connected") {
      fetchData();
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [status, fetchData]);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "channels", label: "Channels", count: channels.length },
    { id: "sessions", label: "Sessions", count: sessions.length },
    { id: "config", label: "Config" },
  ];

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      {/* Header */}
      <header className="border-b border-black px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wider">
              Nitrolite Scanner
            </h1>
          </div>
          <div className="flex items-center gap-6">
            {lastRefresh && (
              <span className="text-xs text-gray-500">
                {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <StatusIndicator status={status} />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b border-black px-6">
        <div className="max-w-6xl mx-auto flex">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => changeTab(t.id)}
              className={`px-4 py-3 text-xs uppercase tracking-wide border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? "border-black"
                  : "border-transparent text-gray-400 hover:text-black"
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-2 text-gray-400">{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="px-6 py-6">
        <div className="max-w-6xl mx-auto">
          {status !== "connected" ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-500 mb-2">
                {status === "connecting"
                  ? "Connecting..."
                  : "Not connected"}
              </p>
              <p className="text-xs text-gray-400">
                Clearnode at {import.meta.env.VITE_CLEARNODE_URL || "ws://localhost:4242"}
              </p>
            </div>
          ) : (
            <>
              {tab === "channels" && (
                <ChannelsTable channels={channels} loading={loading} />
              )}
              {tab === "sessions" && (
                <SessionsTable sessions={sessions} loading={loading} />
              )}
              {tab === "config" && (
                <ConfigView
                  brokerAddress={brokerAddress}
                  networks={networks}
                  assets={assets}
                  loading={loading}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
