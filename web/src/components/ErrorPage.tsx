import { useRouter } from '@tanstack/react-router'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface ErrorPageProps {
  error?: Error
  reset?: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const router = useRouter()

  const handleRetry = () => {
    if (reset) {
      reset()
    } else {
      router.invalidate()
    }
  }

  const handleHome = () => {
    router.navigate({ to: '/' })
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#cdff57] px-6 py-20">
      <div className="max-w-md w-full">
        <div
          className="bg-white border-2 border-black rounded-2xl p-8 text-center"
          style={{ boxShadow: '6px 6px 0px black' }}
        >
          {/* icon */}
          <div className="mb-6 flex justify-center">
            <div
              className="w-16 h-16 flex items-center justify-center bg-[#FF6B9D] border-2 border-black rounded-xl"
              style={{ boxShadow: '3px 3px 0px black' }}
            >
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
          </div>

          <p className="text-xs font-mono font-black uppercase tracking-widest text-black/40 mb-2">
            Error
          </p>

          <h1 className="text-2xl sm:text-3xl font-black text-black mb-3">
            Something went wrong
          </h1>

          <p className="text-sm text-black/50 leading-relaxed mb-6">
            An unexpected error occurred. Try refreshing the page. If this keeps
            happening, please contact us.
          </p>

          {error && (
            <div
              className="mb-6 px-4 py-3 text-left bg-black/5 border-2 border-black rounded-xl"
              style={{ boxShadow: '3px 3px 0px #FF6B9D' }}
            >
              <p className="text-[10px] font-mono font-black uppercase tracking-wider text-black/40 mb-1">
                Details
              </p>
              <p className="text-xs font-mono text-[#FF6B9D] break-all">
                {error.message || 'Unknown error'}
              </p>
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-black uppercase tracking-wider bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
              style={{ boxShadow: '3px 3px 0px #CDFF57' }}
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
            <button
              onClick={handleHome}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-black uppercase tracking-wider bg-white text-black border-2 border-black rounded-xl transition-transform hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
              style={{ boxShadow: '3px 3px 0px black' }}
            >
              <Home className="w-4 h-4" />
              Go home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 404 page, same neubrutalist vibe
export function NotFoundPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#cdff57] px-6 py-20">
      <div className="max-w-md w-full">
        <div
          className="bg-white border-2 border-black rounded-2xl p-8 text-center"
          style={{ boxShadow: '6px 6px 0px black' }}
        >
          <div
            className="inline-block text-7xl font-black text-black mb-4 px-4 py-1 bg-[#CDFF57] border-2 border-black rounded-xl"
            style={{ boxShadow: '3px 3px 0px black' }}
          >
            404
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-black mb-3">
            Page not found
          </h1>

          <p className="text-sm text-black/50 leading-relaxed mb-6">
            This page doesn't exist or was moved. Double check the URL or head
            back home.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.history.back()}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-black uppercase tracking-wider bg-white text-black border-2 border-black rounded-xl transition-transform hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
              style={{ boxShadow: '3px 3px 0px black' }}
            >
              Go back
            </button>
            <button
              onClick={() => router.navigate({ to: '/' })}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-black uppercase tracking-wider bg-black text-white border-2 border-black rounded-xl transition-transform hover:translate-x-0.5 hover:translate-y-0.5 cursor-pointer"
              style={{ boxShadow: '3px 3px 0px #CDFF57' }}
            >
              <Home className="w-4 h-4" />
              Go home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
