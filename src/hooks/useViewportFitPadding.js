import { useEffect, useState } from 'react'
import { getViewportFitPadding } from '../utils/mobileChrome'

export function useViewportFitPadding() {
  const [padding, setPadding] = useState(getViewportFitPadding)

  useEffect(() => {
    const update = () => setPadding(getViewportFitPadding())
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return padding
}
