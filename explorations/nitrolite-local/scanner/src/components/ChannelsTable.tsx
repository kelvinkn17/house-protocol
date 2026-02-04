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
    setTimeout(() => setCopied(false), 1000);
  };
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        copy();
      }}
      className="ml-2 text-gray-400 hover:text-black text-xs"
      title="Copy"
    >
      {copied ? "copied" : "copy"}
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
    <div className="border-t border-gray-200 bg-gray-50">
      {/* Stats row */}
      <div className="grid grid-cols-4 border-b border-gray-200">
        <div className="p-4 text-center border-r border-gray-200">
          <div className="text-2xl font-bold">{formatAmount(channel.amount)}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Amount</div>
        </div>
        <div className="p-4 text-center border-r border-gray-200">
          <div className="text-sm font-medium">{channel.chain_id}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Chain ID</div>
        </div>
        <div className="p-4 text-center border-r border-gray-200">
          <StatusBadge status={channel.status} />
          <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">State</div>
        </div>
        <div className="p-4 text-center">
          <div className="text-sm font-medium">{formatTimeAgo(channel.updated_at)}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Last Updated</div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 divide-x divide-gray-200">
        {/* Addresses */}
        <div className="p-4">
          <h4 className="text-xs font-medium uppercase tracking-wide mb-3">Addresses</h4>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-500 uppercase">Participant</div>
              <div className="font-mono text-sm flex items-center">
                {truncateAddress(channel.participant)}
                <CopyButton text={channel.participant} />
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Wallet</div>
              <div className="font-mono text-sm flex items-center">
                {truncateAddress(channel.wallet)}
                <CopyButton text={channel.wallet} />
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Token</div>
              <div className="font-mono text-sm flex items-center">
                {truncateAddress(channel.token)}
                <CopyButton text={channel.token} />
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Adjudicator</div>
              <div className="font-mono text-sm flex items-center">
                {truncateAddress(channel.adjudicator)}
                <CopyButton text={channel.adjudicator} />
              </div>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="p-4">
          <h4 className="text-xs font-medium uppercase tracking-wide mb-3">Technical Details</h4>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-gray-500 uppercase">Channel ID</div>
              <div className="font-mono text-xs break-all">{channel.channel_id}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-500 uppercase">Chain</div>
                <div>{channel.chain_id}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase">Version</div>
                <div>{channel.version}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase">Nonce</div>
                <div>{channel.nonce}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Challenge Period</div>
              <div>{channel.challenge}s ({Math.floor(channel.challenge / 3600)}h)</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Amount (raw)</div>
              <div className="font-mono text-xs">{channel.amount}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 uppercase">Created</div>
                <div className="text-xs">{new Date(channel.created_at).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase">Updated</div>
                <div className="text-xs">{new Date(channel.updated_at).toLocaleString()}</div>
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
    <div className={expanded ? "border-b border-black border-l-4 border-l-black bg-gray-50" : "border-b border-gray-200"}>
      <div
        onClick={() => setExpanded(!expanded)}
        className={`grid grid-cols-7 gap-4 px-3 py-3 cursor-pointer items-center text-xs ${expanded ? "bg-black text-white" : "hover:bg-gray-50"}`}
      >
        <div className="font-mono">{truncateAddress(channel.channel_id)}</div>
        <div className="font-mono">{truncateAddress(channel.participant)}</div>
        <div>
          <StatusBadge status={channel.status} inverted={expanded} />
        </div>
        <div className="font-mono">{truncateAddress(channel.token)}</div>
        <div className="text-right font-mono">{formatAmount(channel.amount)}</div>
        <div className={expanded ? "text-gray-300" : "text-gray-500"}>{formatTimeAgo(channel.updated_at)}</div>
        <div className={`text-right ${expanded ? "text-white" : "text-gray-400"}`}>{expanded ? "−" : "+"}</div>
      </div>
      {expanded && <ChannelDetail channel={channel} />}
    </div>
  );
}

export function ChannelsTable({ channels, loading }: Props) {
  if (loading && channels.length === 0) {
    return (
      <div className="space-y-px">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-gray-400">
        No channels
      </div>
    );
  }

  return (
    <div className="border border-black">
      {/* Header */}
      <div className="grid grid-cols-7 gap-4 px-3 py-2 border-b border-black bg-gray-50 text-xs font-medium uppercase tracking-wide">
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
  );
}
