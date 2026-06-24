import { useCallback } from 'react'
import { useTree } from './useTree'

/** Standard tap: relate mode picks, otherwise navigate to focus view. */
export function usePersonNavigation({ switchToFocus = true } = {}) {
  const { navigateTo, setViewMode, relateMode, relatePick } = useTree()

  return useCallback(
    (id) => {
      if (!id) return
      if (relateMode) {
        relatePick(id)
        return
      }
      navigateTo(id)
      if (switchToFocus) setViewMode('focus')
    },
    [navigateTo, setViewMode, relateMode, relatePick, switchToFocus],
  )
}
