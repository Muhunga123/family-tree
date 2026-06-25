import { useAuth } from '../hooks/useAuth'

export default function AuthGate({ children }) {
  const { ready } = useAuth()

  if (!ready) {
    return (
      <div className="flex h-dvh w-full items-center justify-center">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
      </div>
    )
  }

  return children
}
