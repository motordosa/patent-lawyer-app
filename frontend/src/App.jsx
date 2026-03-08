import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './screens/Dashboard'
import Pipeline from './screens/Pipeline'
import Progress from './screens/Progress'
import ResearchAnalysis from './screens/ResearchAnalysis'
import Settings from './screens/Settings'
import Library from './screens/Library'
import './index.css'

function TabBar() {
  const tabs = [
    { to: '/', icon: '⬡', label: '대시보드' },
    { to: '/pipeline', icon: '🚀', label: '파이프라인' },
    { to: '/progress', icon: '📊', label: '진행현황' },
    { to: '/library', icon: '📚', label: '내 서재' },
    { to: '/settings', icon: '⚙️', label: '설정' },
  ]
  return (
    <nav className="tab-bar">
      {tabs.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
        >
          <span className="tab-icon">{t.icon}</span>
          <span className="tab-label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb" style={{
          width: 280, height: 280,
          background: 'rgba(50,210,201,0.06)',
          top: '60%', left: '30%', animation: 'float 9s ease-in-out infinite'
        }} />
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/research" element={<ResearchAnalysis />} />
            <Route path="/library" element={<Library />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
        <TabBar />
      </div>
    </BrowserRouter>
  )
}

export default App
