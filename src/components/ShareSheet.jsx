import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useTree } from '../hooks/useTree'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../hooks/useLanguage'

export default function ShareSheet() {
  const { shareOpen, setShareOpen, cloudEnabled, canEdit, actions, publicAccess } =
    useTree()
  const { user, signOut } = useAuth()
  const { ui } = useLanguage()
  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('viewer')
  const [busy, setBusy] = useState(false)
  const [publicBusy, setPublicBusy] = useState(false)

  const reload = async () => {
    const [m, i] = await Promise.all([actions.listMembers(), actions.listInvites()])
    setMembers(m)
    setInvites(i)
  }

  useEffect(() => {
    if (shareOpen && cloudEnabled) reload()
  }, [shareOpen, cloudEnabled])

  const invite = async (e) => {
    e.preventDefault()
    if (!email.trim() || !canEdit) return
    setBusy(true)
    try {
      await actions.inviteMember(email.trim(), inviteRole)
      setEmail('')
      await reload()
    } finally {
      setBusy(false)
    }
  }

  const togglePublic = async () => {
    setPublicBusy(true)
    try {
      await actions.setPublicAccess(!publicAccess)
    } finally {
      setPublicBusy(false)
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
            className="relative flex max-h-[min(92dvh,900px)] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-ink-2/95 shadow-2xl backdrop-blur-2xl md:max-w-md md:rounded-3xl"
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="font-serif-display text-xl text-white">{ui('title.familyAccess')}</h2>
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
                  {canEdit && (
                    <button
                      type="button"
                      onClick={togglePublic}
                      disabled={publicBusy}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors hover:bg-white/10 disabled:opacity-50"
                    >
                      <span className="font-sans-label text-sm text-white/80">
                        {publicAccess ? ui('public.on') : ui('public.off')}
                      </span>
                      <span
                        className={`relative h-6 w-11 rounded-full transition-colors ${publicAccess ? 'bg-white' : 'bg-white/15'}`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${publicAccess ? 'left-[1.4rem] bg-black' : 'left-0.5 bg-white/80'}`}
                        />
                      </span>
                    </button>
                  )}
                  {canEdit ? (
                    <form onSubmit={invite} className="flex flex-col gap-2">
                      <span className="font-sans-label text-[0.65rem] tracking-[0.16em] text-white/40 uppercase">
                        Invite a relative
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="their@email.com"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 font-sans-label text-sm text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
                      />
                      <div className="flex gap-1.5">
                        {[
                          { id: 'viewer', label: 'Can view' },
                          { id: 'editor', label: 'Can edit' },
                        ].map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setInviteRole(r.id)}
                            className={`flex-1 rounded-xl px-3 py-2 font-sans-label text-sm transition-colors ${
                              inviteRole === r.id
                                ? 'bg-white text-black'
                                : 'border border-white/10 text-white/60 hover:text-white'
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="submit"
                        disabled={busy || !email.trim()}
                        className="rounded-xl bg-white px-4 py-3 font-sans-label text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-40"
                      >
                        Send invite
                      </button>
                      <p className="font-sans-label text-[0.65rem] leading-relaxed text-white/30">
                        Editors can add and change people. Viewers can browse, search, and add memories.
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
                    {ui('action.signOut')}
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
