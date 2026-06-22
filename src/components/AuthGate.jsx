import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

function SignIn() {
  const { signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('sending')
    const { error } = await signInWithEmail(email.trim())
    setStatus(error ? 'error' : 'sent')
  }

  return (
    <div className="flex h-dvh w-full items-center justify-center px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-serif-display text-4xl text-white">Our Family</h1>
          <p className="font-sans-label text-sm text-white/45">
            A living record of where we come from.
          </p>
        </div>

        {status === 'sent' ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-8">
            <p className="font-serif-display text-xl text-white">Check your email</p>
            <p className="mt-2 font-sans-label text-sm text-white/50">
              We sent a magic sign-in link to {email}.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex w-full flex-col gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-center font-sans-label text-base text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-2xl bg-white px-4 py-3.5 font-sans-label text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-50"
            >
              {status === 'sending' ? 'Sending…' : 'Send me a sign-in link'}
            </button>
            {status === 'error' && (
              <p className="font-sans-label text-sm text-rose-300">
                Could not send the link. Please try again.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

export default function AuthGate({ children }) {
  const { cloudEnabled, ready, session } = useAuth()
  const [open, setOpen] = useState(false)

  if (!ready) {
    return (
      <div className="flex h-dvh w-full items-center justify-center">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
      </div>
    )
  }

  if (cloudEnabled && !session) {
    return (
      <>
        {children}
        <div className="fixed bottom-24 right-4 z-[90]">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-sans-label text-sm text-white/80 backdrop-blur-xl shadow-2xl transition-colors hover:bg-white/10 hover:text-white"
          >
            Sign in to edit
          </button>
        </div>

        {open && (
          <div className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-sm">
            <div className="absolute inset-x-0 top-0 px-6 py-8">
              <div className="flex items-center justify-between gap-3">
                <span className="font-serif-display text-xl text-white">Sign in</span>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <SignIn />
          </div>
        )}
      </>
    )
  }

  return children
}
