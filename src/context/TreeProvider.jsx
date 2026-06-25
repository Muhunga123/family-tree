import { useCallback, useEffect, useMemo, useState } from 'react'
import { getRepository, isCloudEnabled } from '../data/familyRepository'
import { getNeighborhood } from '../utils/neighborhood'
import { maxGenerationDepth, byBirthYear, pickHomeFocusId } from '../data/normalizeFamily'
import { getDisplayName } from '../utils/personColor'
import { TreeContext } from './treeContext'

const ME_KEY = 'family-tree-me'

export function TreeProvider({ children }) {
  const repo = useMemo(() => getRepository(), [])

  const [tree, setTree] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [focusId, setFocusId] = useState(null)
  const [history, setHistory] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [editorState, setEditorState] = useState(null)
  const [viewMode, setViewMode] = useState('focus')
  const [storyActive, setStoryActive] = useState(false)

  // "How are we related?" mode.
  const [relateMode, setRelateMode] = useState(false)
  const [relateAnchorId, setRelateAnchorId] = useState(null)
  const [relateTargetId, setRelateTargetId] = useState(null)

  // The person the viewer identifies as (persisted), used as the relate anchor.
  const [meId, setMeIdState] = useState(() => {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(ME_KEY) || null
  })
  const setMeId = useCallback((id) => {
    setMeIdState(id)
    try {
      if (id) localStorage.setItem(ME_KEY, id)
      else localStorage.removeItem(ME_KEY)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    let active = true

    const apply = (next) => {
      if (!active) return
      setTree((prev) => {
        if (
          prev &&
          prev.rootId === next.rootId &&
          prev.myRole === next.myRole &&
          prev.publicAccess === next.publicAccess &&
          Object.keys(prev.people).length === Object.keys(next.people).length
        ) {
          // Skip re-render when realtime echoes our own edit back unchanged.
          let same = true
          for (const id of Object.keys(next.people)) {
            const a = prev.people[id]
            const b = next.people[id]
            if (
              !a ||
              !b ||
              a.name !== b.name ||
              a.birthYear !== b.birthYear ||
              a.deathYear !== b.deathYear ||
              a.photo !== b.photo ||
              a.parentIds.join(',') !== b.parentIds.join(',') ||
              a.childIds.join(',') !== b.childIds.join(',') ||
              a.partnerIds.join(',') !== b.partnerIds.join(',') ||
              a.siblingIds.join(',') !== b.siblingIds.join(',')
            ) {
              same = false
              break
            }
          }
          if (same) return prev
        }
        return next
      })
      setFocusId((current) => {
        if (current && next.people[current]) return current
        let storedMe = null
        try {
          storedMe = localStorage.getItem(ME_KEY)
        } catch {
          // ignore
        }
        return pickHomeFocusId(next.people, storedMe)
      })
      setLoading(false)
    }

    repo
      .loadTree()
      .then(apply)
      .catch((err) => {
        if (!active) return
        setError(err)
        setLoading(false)
      })

    const unsubscribe = repo.subscribe(apply)
    return () => {
      active = false
      unsubscribe?.()
    }
  }, [repo])

  const people = useMemo(() => tree?.people ?? {}, [tree])
  const focusPerson = focusId ? people[focusId] : null

  const neighborhood = useMemo(() => {
    if (!focusId || !people[focusId]) return null
    return getNeighborhood(people, focusId)
  }, [people, focusId])

  const navigateTo = useCallback(
    (id) => {
      if (!id || id === focusId) return
      setHistory((h) => [...h, focusId].filter(Boolean))
      setFocusId(id)
    },
    [focusId],
  )

  const goBack = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h
      const next = [...h]
      const prev = next.pop()
      setFocusId(prev)
      return next
    })
  }, [])

  const goHome = useCallback(() => {
    if (!tree) return
    setHistory([])
    setFocusId(pickHomeFocusId(tree.people, meId))
    setViewMode('focus')
    setStoryActive(false)
    setRelateMode(false)
  }, [tree, meId])

  const startRelate = useCallback(() => {
    setRelateMode(true)
    setRelateTargetId(null)
    setRelateAnchorId(meId && people[meId] ? meId : focusId)
  }, [meId, focusId, people])

  const stopRelate = useCallback(() => {
    setRelateMode(false)
    setRelateAnchorId(null)
    setRelateTargetId(null)
  }, [])

  const relatePick = useCallback(
    (id) => {
      if (!id) return
      if (!relateAnchorId) {
        setRelateAnchorId(id)
        return
      }
      setRelateTargetId(id)
    },
    [relateAnchorId],
  )

  const resetRelate = useCallback(() => {
    setRelateAnchorId(meId && people[meId] ? meId : null)
    setRelateTargetId(null)
  }, [meId, people])

  const relateFrom = useCallback((id) => {
    setRelateMode(true)
    setRelateAnchorId(id)
    setRelateTargetId(null)
  }, [])

  const openPerson = useCallback((id) => setSelectedId(id), [])
  const closePerson = useCallback(() => setSelectedId(null), [])

  const canEdit = !isCloudEnabled() || tree?.myRole === 'owner'

  const openEditor = useCallback(
    (state) => {
      if (!canEdit) return
      setEditorState(state)
    },
    [canEdit],
  )
  const closeEditor = useCallback(() => setEditorState(null), [])

  const maxDepth = useMemo(() => maxGenerationDepth(people), [people])

  const peopleList = useMemo(
    () =>
      Object.values(people).sort(
        (a, b) =>
          byBirthYear(a, b) ||
          getDisplayName(a).localeCompare(getDisplayName(b)) ||
          a.id.localeCompare(b.id),
      ),
    [people],
  )

  const value = useMemo(
    () => ({
      loading,
      error,
      tree,
      people,
      peopleList,
      cloudEnabled: isCloudEnabled(),
      canEdit,
      myRole: tree?.myRole ?? (isCloudEnabled() ? 'viewer' : 'owner'),
      publicAccess: tree?.publicAccess ?? false,
      maxDepth,
      focusId,
      focusPerson,
      neighborhood,
      canGoBack: history.length > 0,
      navigateTo,
      goBack,
      goHome,
      viewMode,
      setViewMode,
      storyActive,
      setStoryActive,
      relateMode,
      relateAnchorId,
      relateTargetId,
      startRelate,
      stopRelate,
      relatePick,
      resetRelate,
      relateFrom,
      meId,
      setMeId,
      selectedId,
      selectedPerson: selectedId ? people[selectedId] : null,
      openPerson,
      closePerson,
      searchOpen,
      setSearchOpen,
      shareOpen,
      setShareOpen,
      editorState,
      openEditor,
      closeEditor,
      actions: {
        addPerson: repo.addPerson.bind(repo),
        updatePerson: repo.updatePerson.bind(repo),
        deletePerson: repo.deletePerson.bind(repo),
        linkPartners: repo.linkPartners.bind(repo),
        linkParentChild: repo.linkParentChild.bind(repo),
        linkSiblings: repo.linkSiblings.bind(repo),
        unlinkPartners: repo.unlinkPartners.bind(repo),
        unlinkParentChild: repo.unlinkParentChild.bind(repo),
        unlinkSiblings: repo.unlinkSiblings.bind(repo),
        uploadPhoto: repo.uploadPhoto.bind(repo),
        listMemories: repo.listMemories.bind(repo),
        addMemory: repo.addMemory.bind(repo),
        deleteMemory: repo.deleteMemory.bind(repo),
        setPublicAccess: repo.setPublicAccess.bind(repo),
        listMembers: repo.listMembers.bind(repo),
        listInvites: repo.listInvites.bind(repo),
        inviteMember: repo.inviteMember.bind(repo),
        removeMember: repo.removeMember.bind(repo),
        removeInvite: repo.removeInvite.bind(repo),
      },
    }),
    [
      loading,
      error,
      tree,
      people,
      peopleList,
      focusId,
      focusPerson,
      neighborhood,
      history.length,
      navigateTo,
      goBack,
      goHome,
      selectedId,
      openPerson,
      closePerson,
      searchOpen,
      shareOpen,
      editorState,
      openEditor,
      closeEditor,
      canEdit,
      viewMode,
      storyActive,
      relateMode,
      relateAnchorId,
      relateTargetId,
      startRelate,
      stopRelate,
      relatePick,
      resetRelate,
      relateFrom,
      meId,
      setMeId,
      maxDepth,
      repo,
    ],
  )

  return <TreeContext.Provider value={value}>{children}</TreeContext.Provider>
}
