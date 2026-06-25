import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../hooks/useLanguage'

function AdminSignInForm({ onClose }) {
  const { signInWithEmail } = useAuth()
  const { ui } = useLanguage()
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
    <div className="flex flex-col gap-4 px-5 py-5">
      <p className="font-sans-label text-sm leading-relaxed text-white/50">
        {ui('admin.signInHint')}
      </p>

      {status === 'sent' ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center">
          <p className="font-serif-display text-lg text-white">{ui('admin.checkEmail')}</p>
          <p className="mt-2 font-sans-label text-sm text-white/50">
            {ui('admin.sentTo')} {email}
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 font-sans-label text-sm text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            className="rounded-xl bg-white px-4 py-3 font-sans-label text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-50"
          >
            {status === 'sending' ? ui('admin.sending') : ui('action.adminSignIn')}
          </button>
          {status === 'error' && (
            <p className="font-sans-label text-sm text-rose-300">{ui('admin.signInError')}</p>
          )}
        </form>
      )}

      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border border-white/10 px-4 py-3 font-sans-label text-sm text-white/60 transition-colors hover:bg-white/5"
      >
        {ui('action.cancel')}
      </button>
    </div>
  )
}

export default function AdminSignInModal({ open, onClose }) {
  const { ui } = useLanguage()

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[95] flex items-end justify-center md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={ui('action.adminSignIn')}
            className="relative w-full max-w-sm overflow-hidden rounded-t-3xl border border-white/10 bg-ink-2/95 shadow-2xl backdrop-blur-2xl md:rounded-3xl"
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          >
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="font-serif-display text-xl text-white">{ui('action.adminSignIn')}</h2>
            </div>
            <AdminSignInForm onClose={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
