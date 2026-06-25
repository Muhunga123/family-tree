import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useTree } from '../hooks/useTree'
import { useLanguage } from '../hooks/useLanguage'
import { getDisplayName } from '../utils/personColor'
import { fillRoleTranslations } from '../utils/roleTranslations'
import { DURATION, EASE_LUXE } from '../utils/motion'

const FIELD =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 font-sans-label text-base text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none sm:text-sm'
const LABEL = 'font-sans-label text-[0.65rem] tracking-[0.16em] text-white/40 uppercase'

const RELATIONS = [
  { id: 'partner', label: 'Partner / spouse' },
  { id: 'child', label: 'Child' },
  { id: 'parent', label: 'Parent' },
  { id: 'sibling', label: 'Sibling' },
]

const EMPTY = {
  name: '',
  gender: '',
  birthYear: '',
  deathYear: '',
  birthDate: '',
  deathDate: '',
  birthPlace: '',
  places: '',
  role: '',
  story: '',
  photo: '',
  photoPath: '',
}

export default function PersonEditor() {
  const {
    editorState,
    closeEditor,
    actions,
    people,
    peopleList,
    navigateTo,
    canEdit,
    meId,
    setMeId,
  } = useTree()
  const { t, ui, language: lang } = useLanguage()
  const [form, setForm] = useState(EMPTY)
  const [linkToIds, setLinkToIds] = useState([])
  const [sharedParentIds, setSharedParentIds] = useState([])
  const [linkType, setLinkType] = useState('child')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const allowsMultiple = linkType === 'child'

  const siblingAnchorId = linkType === 'sibling' ? linkToIds[0] : null
  const siblingAnchor = siblingAnchorId ? people[siblingAnchorId] : null

  const mode = editorState?.mode
  const editing = mode === 'edit' ? people[editorState.personId] : null
  const relativeTo = editorState?.relativeTo
    ? people[editorState.relativeTo]
    : null
  const activeLang = lang || 'en'

  const sortedPeople = useMemo(
    () =>
      [...peopleList]
        .filter((p) => p.id !== editing?.id)
        .sort((a, b) =>
          getDisplayName(a, t(a.role)).localeCompare(getDisplayName(b, t(b.role))),
        ),
    [peopleList, editing?.id, t],
  )

  const editorKey = editorState
    ? `${editorState.mode}:${editorState.personId ?? editorState.relativeTo ?? 'new'}`
    : null

  useEffect(() => {
    if (!editorKey) return
    const id = requestAnimationFrame(() => {
      if (editing) {
        setForm({
          name: editing.name ?? '',
          gender: editing.gender ?? '',
          birthYear: editing.birthYear ?? '',
          deathYear: editing.deathYear ?? '',
          birthDate: editing.birthDate ?? '',
          deathDate: editing.deathDate ?? '',
          birthPlace: editing.birthPlace ?? '',
          places: (editing.places ?? [])
            .map((p) => (typeof p === 'string' ? p : p?.label))
            .filter(Boolean)
            .join(', '),
          role: t(editing.role) ?? '',
          story: t(editing.story) ?? '',
          photo: editing.photo ?? '',
          photoPath: editing.photo ?? '',
        })
        setLinkToIds([])
        setSharedParentIds([])
        setLinkType('child')
      } else {
        setForm(EMPTY)
        setLinkToIds(relativeTo ? [relativeTo.id] : [])
        setSharedParentIds([])
        setLinkType('child')
      }
    })
    return () => cancelAnimationFrame(id)
  }, [editorKey, editing, relativeTo, t])

  const toggleLinkPerson = (id) => {
    setLinkToIds((ids) => {
      if (allowsMultiple) {
        return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
      }
      return ids.includes(id) ? [] : [id]
    })
  }

  const pickLinkType = (type) => {
    setLinkType(type)
    if (type !== 'child') {
      setLinkToIds((ids) => ids.slice(0, 1))
    }
    if (type !== 'sibling') {
      setSharedParentIds([])
    }
    // When adding a relative, keep the anchor person selected for sibling/partner/parent.
    if (type !== 'child' && relativeTo && !editing) {
      setLinkToIds([relativeTo.id])
    }
  }

  const toggleSharedParent = (id) => {
    setSharedParentIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    )
  }

  const title = useMemo(() => {
    if (mode === 'edit') return ui('title.editPerson')
    if (relativeTo)
      return `${ui('action.addRelative').replace('+ ', '')} · ${getDisplayName(relativeTo, t(relativeTo.role))}`
    return ui('title.addPerson')
  }, [mode, relativeTo, t, ui])

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

  const buildPayload = () => ({
    name: form.name.trim(),
    gender: form.gender || null,
    birthYear: form.birthYear ? Number(form.birthYear) : null,
    deathYear: form.deathYear ? Number(form.deathYear) : null,
    birthDate: form.birthDate || null,
    deathDate: form.deathDate || null,
    birthPlace: form.birthPlace.trim() || null,
    places: form.places
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    role: fillRoleTranslations(form.role, editing?.role, activeLang),
    story: { ...(editing?.story || { en: '', fr: '', ln: '', sw: '' }), [activeLang]: form.story },
    photo: (form.photo || '').trim() || null,
    photoPath: (form.photoPath || form.photo || '').trim() || null,
  })

  const isMe = editing && meId === editing.id

  const currentRelationships =
    editing && mode === 'edit'
      ? [
          ...editing.parentIds.map((id) => ({ id, kind: 'parent', label: ui('label.parents') })),
          ...editing.partnerIds.map((id) => ({ id, kind: 'partner', label: ui('label.partner') })),
          ...editing.childIds.map((id) => ({ id, kind: 'child', label: ui('label.children') })),
          ...(editing.explicitSiblingIds ?? []).map((id) => ({
            id,
            kind: 'sibling',
            label: ui('label.siblings'),
          })),
        ]
      : []

  const unlink = async (rel) => {
    if (!editing) return
    if (rel.kind === 'partner') await actions.unlinkPartners(editing.id, rel.id)
    else if (rel.kind === 'parent') await actions.unlinkParentChild(rel.id, editing.id)
    else if (rel.kind === 'child') await actions.unlinkParentChild(editing.id, rel.id)
    else if (rel.kind === 'sibling') await actions.unlinkSiblings(editing.id, rel.id)
  }

  const linkSibling = async (personId, anchorId) => {
    await actions.linkSiblings(anchorId, personId)
    for (const parentId of sharedParentIds) {
      await actions.linkParentChild(parentId, personId)
    }
  }

  const linkNewPerson = async (newId, anchorId, type) => {
    if (!anchorId) return
    if (type === 'child') {
      await actions.linkParentChild(anchorId, newId)
    } else if (type === 'parent') {
      await actions.linkParentChild(newId, anchorId)
    } else if (type === 'partner') {
      await actions.linkPartners(anchorId, newId)
    } else if (type === 'sibling') {
      await linkSibling(newId, anchorId)
    }
  }

  const linkExistingPerson = async (personId, anchorId, type) => {
    if (!anchorId || personId === anchorId) return
    if (type === 'child') {
      await actions.linkParentChild(anchorId, personId)
    } else if (type === 'parent') {
      await actions.linkParentChild(personId, anchorId)
    } else if (type === 'partner') {
      await actions.linkPartners(anchorId, personId)
    } else if (type === 'sibling') {
      await linkSibling(personId, anchorId)
    }
  }

  const resolveAnchors = () => {
    if (linkToIds.length > 0) return linkToIds
    if (relativeTo) return [relativeTo.id]
    return []
  }

  const canSaveSibling = linkType !== 'sibling' || !!siblingAnchorId

  const handleSave = async () => {
    if (!canSaveSibling) return
    setSaving(true)
    try {
      const payload = buildPayload()
      const anchors = resolveAnchors()

      if (mode === 'edit') {
        await actions.updatePerson(editing.id, payload)
        for (const anchorId of anchors) {
          await linkExistingPerson(editing.id, anchorId, linkType)
        }
      } else {
        const newId = await actions.addPerson(payload)
        for (const anchorId of anchors) {
          await linkNewPerson(newId, anchorId, linkType)
        }
        navigateTo(anchors[0] || newId)
      }
      closeEditor()
    } catch (err) {
      console.error('Save failed:', err)
      alert(
        err?.message?.includes('relationships_kind_check') ||
          err?.message?.includes('sibling')
          ? 'Could not save the sibling link. Run supabase/sibling-relationships.sql (or feature-tracks.sql) in Supabase, then try again.'
          : 'Could not save. Please try again.',
      )
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
          transition={{ duration: DURATION.fade, ease: EASE_LUXE }}
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
            className="relative flex max-h-[min(92dvh,900px)] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-ink-2/95 shadow-2xl backdrop-blur-2xl md:max-w-md md:rounded-3xl"
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: DURATION.sheet, ease: EASE_LUXE }}
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

            <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-5 sm:py-5">
              <div className="flex flex-col gap-2">
                <span className={LABEL}>Relationship</span>
                <div className="flex flex-wrap gap-1.5">
                  {RELATIONS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => pickLinkType(r.id)}
                      className={`rounded-full px-3 py-1.5 font-sans-label text-sm transition-colors ${
                        linkType === r.id
                          ? 'bg-white text-black'
                          : 'border border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className={LABEL}>
                  {linkType === 'child'
                    ? 'Parents (select father, mother, or both)'
                    : linkType === 'partner'
                      ? 'Partner of'
                      : linkType === 'parent'
                        ? 'Child of'
                        : 'Sibling of'}
                </span>
                <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-2">
                  {sortedPeople.map((p) => {
                    const selected = linkToIds.includes(p.id)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleLinkPerson(p.id)}
                        className={`rounded-full px-3 py-1.5 font-sans-label text-sm transition-colors ${
                          selected
                            ? 'bg-white text-black'
                            : 'border border-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        {getDisplayName(p, t(p.role))}
                      </button>
                    )
                  })}
                </div>
                {linkToIds.length > 0 && (
                  <p className="font-sans-label text-xs text-white/45">
                    Selected: {linkToIds.map((id) => getDisplayName(people[id], t(people[id]?.role))).join(', ')}
                  </p>
                )}
                <p className="font-sans-label text-[0.65rem] leading-relaxed text-white/35">
                  {linkType === 'child'
                    ? 'Tip: tap both father and mother so the child appears under both on the tree.'
                    : linkType === 'sibling'
                      ? siblingAnchor
                        ? `Links as sibling of ${getDisplayName(siblingAnchor, t(siblingAnchor.role))}. Shared parents are optional — use them only for blood siblings on the same branch.`
                        : 'Pick who they are a sibling of. No shared parents required (e.g. your mother\'s sister).'
                      : 'Tap a person to connect them. For partners, pick one person.'}
                </p>
              </div>

              {linkType === 'sibling' && siblingAnchorId && (
                <div className="flex flex-col gap-1.5">
                  <span className={LABEL}>Shared parent(s) — optional</span>
                  <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-2">
                    {sortedPeople
                      .filter((p) => p.id !== siblingAnchorId && p.id !== editing?.id)
                      .map((p) => {
                        const selected = sharedParentIds.includes(p.id)
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggleSharedParent(p.id)}
                            className={`rounded-full px-3 py-1.5 font-sans-label text-sm transition-colors ${
                              selected
                                ? 'bg-white text-black'
                                : 'border border-white/10 text-white/60 hover:text-white'
                            }`}
                          >
                            {getDisplayName(p, t(p.role))}
                          </button>
                        )
                      })}
                  </div>
                  <p className="font-sans-label text-[0.65rem] text-white/35">
                    Only needed if they share the same mother and/or father. Skip this for
                    in-laws, step-siblings, or relatives on another branch.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className={LABEL} htmlFor="ed-name">Name</label>
                <input id="ed-name" className={FIELD} value={form.name} onChange={set('name')} placeholder="Full name" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL} htmlFor="ed-role">
                  Role ({activeLang.toUpperCase()}) — auto-fills SW/FR/LN
                </label>
                <input
                  id="ed-role"
                  className={FIELD}
                  value={form.role}
                  onChange={set('role')}
                  placeholder="e.g. wife, daughter, husband"
                />
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

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL} htmlFor="ed-bdate">Date of birth (optional)</label>
                  <input id="ed-bdate" type="date" className={FIELD} value={form.birthDate || ''} onChange={set('birthDate')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL} htmlFor="ed-ddate">Date of passing (optional)</label>
                  <input id="ed-ddate" type="date" className={FIELD} value={form.deathDate || ''} onChange={set('deathDate')} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL} htmlFor="ed-bplace">{ui('label.born')} — {ui('label.places')}</label>
                <input id="ed-bplace" className={FIELD} value={form.birthPlace} onChange={set('birthPlace')} placeholder="e.g. Kinshasa" />
                <input
                  className={FIELD}
                  value={form.places}
                  onChange={set('places')}
                  placeholder="Other places (comma separated)"
                />
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

              {mode === 'edit' && currentRelationships.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className={LABEL}>Existing links (tap ✕ to unlink)</span>
                  <div className="flex flex-wrap gap-2">
                    {currentRelationships.map((rel) => (
                      <span
                        key={`${rel.kind}-${rel.id}`}
                        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-1 pr-1.5 pl-3 font-sans-label text-sm text-white/75"
                      >
                        {getDisplayName(people[rel.id], t(people[rel.id]?.role))}
                        <button
                          type="button"
                          onClick={() => unlink(rel)}
                          aria-label="Unlink"
                          className="flex h-5 w-5 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-rose-500/20 hover:text-rose-300"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {mode === 'edit' && (
                <button
                  type="button"
                  onClick={() => setMeId(isMe ? null : editing.id)}
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-sans-label text-sm transition-colors ${
                    isMe
                      ? 'bg-white/15 text-white'
                      : 'border border-white/10 text-white/70 hover:bg-white/5'
                  }`}
                >
                  {isMe ? '✓ This is me' : 'Mark as “me” (for “How are we related?”)'}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-white/10 px-5 py-4">
              {mode === 'edit' && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-xl px-3 py-2.5 font-sans-label text-sm text-rose-300/80 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                >
                  {ui('action.delete')}
                </button>
              )}
              <div className="flex-1" />
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-xl px-4 py-2.5 font-sans-label text-sm text-white/60 hover:text-white"
              >
                {ui('action.cancel')}
              </button>
              <button
                type="button"
                disabled={saving || !form.name.trim() || !canSaveSibling}
                onClick={handleSave}
                className="rounded-xl bg-white px-5 py-2.5 font-sans-label text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-40"
              >
                {saving ? ui('action.saving') : ui('action.save')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
