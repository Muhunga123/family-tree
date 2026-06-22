import { useCallback, useEffect, useMemo, useState } from 'react'
import { getRepository, isCloudEnabled } from '../data/familyRepository'
import { getNeighborhood } from '../utils/neighborhood'
import { TreeContext } from './treeContext'

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

  useEffect(() => {
    let active = true

    const apply = (next) => {
      if (!active) return
      setTree(next)
      setFocusId((current) => {
        if (current && next.people[current]) return current
        return next.rootId
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
    setFocusId(tree.rootId)
  }, [tree])

  const openPerson = useCallback((id) => setSelectedId(id), [])
  const closePerson = useCallback(() => setSelectedId(null), [])

  const openEditor = useCallback(
    (state) => {
      const isOwner = !isCloudEnabled() || tree?.myRole === 'owner'
      if (!isOwner) return
      setEditorState(state)
    },
    [tree?.myRole],
  )
  const closeEditor = useCallback(() => setEditorState(null), [])

  const canEdit = !isCloudEnabled() || tree?.myRole === 'owner'

  const value = useMemo(
    () => ({
      loading,
      error,
      tree,
      people,
      peopleList: Object.values(people),
      cloudEnabled: isCloudEnabled(),
      canEdit,
      myRole: tree?.myRole ?? (isCloudEnabled() ? 'viewer' : 'owner'),
      focusId,
      focusPerson,
      neighborhood,
      canGoBack: history.length > 0,
      navigateTo,
      goBack,
      goHome,
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
        uploadPhoto: repo.uploadPhoto.bind(repo),
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
      repo,
    ],
  )

  return <TreeContext.Provider value={value}>{children}</TreeContext.Provider>
}
