import EventsPage from './pages/EventsPage'
import AttendeesPage from './pages/AttendeesPage'
import AttendeeDetailPage from './pages/AttendeeDetailPage'
import AssignPage from './pages/AssignPage'
import CheckinPage from './pages/CheckinPage'
import ReportsPage from './pages/ReportsPage'
import PaymentPage from './pages/PaymentPage'
import DashboardPage from './pages/DashboardPage'
import ContentPage from './pages/ContentPage'
import PurchasePage from './pages/PurchasePage'
import PublicEventPage from './pages/PublicEventPage'
import TicketViewPage from './pages/TicketViewPage'
import MultiPurchasePage from './pages/MultiPurchasePage'
import InvoicePage from './pages/InvoicePage'
import { NavLink, Route, Routes, useLocation, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu, Search, Drama, ScanQrCode, ChartLine, Shield } from 'lucide-react'
import AdminEmailLogsPage from './pages/AdminEmailLogsPage'
import { ThemeToggle } from '@/components/kit'

export default function App() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false as boolean)
  const hideNav = location.pathname === '/pay'
    || location.pathname === '/purchase'
    || location.pathname === '/purchase2'
    || location.pathname.startsWith('/promo')
    || location.pathname.startsWith('/ticket')
    || location.pathname.startsWith('/eventpage')
    || location.pathname.startsWith('/invoice')
  return (
    <div className="container mx-auto max-w-5xl p-4">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">FlowEvents</h1>
        <div className="ml-auto flex items-center gap-2">
          {!hideNav && (
            <div className="sm:hidden">
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Open menu"><Menu className="h-5 w-5" /></Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <nav className="grid gap-2 mt-6">
                    <NavLink to="/events" onClick={()=> setMenuOpen(false)} className={({ isActive }) => `px-3 py-2 rounded border inline-flex items-center gap-1 ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}><Drama className="h-4 w-4" /> Events</NavLink>
                    <NavLink to="/attendees" onClick={()=> setMenuOpen(false)} className={({ isActive }) => `px-3 py-2 rounded border inline-flex items-center gap-1 ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}><Search className="h-4 w-4" /> Tickets</NavLink>
                    <NavLink to="/checkin" onClick={()=> setMenuOpen(false)} className={({ isActive }) => `px-3 py-2 rounded border inline-flex items-center gap-1 ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}><ScanQrCode className="h-4 w-4" /> Check in</NavLink>
                    <NavLink to="/reports" onClick={()=> setMenuOpen(false)} className={({ isActive }) => `px-3 py-2 rounded border inline-flex items-center gap-1 ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}><ChartLine className="h-4 w-4" /> Reports</NavLink>
                    <NavLink to="/admin/email-logs" onClick={()=> setMenuOpen(false)} className={({ isActive }) => `px-3 py-2 rounded border inline-flex items-center gap-1 ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}><Shield className="h-4 w-4" /> App Admin</NavLink>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          )}
          <ThemeToggle />
        </div>
      </div>
      {!hideNav && (
        <nav className="mb-8 hidden sm:flex flex-wrap gap-2">
          <NavLink to="/events" className={({ isActive }) => `px-3 py-1 rounded border inline-flex items-center gap-1 ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}><Drama className="h-4 w-4" /> Events</NavLink>
          <NavLink to="/attendees" className={({ isActive }) => `px-3 py-1 rounded border inline-flex items-center gap-1 ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}><Search className="h-4 w-4" /> Tickets</NavLink>
          <NavLink to="/checkin" className={({ isActive }) => `px-3 py-1 rounded border inline-flex items-center gap-1 ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}><ScanQrCode className="h-4 w-4" /> Check in</NavLink>
          <NavLink to="/reports" className={({ isActive }) => `px-3 py-1 rounded border inline-flex items-center gap-1 ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}><ChartLine className="h-4 w-4" /> Reports</NavLink>
          <NavLink to="/admin/email-logs" className={({ isActive }) => `px-3 py-1 rounded border inline-flex items-center gap-1 ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}><Shield className="h-4 w-4" /> App Admin</NavLink>
        </nav>
      )}
      <div className="min-h-[60vh]">
        <Routes>
          <Route path="/" element={<Navigate to="/events" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/new" element={<EventsPage />} />
          <Route path="/events/:id" element={<EventsPage />} />
          <Route path="/events/:id/edit" element={<EventsPage />} />
          <Route path="/events/:id/overview" element={<EventsPage />} />
          <Route path="/events/:id/attendees" element={<EventsPage />} />
          <Route path="/events/:id/purchases" element={<EventsPage />} />
          <Route path="/events/:id/ticket-types" element={<EventsPage />} />
          <Route path="/events/:id/promote" element={<EventsPage />} />
          <Route path="/events/:id/invite" element={<EventsPage />} />
          <Route path="/assign" element={<AssignPage />} />
          <Route path="/checkin" element={<CheckinPage />} />
          <Route path="/content" element={<ContentPage />} />
          <Route path="/purchase" element={<PurchasePage />} />
          <Route path="/purchase2" element={<MultiPurchasePage />} />
          <Route path="/invoice/:id" element={<InvoicePage />} />
          <Route path="/pay" element={<PaymentPage />} />
          <Route path="/promo/:id" element={<PublicEventPage />} />
          <Route path="/eventpage" element={<PublicEventPage />} />
          <Route path="/ticket" element={<TicketViewPage />} />
          <Route path="/attendees" element={<AttendeesPage />} />
          <Route path="/attendees/:id" element={<AttendeeDetailPage />} />
          <Route path="/attendees/:id/overview" element={<AttendeeDetailPage />} />
          <Route path="/attendees/:id/tickets" element={<AttendeeDetailPage />} />
          <Route path="/attendees/:id/purchases" element={<AttendeeDetailPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/admin/email-logs" element={<AdminEmailLogsPage />} />
        </Routes>
      </div>
    </div>
  )
}
