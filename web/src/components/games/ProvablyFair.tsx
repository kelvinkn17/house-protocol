// provably fair verification panel
// compact badge during active session, full verification after close

import { useState } from 'react'
import { Shield, Check, X, Copy, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { useSession } from '@/providers/SessionProvider'
import { verifyRound } from '@/lib/game'
import { cnm } from '@/utils/style'

const ETHERSCAN_BASE = 'https://sepolia.etherscan.io/tx/'

function truncate(str: string, start = 6, end = 4) {
  if (str.length <= start + end + 3) return str
  return `${str.slice(0, start)}...${str.slice(-end)}`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      className="p-0.5 text-black/30 hover:text-black/60 transition-colors"
      title="Copy"
    >
      {copied ? <Check size={10} className="text-[#7BA318]" /> : <Copy size={10} />}
    </button>
  )
}

// compact badge shown in the active session bar
function ActiveBadge() {
  const { sessionSeedHash, openSessionTxHash } = useSession()

  if (!sessionSeedHash) return null

  return (
    <div className="flex items-center gap-2 text-[10px] font-mono text-black/40">
      <Shield size={10} className="text-[#7BA318]" />
      <span className="text-black/50 font-bold">Provably Fair</span>
      <span className="text-black/25">{truncate(sessionSeedHash, 8, 4)}</span>
      {openSessionTxHash ? (
        <a
          href={`${ETHERSCAN_BASE}${openSessionTxHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-0.5 text-[#7BA318] hover:text-[#5a7a10] transition-colors"
        >
          <ExternalLink size={8} />
          On-chain
        </a>
      ) : (
        <span className="text-black/20">Pending</span>
      )}
    </div>
  )
}

// full verification panel shown after session close
function VerificationPanel() {
  const { sessionSeed, sessionSeedHash, openSessionTxHash, verifySessionTxHash, roundHistory } = useSession()
  const [expanded, setExpanded] = useState(false)

  if (!sessionSeed && !sessionSeedHash) return null

  // parse seed as bigint for verification
  const seedBigInt = sessionSeed ? BigInt(sessionSeed) : null

  return (
    <div
      className="bg-white border-2 border-black rounded-xl overflow-hidden"
      style={{ boxShadow: '3px 3px 0px #7BA318' }}
    >
      {/* header, always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-black/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield size={12} className="text-[#7BA318]" />
          <span className="text-[10px] font-black text-black/60 uppercase">Provably Fair</span>
          {seedBigInt && roundHistory.length > 0 && (
            <span className="text-[10px] font-mono text-[#7BA318]">
              {roundHistory.length}/{roundHistory.length} verified
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={12} className="text-black/30" /> : <ChevronDown size={12} className="text-black/30" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-black/5 space-y-3">
          {/* seed info */}
          {sessionSeed && (
            <div className="mt-2">
              <p className="text-[10px] font-mono text-black/30 uppercase mb-1">Session Seed</p>
              <div className="flex items-center gap-1.5 bg-black/[0.03] rounded-lg px-2 py-1.5">
                <code className="text-[10px] font-mono text-black/60 break-all flex-1">{sessionSeed}</code>
                <CopyButton text={sessionSeed} />
              </div>
            </div>
          )}

          {sessionSeedHash && (
            <div>
              <p className="text-[10px] font-mono text-black/30 uppercase mb-1">Seed Hash (committed on-chain)</p>
              <div className="flex items-center gap-1.5 bg-black/[0.03] rounded-lg px-2 py-1.5">
                <code className="text-[10px] font-mono text-black/60 break-all flex-1">{sessionSeedHash}</code>
                <CopyButton text={sessionSeedHash} />
              </div>
            </div>
          )}

          {/* etherscan links */}
          {(openSessionTxHash || verifySessionTxHash) && (
            <div className="flex items-center gap-3">
              {openSessionTxHash && (
                <a
                  href={`${ETHERSCAN_BASE}${openSessionTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-black/30 hover:text-black/60 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink size={9} />
                  Open tx
                </a>
              )}
              {verifySessionTxHash && (
                <a
                  href={`${ETHERSCAN_BASE}${verifySessionTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-black/30 hover:text-black/60 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink size={9} />
                  Verify tx
                </a>
              )}
            </div>
          )}

          {/* per-round verification */}
          {seedBigInt && roundHistory.length > 0 && (
            <div>
              <p className="text-[10px] font-mono text-black/30 uppercase mb-1.5">Round Verification</p>
              <div className="space-y-1">
                {roundHistory.map((round) => {
                  const verified = verifyRound(seedBigInt, round.roundNumber, round.houseNonce)
                  return (
                    <div
                      key={round.roundId}
                      className="flex items-center justify-between px-2 py-1 bg-black/[0.02] rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        {verified ? (
                          <Check size={10} className="text-[#7BA318]" />
                        ) : (
                          <X size={10} className="text-[#FF6B9D]" />
                        )}
                        <span className="text-[10px] font-mono text-black/50">
                          Round {round.roundNumber}
                        </span>
                        <span className={cnm(
                          'text-[10px] font-black',
                          round.playerWon ? 'text-[#7BA318]' : 'text-[#FF6B9D]',
                        )}>
                          {round.playerWon ? 'W' : 'L'}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-black/20">
                        {truncate(round.houseNonce, 6, 4)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* explainer */}
          <div className="pt-1 border-t border-black/5">
            <p className="text-[9px] font-mono text-black/20 leading-relaxed">
              Each round's house nonce = keccak256(sessionSeed, roundNumber).
              The seed hash was committed on-chain before any rounds were played.
              You can verify by computing keccak256(abi.encodePacked(seed, yourAddress))
              and comparing with the on-chain commitment.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProvablyFair() {
  const { sessionPhase } = useSession()

  if (sessionPhase === 'active') return <ActiveBadge />
  if (sessionPhase === 'closed') return <VerificationPanel />
  return null
}
