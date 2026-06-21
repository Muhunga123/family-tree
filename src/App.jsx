import FamilyTree from './components/FamilyTree'
import { LanguageProvider } from './context/LanguageProvider'

function App() {
  return (
    <LanguageProvider>
      <FamilyTree />
    </LanguageProvider>
  )
}

export default App
