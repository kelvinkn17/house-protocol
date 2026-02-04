import { useState } from "react";
import { formatUnits } from "viem";
import type { Channel } from "../App";

interface Props {
  channels: Channel[];
  loading: boolean;
}

function truncateAddress(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatAmount(amount: string, decimals = 18) {
  try {
    return parseFloat(formatUnits(BigInt(amount), decimals)).toFixed(4);
  } catch {
    return amount;
  }
}

function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
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
      onClick={(e) => {
        e.stopPropagation();
        copy();
      }}
      className={`ml-2 text-xs transition-colors ${
        copied ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"
      }`}
      title="Copy to clipboard"
    >
      {copied ? "copied!" : "copy"}
    </button>
  );
}

function StatusBadge({ status, inverted = false }: { status: string; inverted?: boolean }) {
  const isOpen = status === "open";
  if (inverted) {
    return (
      <span
        className={`px-2 py-0.5 text-xs uppercase tracking-wide border ${
          isOpen ? "border-white bg-white text-black" : "border-gray-500 text-gray-400"
        }`}
      >
        {status}
      </span>
    );
  }
  return (
    <span
      className={`px-2 py-0.5 text-xs uppercase tracking-wide border ${
        isOpen ? "border-black bg-black text-white" : "border-gray-300 text-gray-400"
      }`}
    >
      {status}
    </span>
  );
}

function ChannelDetail({ channel }: { channel: Channel }) {
  return (
    <div className="bg-gray-50 border-t border-gray-200">
      {/* Stats row */}
      <div className="grid grid-cols-4 border-b border-gray-200">
        <div className="p-4 text-center border-r border-gray-100">
          <div className="text-xl font-bold text-gray-900">{formatAmount(channel.amount)}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Amount</div>
        </div>
        <div className="p-4 text-center border-r border-gray-100">
          <div className="text-sm font-medium text-gray-900">{channel.chain_id}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Chain ID</div>
        </div>
        <div className="p-4 text-center border-r border-gray-100">
          <StatusBadge status={channel.status} />
          <div className="text-xs text-gray-400 uppercase tracking-wide mt-2">State</div>
        </div>
        <div className="p-4 text-center">
          <div className="text-sm font-medium text-gray-900">{formatTimeAgo(channel.updated_at)}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Last Updated</div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 divide-x divide-gray-200">
        {/* Addresses */}
        <div className="p-4">
          <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-3">Addresses</h4>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-400 uppercase">Participant</div>
              <div className="font-mono text-sm flex items-center text-gray-700">
                {truncateAddress(channel.participant)}
                <CopyButton text={channel.participant} />
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase">Wallet</div>
              <div className="font-mono text-sm flex items-center text-gray-700">
                {truncateAddress(channel.wallet)}
                <CopyButton text={channel.wallet} />
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase">Token</div>
              <div className="font-mono text-sm flex items-center text-gray-700">
                {truncateAddress(channel.token)}
                <CopyButton text={channel.token} />
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase">Adjudicator</div>
              <div className="font-mono text-sm flex items-center text-gray-700">
                {truncateAddress(channel.adjudicator)}
                <CopyButton text={channel.adjudicator} />
              </div>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="p-4">
          <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-3">Technical Details</h4>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-gray-400 uppercase">Channel ID</div>
              <div className="font-mono text-xs break-all text-gray-700">{channel.channel_id}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-400 uppercase">Chain</div>
                <div className="text-gray-700">{channel.chain_id}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase">Version</div>
                <div className="text-gray-700">{channel.version}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase">Nonce</div>
                <div className="text-gray-700">{channel.nonce}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase">Challenge Period</div>
              <div className="text-gray-700">{channel.challenge}s ({Math.floor(channel.challenge / 3600)}h)</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase">Amount (raw)</div>
              <div className="font-mono text-xs text-gray-600">{channel.amount}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-400 uppercase">Created</div>
                <div className="text-xs text-gray-600">{new Date(channel.created_at).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase">Updated</div>
                <div className="text-xs text-gray-600">{new Date(channel.updated_at).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelRow({ channel }: { channel: Channel }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={expanded ? "border-l-2 border-l-black" : "border-b border-gray-100 last:border-b-0"}>
      <div
        onClick={() => setExpanded(!expanded)}
        className={`grid grid-cols-7 gap-4 px-4 py-3 cursor-pointer items-center text-xs transition-colors ${
          expanded ? "bg-gray-900 text-white" : "hover:bg-gray-50"
        }`}
      >
        <div className="font-mono">{truncateAddress(channel.channel_id)}</div>
        <div className="font-mono">{truncateAddress(channel.participant)}</div>
        <div>
          <StatusBadge status={channel.status} inverted={expanded} />
        </div>
        <div className="font-mono">{truncateAddress(channel.token)}</div>
        <div className="text-right font-mono">{formatAmount(channel.amount)}</div>
        <div className={expanded ? "text-gray-400" : "text-gray-500"}>{formatTimeAgo(channel.updated_at)}</div>
        <div className={`text-right text-lg ${expanded ? "text-white" : "text-gray-300"}`}>{expanded ? "−" : "+"}</div>
      </div>
      {expanded && <ChannelDetail channel={channel} />}
    </div>
  );
}

function formatTotalValue(channels: Channel[], decimals = 6) {
  const total = channels.reduce((acc, c) => {
    try {
      return acc + BigInt(c.amount);
    } catch {
      return acc;
    }
  }, BigInt(0));
  try {
    return parseFloat(formatUnits(total, decimals)).toLocaleString(undefined, { maximumFractionDigits: 2 });
  } catch {
    return "0";
  }
}

export function ChannelsTable({ channels, loading }: Props) {
  const openChannels = channels.filter(c => c.status === "open");
  const uniqueParticipants = new Set(channels.map(c => c.participant)).size;
  const uniqueChains = new Set(channels.map(c => c.chain_id)).size;

  if (loading && channels.length === 0) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 gap-4 px-4 py-3 border-b border-gray-200 bg-gray-50">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-3 bg-gray-200 rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
            ))}
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="grid grid-cols-7 gap-4 px-4 py-4 border-b border-gray-100">
              {[...Array(6)].map((_, j) => (
                <div key={j} className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: `${50 + Math.random() * 40}%` }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="py-20 text-center bg-white border border-gray-200 rounded-lg">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-600 mb-1">No channels yet</p>
        <p className="text-xs text-gray-400">Channels will appear here when created</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{formatTotalValue(openChannels)}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Open Value</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{openChannels.length}</span>
            <span className="text-sm text-gray-400">/ {channels.length}</span>
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Open Channels</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{uniqueParticipants}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Participants</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{uniqueChains}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Chains</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 gap-4 px-4 py-3 border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
          <div>Channel</div>
          <div>Participant</div>
          <div>Status</div>
          <div>Token</div>
          <div className="text-right">Amount</div>
          <div>Updated</div>
          <div></div>
        </div>
        {/* Rows */}
        {channels.map((ch) => (
          <ChannelRow key={ch.channel_id} channel={ch} />
        ))}
      </div>
    </div>
  );
}
