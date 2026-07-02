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
      <div className="loading-screen">
        <span className="loading-ring" aria-hidden="true" />
        <p className="loading-title">Our Family</p>
        <p className="loading-sub">Loading your lineage…</p>
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
        <div className="glass-panel max-w-md rounded-2xl px-8 py-10">
          <p className="font-serif-display text-xl text-white/90">Our Family</p>
          <p className="mt-3 font-sans-label text-sm leading-relaxed text-white/55">
            Something went wrong loading the tree. Please refresh, or ask the family admin for the
            public link.
          </p>
        </div>
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
