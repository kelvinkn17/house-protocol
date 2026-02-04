import { useState } from "react";
import type { Network, Asset } from "../App";

interface Props {
  brokerAddress: string | null;
  networks: Network[];
  assets: Asset[];
  loading: boolean;
}

function truncateAddress(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className={`ml-2 text-xs transition-colors ${
        copied ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"
      }`}
      title="Copy to clipboard"
    >
      {copied ? "copied!" : "copy"}
    </button>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-3">
      {children}
    </h3>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center bg-white border border-gray-200 rounded-lg">
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

export function ConfigView({ brokerAddress, networks, assets, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-3 w-16 bg-gray-200 rounded mb-3 animate-pulse" />
          <div className="h-14 bg-gray-100 rounded-lg animate-pulse" />
        </div>
        <div>
          <div className="h-3 w-20 bg-gray-200 rounded mb-3 animate-pulse" />
          <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
        </div>
        <div>
          <div className="h-3 w-14 bg-gray-200 rounded mb-3 animate-pulse" />
          <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Broker */}
      <section>
        <SectionHeader>Broker</SectionHeader>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <code className="text-sm font-mono text-gray-800 break-all">
            {brokerAddress || "Not connected"}
          </code>
          {brokerAddress && <CopyButton text={brokerAddress} />}
        </div>
      </section>

      {/* Networks */}
      <section>
        <SectionHeader>Networks</SectionHeader>
        {networks.length === 0 ? (
          <EmptyState message="No networks configured" />
        ) : (
          <div className="space-y-3">
            {networks.map((n) => (
              <div key={n.chain_id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-medium text-gray-900">{n.name}</span>
                  <span className="text-xs font-mono px-2 py-1 bg-gray-100 rounded text-gray-600">
                    Chain {n.chain_id}
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center">
                    <span className="text-gray-500 w-24">Custody</span>
                    <code className="font-mono text-gray-700">
                      {truncateAddress(n.custody_address)}
                    </code>
                    <CopyButton text={n.custody_address} />
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-500 w-24">Adjudicator</span>
                    <code className="font-mono text-gray-700">
                      {truncateAddress(n.adjudicator_address)}
                    </code>
                    <CopyButton text={n.adjudicator_address} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Assets */}
      <section>
        <SectionHeader>Assets</SectionHeader>
        {assets.length === 0 ? (
          <EmptyState message="No assets configured" />
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-gray-500">
                    Symbol
                  </th>
                  <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-gray-500">
                    Token
                  </th>
                  <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-gray-500">
                    Chain
                  </th>
                  <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-gray-500">
                    Decimals
                  </th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a, i) => (
                  <tr
                    key={`${a.token}-${a.chain_id}`}
                    className={i !== assets.length - 1 ? "border-b border-gray-100" : ""}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {a.symbol.toUpperCase()}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700">
                      {truncateAddress(a.token)}
                      <CopyButton text={a.token} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.chain_id}</td>
                    <td className="px-4 py-3 text-gray-600">{a.decimals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
