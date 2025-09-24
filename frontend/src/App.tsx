import EventsPage from './pages/EventsPage'
import AssignPage from './pages/AssignPage'
import CheckinPage from './pages/CheckinPage'
import ReportsPage from './pages/ReportsPage'
import PaymentPage from './pages/PaymentPage'
import DashboardPage from './pages/DashboardPage'
import ContentPage from './pages/ContentPage'
import PurchasePage from './pages/PurchasePage'
import { useEffect, useState } from 'react'

const tabs = [
  { key: 'dashboard', label: 'Dashboard', component: DashboardPage },
  { key: 'events', label: 'Events', component: EventsPage },
  { key: 'assign', label: 'Assign', component: AssignPage },
  { key: 'checkin', label: 'Check-in', component: CheckinPage },
  { key: 'content', label: 'Content Management', component: ContentPage },
  { key: 'reports', label: 'Reports', component: ReportsPage },
]

export default function App() {
  const [active, setActive] = useState('dashboard')
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  const isPayment = (hash || '').startsWith('#pay') || (hash || '').startsWith('#/pay')
  const isPurchase = (hash || '').startsWith('#purchase') || (hash || '').startsWith('#/purchase')
  const Active = tabs.find(t => t.key === active)!.component
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 960, margin: '0 auto' }}>
      <h1>FA Tickets – MVP</h1>
      {!isPayment && !isPurchase && (
        <nav style={{ display:'flex', gap:8, marginBottom: 16 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={()=>setActive(t.key)} style={{ padding:'8px 12px', fontWeight: active===t.key ? 700 : 400 }}>{t.label}</button>
          ))}
        </nav>
      )}
      {isPayment ? <PaymentPage /> : isPurchase ? <PurchasePage /> : <Active />}
    </main>
  )
}
