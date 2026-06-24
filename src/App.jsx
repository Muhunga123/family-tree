import { LanguageProvider } from './context/LanguageProvider'
import { AuthProvider } from './context/AuthProvider'
import { TreeProvider } from './context/TreeProvider'
import AuthGate from './components/AuthGate'
import { useTree } from './hooks/useTree'
import TopBar from './components/TopBar'
import BottomBar from './components/BottomBar'
import TreeCanvas from './components/TreeCanvas'
import OverviewCanvas from './components/OverviewCanvas'
import TimelineCanvas from './components/TimelineCanvas'
import MapCanvas from './components/MapCanvas'
import SearchOverlay from './components/SearchOverlay'
import PersonSheet from './components/PersonSheet'
import PersonEditor from './components/PersonEditor'
import ShareSheet from './components/ShareSheet'
import InstallHint from './components/InstallHint'
import RelateBar from './components/RelateBar'
import TodayBanner from './components/TodayBanner'

function LoadingScreen() {
  return (
    <div className="flex h-dvh w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
        <p className="font-sans-label text-sm text-white/40">Loading your family…</p>
      </div>
    </div>
  )
}

function AppShell() {
  const { loading, error, viewMode } = useTree()

  if (loading) return <LoadingScreen />
  if (error) {
    return (
      <div className="flex h-dvh w-full items-center justify-center px-6 text-center">
        <p className="font-sans-label text-sm text-white/60">
          Something went wrong loading the tree. Please refresh.
        </p>
      </div>
    )
  }

  const Lens =
    viewMode === 'overview'
      ? OverviewCanvas
      : viewMode === 'timeline'
        ? TimelineCanvas
        : viewMode === 'map'
          ? MapCanvas
          : TreeCanvas

  return (
    <div className="app-shell relative h-dvh w-full overflow-hidden">
      <div className="ambient-bg" aria-hidden="true" />
      <Lens />
      <TopBar />
      <TodayBanner />
      <BottomBar />
      <RelateBar />
      <SearchOverlay />
      <PersonSheet />
      <PersonEditor />
      <ShareSheet />
      <InstallHint />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AuthGate>
          <TreeProvider>
            <AppShell />
          </TreeProvider>
        </AuthGate>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App
