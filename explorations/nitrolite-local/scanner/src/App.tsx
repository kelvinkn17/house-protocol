import { useEffect, useState, useCallback, useRef } from "react";
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
  const config: Record<ConnectionStatus, { bg: string; dot: string; text: string }> = {
    connected: { bg: "bg-emerald-50", dot: "bg-emerald-500", text: "text-emerald-700" },
    connecting: { bg: "bg-amber-50", dot: "bg-amber-400 animate-pulse", text: "text-amber-700" },
    disconnected: { bg: "bg-gray-100", dot: "bg-gray-400", text: "text-gray-500" },
  };
  const c = config[status];
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${c.bg}`}>
      <div className={`w-2 h-2 rounded-full ${c.dot}`} />
      <span className={`text-xs font-medium uppercase tracking-wide ${c.text}`}>{status}</span>
    </div>
  );
}

function App() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [tab, setTab] = useState<Tab>(getTabFromHash);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const hasFetchedOnce = useRef(false);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [sessions, setSessions] = useState<AppSession[]>([]);
  const [brokerAddress, setBrokerAddress] = useState<string | null>(null);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  // computed stats
  const openChannels = channels.filter(c => c.status === "open").length;
  const openSessions = sessions.filter(s => s.status === "open").length;

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

    // only show full loading state on first fetch
    const isFirstFetch = !hasFetchedOnce.current;
    if (isFirstFetch) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }

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
      hasFetchedOnce.current = true;
    } catch (e) {
      console.error("fetch error:", e);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
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

  const tabs: { id: Tab; label: string; count?: number; activeCount?: number }[] = [
    { id: "channels", label: "Channels", count: channels.length, activeCount: openChannels },
    { id: "sessions", label: "Sessions", count: sessions.length, activeCount: openSessions },
    { id: "config", label: "Config" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-black font-mono">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-bold uppercase tracking-wider">
              Nitrolite Scanner
            </h1>
            {refreshing && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" />
                <span>syncing</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {lastRefresh && (
              <span className="text-xs text-gray-400">
                {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <StatusIndicator status={status} />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-6xl mx-auto flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => changeTab(t.id)}
              className={`px-4 py-3 text-xs uppercase tracking-wide border-b-2 -mb-px transition-all ${
                tab === t.id
                  ? "border-black text-black font-medium"
                  : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-2">
                  {t.activeCount !== undefined && t.activeCount > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-l text-xs ${
                      tab === t.id ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-700"
                    }`}>
                      {t.activeCount}
                    </span>
                  )}
                  <span className={`px-1.5 py-0.5 text-xs ${
                    t.activeCount !== undefined && t.activeCount > 0 ? "rounded-r" : "rounded"
                  } ${
                    tab === t.id ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    {t.count}
                  </span>
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="px-6 py-6">
        <div className="max-w-6xl mx-auto">
          {status !== "connected" ? (
            <div className="py-24 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-6">
                {status === "connecting" ? (
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                ) : (
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a4 4 0 010-5.656m-7.072 7.072a4 4 0 010-5.656m-3.536 9.192a9 9 0 010-12.728" />
                  </svg>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-1">
                {status === "connecting" ? "Connecting to Clearnode..." : "Disconnected"}
              </p>
              <p className="text-xs text-gray-400 font-mono">
                {import.meta.env.VITE_CLEARNODE_URL || "ws://localhost:4242"}
              </p>
            </div>
          ) : (
            <>
              {tab === "channels" && (
                <ChannelsTable channels={channels} loading={initialLoading} />
              )}
              {tab === "sessions" && (
                <SessionsTable sessions={sessions} loading={initialLoading} />
              )}
              {tab === "config" && (
                <ConfigView
                  brokerAddress={brokerAddress}
                  networks={networks}
                  assets={assets}
                  loading={initialLoading}
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
