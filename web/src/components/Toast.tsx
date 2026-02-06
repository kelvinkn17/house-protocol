import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { cnm } from '@/utils/style'
import { Check, X, Loader2, Info, Copy, ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

type ToastType = 'info' | 'loading' | 'success' | 'error'

interface ToastData {
  id: string
  type: ToastType
  title: string
  description?: string
  txHash?: string
}

interface ToastCtx {
  toast: (t: Omit<ToastData, 'id'>) => string
  dismiss: (id: string) => void
  update: (id: string, t: Partial<Omit<ToastData, 'id'>>) => void
}

const Ctx = createContext<ToastCtx | null>(null)

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast outside ToastProvider')
  return ctx
}

let _n = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id)
    if (t) clearTimeout(t)
    timers.current.delete(id)
    setToasts(p => p.filter(x => x.id !== id))
  }, [])

  const autoDismiss = useCallback((id: string, ms: number) => {
    const existing = timers.current.get(id)
    if (existing) clearTimeout(existing)
    timers.current.set(id, setTimeout(() => dismiss(id), ms))
  }, [dismiss])

  const toast = useCallback((t: Omit<ToastData, 'id'>) => {
    const id = String(++_n)
    setToasts(p => [...p, { ...t, id }])
    if (t.type !== 'loading') autoDismiss(id, t.type === 'success' ? 6000 : 4000)
    return id
  }, [autoDismiss])

  const update = useCallback((id: string, t: Partial<Omit<ToastData, 'id'>>) => {
    setToasts(p => p.map(x => x.id === id ? { ...x, ...t } : x))
    if (t.type === 'success') autoDismiss(id, 6000)
    else if (t.type === 'error') autoDismiss(id, 8000)
  }, [autoDismiss])

  return (
    <Ctx.Provider value={{ toast, dismiss, update }}>
      {children}
      <ToastContainer items={toasts} dismiss={dismiss} />
    </Ctx.Provider>
  )
}

const SCAN = 'https://sepolia.etherscan.io/tx/'

const iconMap = { info: Info, loading: Loader2, success: Check, error: X }

const styleMap = {
  info: { icon: 'bg-black/10 text-black', shadow: 'black' },
  loading: { icon: 'bg-black text-white', shadow: 'black' },
  success: { icon: 'bg-[#CDFF57] text-black', shadow: '#CDFF57' },
  error: { icon: 'bg-[#FF6B9D] text-black', shadow: '#FF6B9D' },
}

function ToastContainer({ items, dismiss }: { items: ToastData[]; dismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-3 w-80 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {items.map(t => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="pointer-events-auto"
          >
            <ToastCard t={t} onDismiss={() => dismiss(t.id)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// truncate long error messages to a short preview
function getErrorPreview(desc: string): string {
  const first = desc.split('\n')[0]
  if (first.length > 60) return first.slice(0, 60) + '...'
  return first
}

function ToastCard({ t, onDismiss }: { t: ToastData; onDismiss: () => void }) {
  const Icon = iconMap[t.type]
  const s = styleMap[t.type]
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const isError = t.type === 'error'
  const descIsLong = isError && t.description && (t.description.length > 60 || t.description.includes('\n'))

  function handleCopy() {
    if (!t.description) return
    navigator.clipboard.writeText(t.description)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className="bg-white border-2 border-black rounded-xl overflow-hidden"
      style={{ boxShadow: `4px 4px 0px ${s.shadow}` }}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span className={cnm(
          'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border-2 border-black',
          s.icon,
        )}>
          <Icon size={14} className={t.type === 'loading' ? 'animate-spin' : ''} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-black">{t.title}</p>
          {t.description && !isError && (
            <p className="text-xs font-mono text-black/50 mt-0.5 truncate">{t.description}</p>
          )}
          {isError && t.description && !expanded && (
            <p className="text-xs font-mono text-black/50 mt-0.5 truncate">{getErrorPreview(t.description)}</p>
          )}
          {t.txHash && (
            <a
              href={`${SCAN}${t.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-mono text-black/50 hover:text-black mt-1 underline decoration-black/20 hover:decoration-black transition-colors"
            >
              {t.txHash.slice(0, 10)}...{t.txHash.slice(-6)} ↗
            </a>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {descIsLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-black/30 hover:text-black transition-colors p-0.5"
            >
              <ChevronDown size={14} className={cnm('transition-transform', expanded && 'rotate-180')} />
            </button>
          )}
          <button
            onClick={onDismiss}
            className="text-black/30 hover:text-black transition-colors p-0.5"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* expanded error details */}
      {isError && expanded && t.description && (
        <div className="border-t-2 border-black/10 px-4 py-2.5 bg-black/5">
          <pre className="text-[10px] font-mono text-black/60 whitespace-pre-wrap break-all max-h-32 overflow-y-auto leading-relaxed">
            {t.description}
          </pre>
          <button
            onClick={handleCopy}
            className="mt-2 flex items-center gap-1.5 text-[10px] font-black uppercase text-black/40 hover:text-black transition-colors cursor-pointer"
          >
            <Copy size={10} />
            {copied ? 'Copied' : 'Copy error'}
          </button>
        </div>
      )}
    </div>
  )
}
