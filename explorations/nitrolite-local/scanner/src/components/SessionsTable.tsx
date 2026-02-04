import { useState } from "react";
import type { AppSession } from "../App";

interface Props {
  sessions: AppSession[];
  loading: boolean;
}

function truncateAddress(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
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

function SessionDetail({ session }: { session: AppSession }) {
  let sessionDataParsed: unknown = null;
  try {
    if (session.session_data) {
      sessionDataParsed = JSON.parse(session.session_data);
    }
  } catch {
    sessionDataParsed = session.session_data;
  }

  return (
    <div className="border-t border-gray-200 bg-gray-50">
      {/* Stats row */}
      <div className="grid grid-cols-4 border-b border-gray-200">
        <div className="p-4 text-center border-r border-gray-200">
          <div className="text-2xl font-bold">{session.participants.length}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Participants</div>
        </div>
        <div className="p-4 text-center border-r border-gray-200">
          <div className="text-sm font-medium">{session.protocol}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Protocol</div>
        </div>
        <div className="p-4 text-center border-r border-gray-200">
          <StatusBadge status={session.status} />
          <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">State</div>
        </div>
        <div className="p-4 text-center">
          <div className="text-sm font-medium">{formatTimeAgo(session.updated_at)}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Last Updated</div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 divide-x divide-gray-200">
        {/* Addresses */}
        <div className="p-4">
          <h4 className="text-xs font-medium uppercase tracking-wide mb-3">Addresses</h4>
          <div className="space-y-3">
            {session.participants.map((addr, i) => (
              <div key={i}>
                <div className="text-xs text-gray-500 uppercase">Address #{i + 1}</div>
                <div className="font-mono text-sm flex items-center">
                  {truncateAddress(addr)}
                  <CopyButton text={addr} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Details */}
        <div className="p-4">
          <h4 className="text-xs font-medium uppercase tracking-wide mb-3">Technical Details</h4>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-gray-500 uppercase">Session ID</div>
              <div className="font-mono text-xs break-all">{session.app_session_id}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Application</div>
              <div>{session.application || "—"}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-500 uppercase">Quorum</div>
                <div>{session.quorum}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase">Weights</div>
                <div>[{session.weights.join(", ")}]</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase">Challenge</div>
                <div>{session.challenge}s</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 uppercase">Version</div>
                <div>{session.version}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase">Nonce</div>
                <div>{session.nonce}</div>
              </div>
            </div>
            {session.session_data && (
              <div>
                <div className="text-xs text-gray-500 uppercase">Session Data</div>
                <pre className="mt-1 p-2 bg-white border border-gray-200 text-xs overflow-x-auto max-h-40">
                  {sessionDataParsed ? JSON.stringify(sessionDataParsed, null, 2) : session.session_data}
                </pre>
              </div>
            )}
            <div>
              <div className="text-xs text-gray-500 uppercase">Created</div>
              <div>{new Date(session.created_at).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionRow({ session }: { session: AppSession }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={expanded ? "border-b border-black border-l-4 border-l-black bg-gray-50" : "border-b border-gray-200"}>
      <div
        onClick={() => setExpanded(!expanded)}
        className={`grid grid-cols-7 gap-4 px-3 py-3 cursor-pointer items-center text-xs ${expanded ? "bg-black text-white" : "hover:bg-gray-50"}`}
      >
        <div className="font-mono">{truncateAddress(session.app_session_id)}</div>
        <div>{session.application || <span className="text-gray-300">—</span>}</div>
        <div>
          <StatusBadge status={session.status} inverted={expanded} />
        </div>
        <div>{session.participants.length} addr</div>
        <div>v{session.version}</div>
        <div className={expanded ? "text-gray-300" : "text-gray-500"}>{formatTimeAgo(session.updated_at)}</div>
        <div className={`text-right ${expanded ? "text-white" : "text-gray-400"}`}>{expanded ? "−" : "+"}</div>
      </div>
      {expanded && <SessionDetail session={session} />}
    </div>
  );
}

export function SessionsTable({ sessions, loading }: Props) {
  if (loading && sessions.length === 0) {
    return (
      <div className="space-y-px">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-gray-400">
        No sessions
      </div>
    );
  }

  return (
    <div className="border border-black">
      {/* Header */}
      <div className="grid grid-cols-7 gap-4 px-3 py-2 border-b border-black bg-gray-50 text-xs font-medium uppercase tracking-wide">
        <div>Session</div>
        <div>App</div>
        <div>Status</div>
        <div>Participants</div>
        <div>Version</div>
        <div>Updated</div>
        <div></div>
      </div>
      {/* Rows */}
      {sessions.map((s) => (
        <SessionRow key={s.app_session_id} session={s} />
      ))}
    </div>
  );
}
