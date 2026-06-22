import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useTree } from '../hooks/useTree'
import { useAuth } from '../hooks/useAuth'

export default function ShareSheet() {
  const { shareOpen, setShareOpen, cloudEnabled, canEdit, actions } = useTree()
  const { user, signOut } = useAuth()
  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadedFor, setLoadedFor] = useState(false)

  const reload = async () => {
    const [m, i] = await Promise.all([actions.listMembers(), actions.listInvites()])
    setMembers(m)
    setInvites(i)
  }

  if (shareOpen && cloudEnabled && !loadedFor) {
    setLoadedFor(true)
    reload()
  } else if (!shareOpen && loadedFor) {
    setLoadedFor(false)
  }

  const invite = async (e) => {
    e.preventDefault()
    if (!email.trim() || !canEdit) return
    setBusy(true)
    try {
      await actions.inviteMember(email.trim(), 'viewer')
      setEmail('')
      await reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {shareOpen && (
        <motion.div
          className="fixed inset-0 z-[65] flex items-end justify-center md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            aria-label="Close"
            onClick={() => setShareOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-ink-2/95 shadow-2xl backdrop-blur-2xl md:max-w-md md:rounded-3xl"
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="font-serif-display text-xl text-white">Family access</h2>
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                aria-label="Close"
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-5 overflow-y-auto px-5 py-5">
              {!cloudEnabled ? (
                <p className="font-sans-label text-sm leading-relaxed text-white/50">
                  Sharing unlocks once the cloud is connected. You are in local preview mode.
                </p>
              ) : (
                <>
                  {canEdit ? (
                    <form onSubmit={invite} className="flex flex-col gap-2">
                      <span className="font-sans-label text-[0.65rem] tracking-[0.16em] text-white/40 uppercase">
                        Invite a relative (view only)
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="their@email.com"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 font-sans-label text-sm text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={busy || !email.trim()}
                        className="rounded-xl bg-white px-4 py-3 font-sans-label text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-40"
                      >
                        Send invite
                      </button>
                      <p className="font-sans-label text-[0.65rem] leading-relaxed text-white/30">
                        Only you (the admin) can add or edit people. Invited relatives can browse and search.
                      </p>
                    </form>
                  ) : (
                    <p className="font-sans-label text-sm leading-relaxed text-white/50">
                      You have view-only access. Contact the family admin to request changes.
                    </p>
                  )}

                  {members.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="font-sans-label text-[0.65rem] tracking-[0.16em] text-white/40 uppercase">
                        Members
                      </span>
                      {members.map((m) => (
                        <div key={m.user_id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                          <div className="flex flex-col">
                            <span className="font-sans-label text-sm text-white/85">
                              {m.email || m.user_id.slice(0, 8)}
                              {m.user_id === user?.id && ' (you)'}
                            </span>
                            <span className="font-sans-label text-xs text-white/40 capitalize">
                              {m.role === 'owner' ? 'admin' : m.role}
                            </span>
                          </div>
                          {canEdit && m.role !== 'owner' && (
                            <button
                              type="button"
                              onClick={async () => {
                                await actions.removeMember(m.user_id)
                                await reload()
                              }}
                              className="font-sans-label text-xs text-rose-300/80 hover:text-rose-300"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {canEdit && invites.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="font-sans-label text-[0.65rem] tracking-[0.16em] text-white/40 uppercase">
                        Pending invites
                      </span>
                      {invites.map((i) => (
                        <div key={i.id} className="flex items-center justify-between rounded-xl border border-dashed border-white/10 px-3 py-3">
                          <span className="font-sans-label text-sm text-white/70">{i.email}</span>
                          <button
                            type="button"
                            onClick={async () => {
                              await actions.removeInvite(i.id)
                              await reload()
                            }}
                            className="font-sans-label text-xs text-white/40 hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={signOut}
                    className="mt-2 rounded-xl border border-white/10 px-4 py-3.5 font-sans-label text-sm text-white/70 transition-colors hover:bg-white/5"
                  >
                    Sign out
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
