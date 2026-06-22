import { useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { AuthContext } from './authContext'

const cloudEnabled = isSupabaseConfigured()

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(!cloudEnabled)

  useEffect(() => {
    if (!cloudEnabled) return

    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session ?? null)
      setReady(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null)
    })

    return () => {
      active = false
      sub?.subscription?.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      cloudEnabled,
      ready,
      session,
      user: session?.user ?? null,
      async signInWithEmail(email) {
        if (!cloudEnabled) return { error: null }
        return supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        })
      },
      async signOut() {
        if (!cloudEnabled) return
        await supabase.auth.signOut()
      },
    }),
    [ready, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
