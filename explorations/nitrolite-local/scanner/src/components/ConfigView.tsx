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
  const copy = () => {
    navigator.clipboard.writeText(text);
  };
  return (
    <button
      onClick={copy}
      className="ml-2 text-gray-400 hover:text-black text-xs underline"
      title="Copy"
    >
      copy
    </button>
  );
}

export function ConfigView({ brokerAddress, networks, assets, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-16 bg-gray-100 animate-pulse" />
        <div className="h-32 bg-gray-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Broker */}
      <section>
        <h3 className="text-xs font-medium uppercase tracking-wide mb-3">
          Broker
        </h3>
        <div className="border border-black p-3">
          <code className="text-xs font-mono">
            {brokerAddress || "Not connected"}
          </code>
          {brokerAddress && <CopyButton text={brokerAddress} />}
        </div>
      </section>

      {/* Networks */}
      <section>
        <h3 className="text-xs font-medium uppercase tracking-wide mb-3">
          Networks
        </h3>
        {networks.length === 0 ? (
          <p className="text-sm text-gray-400">No networks</p>
        ) : (
          <div className="border border-black divide-y divide-gray-200">
            {networks.map((n) => (
              <div key={n.chain_id} className="p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium">{n.name}</span>
                  <span className="text-xs text-gray-400">
                    Chain {n.chain_id}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center">
                    <span className="text-gray-500 w-20">Custody</span>
                    <code className="font-mono">
                      {truncateAddress(n.custody_address)}
                    </code>
                    <CopyButton text={n.custody_address} />
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-500 w-20">Adjudicator</span>
                    <code className="font-mono">
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
        <h3 className="text-xs font-medium uppercase tracking-wide mb-3">
          Assets
        </h3>
        {assets.length === 0 ? (
          <p className="text-sm text-gray-400">No assets</p>
        ) : (
          <div className="border border-black">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-black bg-gray-50">
                  <th className="px-3 py-2 text-left font-medium uppercase tracking-wide">
                    Symbol
                  </th>
                  <th className="px-3 py-2 text-left font-medium uppercase tracking-wide">
                    Token
                  </th>
                  <th className="px-3 py-2 text-left font-medium uppercase tracking-wide">
                    Chain
                  </th>
                  <th className="px-3 py-2 text-left font-medium uppercase tracking-wide">
                    Decimals
                  </th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a, i) => (
                  <tr
                    key={`${a.token}-${a.chain_id}`}
                    className={i !== assets.length - 1 ? "border-b border-gray-200" : ""}
                  >
                    <td className="px-3 py-2 font-medium">
                      {a.symbol.toUpperCase()}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {truncateAddress(a.token)}
                      <CopyButton text={a.token} />
                    </td>
                    <td className="px-3 py-2">{a.chain_id}</td>
                    <td className="px-3 py-2">{a.decimals}</td>
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
