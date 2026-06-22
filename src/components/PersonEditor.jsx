import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useTree } from '../hooks/useTree'
import { useLanguage } from '../hooks/useLanguage'
import { getDisplayName } from '../utils/personColor'

const FIELD =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 font-sans-label text-sm text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none'
const LABEL = 'font-sans-label text-[0.65rem] tracking-[0.16em] text-white/40 uppercase'

const RELATIONS = [
  { id: 'child', label: 'Child' },
  { id: 'parent', label: 'Parent' },
  { id: 'partner', label: 'Partner' },
  { id: 'sibling', label: 'Sibling' },
]

const EMPTY = {
  name: '',
  gender: '',
  birthYear: '',
  deathYear: '',
  role: '',
  story: '',
  photo: '',
  photoPath: '',
}

export default function PersonEditor() {
  const { editorState, closeEditor, actions, people, navigateTo, canEdit } = useTree()
  const { t, language: lang } = useLanguage()
  const [form, setForm] = useState(EMPTY)
  const [relation, setRelation] = useState('child')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const mode = editorState?.mode
  const editing = mode === 'edit' ? people[editorState.personId] : null
  const relativeTo = editorState?.relativeTo
    ? people[editorState.relativeTo]
    : null
  const activeLang = lang || 'en'

  // Reset the form whenever the editor target changes (React-endorsed
  // "adjust state during render" pattern instead of an effect).
  const editorKey = editorState
    ? `${editorState.mode}:${editorState.personId ?? editorState.relativeTo ?? 'new'}`
    : null
  const [syncedKey, setSyncedKey] = useState(null)
  if (editorKey !== syncedKey) {
    setSyncedKey(editorKey)
    if (editing) {
      setForm({
        name: editing.name ?? '',
        gender: editing.gender ?? '',
        birthYear: editing.birthYear ?? '',
        deathYear: editing.deathYear ?? '',
        role: t(editing.role) ?? '',
        story: t(editing.story) ?? '',
        photo: editing.photo ?? '',
        photoPath: editing.photo ?? '',
      })
    } else {
      setForm(EMPTY)
      setRelation('child')
    }
  }

  const title = useMemo(() => {
    if (mode === 'edit') return 'Edit person'
    if (relativeTo) return `Add relative of ${getDisplayName(relativeTo, t(relativeTo.role))}`
    return 'Add a person'
  }, [mode, relativeTo, t])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const setPhotoUrl = (e) =>
    setForm((f) => ({ ...f, photo: e.target.value, photoPath: e.target.value }))

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { url, path } = await actions.uploadPhoto(file)
      setForm((f) => ({ ...f, photo: url, photoPath: path }))
    } finally {
      setUploading(false)
    }
  }

  const buildPayload = () => {
    const roleObj = { ...(editing?.role || {}), [activeLang]: form.role }
    const storyObj = { ...(editing?.story || {}), [activeLang]: form.story }
    return {
      name: form.name.trim(),
      gender: form.gender || null,
      birthYear: form.birthYear ? Number(form.birthYear) : null,
      deathYear: form.deathYear ? Number(form.deathYear) : null,
      role: roleObj,
      story: storyObj,
      photo: (form.photo || '').trim() || null,
      photoPath: (form.photoPath || form.photo || '').trim() || null,
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = buildPayload()
      if (mode === 'edit') {
        await actions.updatePerson(editing.id, payload)
      } else {
        const newId = await actions.addPerson(payload)
        if (relativeTo) {
          if (relation === 'child') {
            await actions.linkParentChild(relativeTo.id, newId)
          } else if (relation === 'parent') {
            await actions.linkParentChild(newId, relativeTo.id)
          } else if (relation === 'partner') {
            await actions.linkPartners(relativeTo.id, newId)
          } else if (relation === 'sibling') {
            for (const parentId of relativeTo.parentIds) {
              await actions.linkParentChild(parentId, newId)
            }
          }
        }
        navigateTo(newId)
      }
      closeEditor()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editing) return
    await actions.deletePerson(editing.id)
    closeEditor()
  }

  return (
    <AnimatePresence>
      {editorState && canEdit && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            aria-label="Cancel"
            onClick={closeEditor}
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
              <h2 className="font-serif-display text-xl text-white">{title}</h2>
              <button
                type="button"
                onClick={closeEditor}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5">
              {mode === 'add' && relativeTo && (
                <div className="flex flex-col gap-1.5">
                  <span className={LABEL}>Relationship</span>
                  <div className="flex flex-wrap gap-1.5">
                    {RELATIONS.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRelation(r.id)}
                        className={`rounded-full px-3 py-1.5 font-sans-label text-sm transition-colors ${
                          relation === r.id
                            ? 'bg-white text-black'
                            : 'border border-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className={LABEL} htmlFor="ed-name">Name</label>
                <input id="ed-name" className={FIELD} value={form.name} onChange={set('name')} placeholder="Full name" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL} htmlFor="ed-role">Role ({activeLang.toUpperCase()})</label>
                <input id="ed-role" className={FIELD} value={form.role} onChange={set('role')} placeholder="e.g. father, daughter" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL} htmlFor="ed-birth">Birth year</label>
                  <input id="ed-birth" inputMode="numeric" className={FIELD} value={form.birthYear} onChange={set('birthYear')} placeholder="1948" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL} htmlFor="ed-death">Death year</label>
                  <input id="ed-death" inputMode="numeric" className={FIELD} value={form.deathYear} onChange={set('deathYear')} placeholder="—" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className={LABEL}>Gender</span>
                <div className="flex gap-1.5">
                  {['male', 'female', 'other'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, gender: f.gender === g ? '' : g }))}
                      className={`flex-1 rounded-xl px-3 py-2 font-sans-label text-sm capitalize transition-colors ${
                        form.gender === g ? 'bg-white text-black' : 'border border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className={LABEL}>Photo</span>
                <div className="flex items-center gap-3">
                  {form.photo ? (
                    <img src={form.photo} alt="" className="h-14 w-14 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-white/30">
                      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                        <path d="M4 7h3l2-2h6l2 2h3v12H4z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </span>
                  )}
                  <label className="cursor-pointer rounded-xl border border-white/10 px-3 py-2 font-sans-label text-sm text-white/70 transition-colors hover:bg-white/5">
                    {uploading ? 'Uploading…' : 'Upload photo'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
                  </label>
                </div>
                <input
                  className={FIELD}
                  value={form.photoPath?.startsWith('data:') ? '' : form.photo}
                  onChange={setPhotoUrl}
                  placeholder="…or paste an image URL"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL} htmlFor="ed-story">Story ({activeLang.toUpperCase()})</label>
                <textarea id="ed-story" rows={4} className={`${FIELD} resize-none`} value={form.story} onChange={set('story')} placeholder="A memory, a note, a life…" />
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-white/10 px-5 py-4">
              {mode === 'edit' && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-xl px-3 py-2.5 font-sans-label text-sm text-rose-300/80 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                >
                  Delete
                </button>
              )}
              <div className="flex-1" />
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-xl px-4 py-2.5 font-sans-label text-sm text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !form.name.trim()}
                onClick={handleSave}
                className="rounded-xl bg-white px-5 py-2.5 font-sans-label text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
