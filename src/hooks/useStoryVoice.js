import { useCallback, useRef } from 'react'

const SPEECH_LANG = {
  en: 'en-US',
  fr: 'fr-FR',
  ln: 'fr-FR',
  sw: 'sw-KE',
}

export function useStoryVoice(language) {
  const utterRef = useRef(null)

  const cancel = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    utterRef.current = null
  }, [])

  const speak = useCallback(
    (text) => {
      if (typeof window === 'undefined' || !window.speechSynthesis || !text?.trim()) {
        return Promise.resolve()
      }
      cancel()
      return new Promise((resolve) => {
        const utter = new SpeechSynthesisUtterance(text.trim())
        utter.lang = SPEECH_LANG[language] ?? 'en-US'
        utter.rate = 0.91
        utter.pitch = 1
        utter.onend = () => {
          utterRef.current = null
          resolve()
        }
        utter.onerror = () => {
          utterRef.current = null
          resolve()
        }
        utterRef.current = utter
        window.speechSynthesis.speak(utter)
      })
    },
    [language, cancel],
  )

  return { speak, cancel }
}
