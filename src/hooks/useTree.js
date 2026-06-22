import { useContext } from 'react'
import { TreeContext } from '../context/treeContext'

export function useTree() {
  const context = useContext(TreeContext)
  if (!context) {
    throw new Error('useTree must be used within a TreeProvider')
  }
  return context
}
