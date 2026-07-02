import { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage } from './useLanguage'
import { useStoryVoice } from './useStoryVoice'
import { storyCaptionBody } from '../utils/storyTour'
import { DURATION } from '../utils/motion'

const VOICE_KEY = 'family-tree-story-voice'
const STORY_GLIDE_MS = Math.round(DURATION.story * 1000)
const STORY_HOLD_MS = 5200
const STORY_TAIL_MS = 1400

export function useStoryTour({
  active,
  stops,
  people,
  focusRect,
  setStoryActive,
}) {
  const { t, ui, language } = useLanguage()
  const { speak, cancel: cancelVoice } = useStoryVoice(language)

  const [stepIndex, setStepIndex] = useState(0)
  const [voiceOn, setVoiceOnState] = useState(() => {
    if (typeof sessionStorage === 'undefined') return false
    return sessionStorage.getItem(VOICE_KEY) === '1'
  })

  const setVoiceOn = useCallback((on) => {
    setVoiceOnState(on)
    try {
      if (on) sessionStorage.setItem(VOICE_KEY, '1')
      else sessionStorage.removeItem(VOICE_KEY)
    } catch {
      // ignore
    }
  }, [])

  const stopTour = useCallback(() => {
    cancelVoice()
    setStoryActive(false)
    setStepIndex(0)
  }, [cancelVoice, setStoryActive])

  const currentStop = stops[stepIndex] ?? null
  const captionPerson = currentStop ? people[currentStop.captionId] : null
  const captionBody = storyCaptionBody(captionPerson, t, ui)

  const voiceOnRef = useRef(voiceOn)

  useEffect(() => {
    voiceOnRef.current = voiceOn
  }, [voiceOn])

  useEffect(() => {
    if (!active) {
      cancelVoice()
      return
    }
    if (!stops.length) return

    let cancelled = false
    let timer
    let kick

    const glideTo = (stop) => {
      if (!stop?.bounds) return
      focusRect(
        {
          x: stop.bounds.x + stop.bounds.w / 2,
          y: stop.bounds.y + stop.bounds.h / 2,
          w: 0,
          h: 0,
        },
        undefined,
        {
          duration: STORY_GLIDE_MS,
          ease: 'luxe',
          bounds: stop.bounds,
          margin: 28,
          padding: 0.9,
        },
      )
    }

    const runStep = async (index) => {
      if (cancelled) return
      if (index >= stops.length) {
        setStoryActive(false)
        setStepIndex(0)
        return
      }

      const stop = stops[index]
      setStepIndex(index)
      glideTo(stop)

      let waitMs = STORY_HOLD_MS
      if (voiceOnRef.current) {
        const person = people[stop.captionId]
        const text = storyCaptionBody(person, t, ui)
        if (text && text !== ui('misc.noStory')) {
          await speak(text)
          waitMs = STORY_TAIL_MS
        }
      }

      if (!cancelled) {
        timer = setTimeout(() => runStep(index + 1), waitMs)
      }
    }

    kick = setTimeout(() => runStep(0), 480)
    return () => {
      cancelled = true
      clearTimeout(kick)
      clearTimeout(timer)
      cancelVoice()
    }
  }, [active, stops, focusRect, setStoryActive, people, t, ui, speak, cancelVoice])

  return {
    stepIndex,
    currentStop,
    captionPerson,
    captionBody,
    voiceOn,
    setVoiceOn,
    stopTour,
    totalSteps: stops.length,
  }
}
