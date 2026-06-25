import { useEffect, useState } from 'react'
import { useTree } from '../hooks/useTree'
import { useLanguage } from '../hooks/useLanguage'

export default function MemoriesPanel({ personId }) {
  const { actions, canEdit } = useTree()
  const { ui } = useLanguage()
  const [memories, setMemories] = useState([])
  const [author, setAuthor] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)

  const reload = async () => {
    const list = await actions.listMemories(personId)
    setMemories(list)
  }

  useEffect(() => {
    let active = true
    actions.listMemories(personId).then((list) => {
      if (active) setMemories(list)
    })
    return () => {
      active = false
    }
  }, [personId, actions])

  const submit = async (e) => {
    e.preventDefault()
    if (!body.trim()) return
    setBusy(true)
    try {
      await actions.addMemory(personId, { author, body })
      setBody('')
      await reload()
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-sans-label text-[0.65rem] tracking-[0.18em] text-white/35 uppercase">
          {ui('label.memories')}
        </h3>
        {canEdit && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="font-sans-label text-xs text-white/55 hover:text-white"
          >
            {ui('memory.add')}
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={submit} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder={ui('memory.yourName')}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-sans-label text-sm text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder={ui('memory.placeholder')}
            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-sans-label text-sm text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !body.trim()}
            className="self-end rounded-xl bg-white px-4 py-2 font-sans-label text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-40"
          >
            {ui('memory.post')}
          </button>
        </form>
      )}

      {memories.length === 0 ? (
        <p className="font-sans-label text-sm text-white/40">{ui('memory.empty')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {memories.map((m) => (
            <div key={m.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="font-serif-display text-sm leading-relaxed text-white/85">{m.body}</p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="font-sans-label text-[0.65rem] text-white/40">
                  {m.author || '—'}
                </span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={async () => {
                      await actions.deleteMemory(m.id)
                      await reload()
                    }}
                    className="font-sans-label text-[0.65rem] text-rose-300/70 hover:text-rose-300"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
