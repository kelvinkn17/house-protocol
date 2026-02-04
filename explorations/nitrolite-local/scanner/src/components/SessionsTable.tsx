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
    <div className="bg-gray-50 border-t border-gray-200">
      {/* Stats row */}
      <div className="grid grid-cols-4 border-b border-gray-200">
        <div className="p-4 text-center border-r border-gray-100">
          <div className="text-xl font-bold text-gray-900">{session.participants.length}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Participants</div>
        </div>
        <div className="p-4 text-center border-r border-gray-100">
          <div className="text-sm font-medium text-gray-900">{session.protocol}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Protocol</div>
        </div>
        <div className="p-4 text-center border-r border-gray-100">
          <StatusBadge status={session.status} />
          <div className="text-xs text-gray-400 uppercase tracking-wide mt-2">State</div>
        </div>
        <div className="p-4 text-center">
          <div className="text-sm font-medium text-gray-900">{formatTimeAgo(session.updated_at)}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Last Updated</div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 divide-x divide-gray-200">
        {/* Addresses */}
        <div className="p-4">
          <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-3">Participants</h4>
          <div className="space-y-3">
            {session.participants.map((addr, i) => (
              <div key={i}>
                <div className="text-xs text-gray-400 uppercase">Address #{i + 1}</div>
                <div className="font-mono text-sm flex items-center text-gray-700">
                  {truncateAddress(addr)}
                  <CopyButton text={addr} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Details */}
        <div className="p-4">
          <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-3">Technical Details</h4>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-gray-400 uppercase">Session ID</div>
              <div className="font-mono text-xs break-all text-gray-700">{session.app_session_id}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase">Application</div>
              <div className="text-gray-700">{session.application || "—"}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-400 uppercase">Quorum</div>
                <div className="text-gray-700">{session.quorum}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase">Weights</div>
                <div className="text-gray-700">[{session.weights.join(", ")}]</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase">Challenge</div>
                <div className="text-gray-700">{session.challenge}s</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-400 uppercase">Version</div>
                <div className="text-gray-700">{session.version}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase">Nonce</div>
                <div className="text-gray-700">{session.nonce}</div>
              </div>
            </div>
            {session.session_data && (
              <div>
                <div className="text-xs text-gray-400 uppercase">Session Data</div>
                <pre className="mt-1 p-3 bg-white border border-gray-200 rounded text-xs overflow-x-auto max-h-40 text-gray-700">
                  {sessionDataParsed ? JSON.stringify(sessionDataParsed, null, 2) : session.session_data}
                </pre>
              </div>
            )}
            <div>
              <div className="text-xs text-gray-400 uppercase">Created</div>
              <div className="text-gray-600">{new Date(session.created_at).toLocaleString()}</div>
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
    <div className={expanded ? "border-l-2 border-l-black" : "border-b border-gray-100 last:border-b-0"}>
      <div
        onClick={() => setExpanded(!expanded)}
        className={`grid grid-cols-7 gap-4 px-4 py-3 cursor-pointer items-center text-xs transition-colors ${
          expanded ? "bg-gray-900 text-white" : "hover:bg-gray-50"
        }`}
      >
        <div className="font-mono">{truncateAddress(session.app_session_id)}</div>
        <div>{session.application || <span className={expanded ? "text-gray-500" : "text-gray-300"}>—</span>}</div>
        <div>
          <StatusBadge status={session.status} inverted={expanded} />
        </div>
        <div>{session.participants.length} addr</div>
        <div>v{session.version}</div>
        <div className={expanded ? "text-gray-400" : "text-gray-500"}>{formatTimeAgo(session.updated_at)}</div>
        <div className={`text-right text-lg ${expanded ? "text-white" : "text-gray-300"}`}>{expanded ? "−" : "+"}</div>
      </div>
      {expanded && <SessionDetail session={session} />}
    </div>
  );
}

export function SessionsTable({ sessions, loading }: Props) {
  const openSessions = sessions.filter(s => s.status === "open");
  const uniqueApps = new Set(sessions.map(s => s.application).filter(Boolean)).size;
  const uniqueProtocols = new Set(sessions.map(s => s.protocol)).size;
  const totalParticipants = sessions.reduce((acc, s) => acc + s.participants.length, 0);

  if (loading && sessions.length === 0) {
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

  if (sessions.length === 0) {
    return (
      <div className="py-20 text-center bg-white border border-gray-200 rounded-lg">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-600 mb-1">No sessions yet</p>
        <p className="text-xs text-gray-400">App sessions will appear here when created</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{openSessions.length}</span>
            <span className="text-sm text-gray-400">/ {sessions.length}</span>
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Open Sessions</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{totalParticipants}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Total Participants</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{uniqueApps || "—"}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Applications</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{uniqueProtocols}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Protocols</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 gap-4 px-4 py-3 border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
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
    </div>
  );
}
