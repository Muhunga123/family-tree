import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useTree } from '../hooks/useTree'
import PersonCard from './PersonCard'

const LINE = 'rgba(255,255,255,0.16)'

function PartnerLink() {
  return (
    <div
      className="flex h-16 items-center self-start pt-5"
      aria-hidden="true"
    >
      <span className="mx-1 h-px w-4 bg-white/20 sm:w-6" />
      <span className="h-1.5 w-1.5 rotate-45 bg-white/40" />
      <span className="mx-1 h-px w-4 bg-white/20 sm:w-6" />
    </div>
  )
}

export default function TreeCanvas() {
  const { neighborhood, navigateTo, openPerson, focusId } = useTree()

  const outerRef = useRef(null)
  const contentRef = useRef(null)
  const focalRef = useRef(null)
  const nodeRefs = useRef(new Map())
  const [paths, setPaths] = useState([])
  const [size, setSize] = useState({ w: 0, h: 0 })

  const register = useCallback((key, el) => {
    if (el) nodeRefs.current.set(key, el)
    else nodeRefs.current.delete(key)
  }, [])

  const measure = useCallback(() => {
    const content = contentRef.current
    if (!content || !neighborhood) return

    const base = content.getBoundingClientRect()
    const anchor = (el) => {
      const r = el.getBoundingClientRect()
      const left = r.left - base.left
      const top = r.top - base.top
      return {
        topX: left + r.width / 2,
        topY: top,
        botX: left + r.width / 2,
        botY: top + r.height,
      }
    }
    const get = (key) => {
      const el = nodeRefs.current.get(key)
      return el ? anchor(el) : null
    }

    const next = []
    const focal = get(`focal`)

    // Parents -> focal + siblings (they share these parents).
    const parents = get('parents')
    if (parents && focal) {
      const childKeys = [
        'focal',
        ...neighborhood.siblings.map((s) => `sib:${s.id}`),
      ]
      const tops = childKeys.map(get).filter(Boolean)
      if (tops.length > 0) {
        const busY = (parents.botY + Math.min(...tops.map((t) => t.topY))) / 2
        next.push(`M ${parents.botX} ${parents.botY} L ${parents.botX} ${busY}`)
        const xs = tops.map((t) => t.topX)
        next.push(`M ${Math.min(...xs)} ${busY} L ${Math.max(...xs)} ${busY}`)
        for (const t of tops) next.push(`M ${t.topX} ${busY} L ${t.topX} ${t.topY}`)
      }
    }

    // Focal -> children.
    if (focal && neighborhood.children.length > 0) {
      const tops = neighborhood.children
        .map((c) => get(`child:${c.id}`))
        .filter(Boolean)
      if (tops.length > 0) {
        const busY = (focal.botY + Math.min(...tops.map((t) => t.topY))) / 2
        next.push(`M ${focal.botX} ${focal.botY} L ${focal.botX} ${busY}`)
        const xs = tops.map((t) => t.topX)
        next.push(`M ${Math.min(...xs)} ${busY} L ${Math.max(...xs)} ${busY}`)
        for (const t of tops) next.push(`M ${t.topX} ${busY} L ${t.topX} ${t.topY}`)
      }
    }

    setPaths(next)
    setSize({ w: content.offsetWidth, h: content.offsetHeight })
  }, [neighborhood])

  useLayoutEffect(() => {
    measure()
    const content = contentRef.current
    const outer = outerRef.current
    if (!content) return

    const observer = new ResizeObserver(measure)
    observer.observe(content)
    outer?.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    const raf = requestAnimationFrame(measure)

    return () => {
      observer.disconnect()
      outer?.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
      cancelAnimationFrame(raf)
    }
  }, [measure])

  // Re-center on the focal person whenever focus changes.
  useEffect(() => {
    const el = focalRef.current
    const outer = outerRef.current
    if (!el || !outer) return
    const id = requestAnimationFrame(() => {
      const er = el.getBoundingClientRect()
      const or = outer.getBoundingClientRect()
      outer.scrollBy({
        left: er.left + er.width / 2 - (or.left + or.width / 2),
        top: 0,
        behavior: 'smooth',
      })
    })
    return () => cancelAnimationFrame(id)
  }, [focusId])

  if (!neighborhood) {
    return (
      <div className="flex h-full items-center justify-center text-white/40">
        <p className="font-sans-label text-sm">No one to show yet.</p>
      </div>
    )
  }

  const { focal, parents, partners, siblings, children } = neighborhood
  const setFocalRef = (el) => {
    focalRef.current = el
    register('focal', el)
  }

  return (
    <div
      ref={outerRef}
      className="h-full w-full overflow-auto overscroll-contain"
      style={{ touchAction: 'pan-x pan-y' }}
    >
      <div
        ref={contentRef}
        className="relative mx-auto flex min-h-full min-w-full flex-col items-center justify-center gap-12 px-8 py-16 sm:gap-16"
      >
        <svg
          className="pointer-events-none absolute inset-0 overflow-visible"
          width={size.w}
          height={size.h}
          aria-hidden="true"
        >
          {paths.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={LINE}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          ))}
        </svg>

        {/* Parents row */}
        <AnimatePresence mode="popLayout">
          {parents.length > 0 && (
            <motion.div
              key={`parents-${focal.id}`}
              layout
              className="relative flex items-start justify-center gap-2"
            >
              <div ref={(el) => register('parents', el)} className="flex items-start gap-2">
                {parents.map((parent, idx) => (
                  <div key={parent.id} className="flex items-start gap-2">
                    {idx > 0 && <PartnerLink />}
                    <PersonCard person={parent} variant="default" onTap={navigateTo} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Focal row: siblings + focal + partners */}
        <div className="relative z-10 flex items-start justify-center gap-2">
          {siblings.map((sib) => (
            <div key={sib.id} ref={(el) => register(`sib:${sib.id}`, el)}>
              <PersonCard person={sib} variant="default" onTap={navigateTo} />
            </div>
          ))}

          <div ref={setFocalRef}>
            <PersonCard person={focal} variant="focal" onTap={openPerson} />
          </div>

          {partners.map((partner) => (
            <div key={partner.id} className="flex items-start gap-1">
              <PartnerLink />
              <PersonCard person={partner} variant="default" onTap={navigateTo} />
            </div>
          ))}
        </div>

        {/* Children row */}
        <AnimatePresence mode="popLayout">
          {children.length > 0 && (
            <motion.div
              key={`children-${focal.id}`}
              layout
              className="relative flex items-start justify-center gap-2"
            >
              {children.map((child) => (
                <div key={child.id} ref={(el) => register(`child:${child.id}`, el)}>
                  <PersonCard person={child} variant="default" onTap={navigateTo} />
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
