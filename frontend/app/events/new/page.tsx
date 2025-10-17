"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api/client'

function toIsoWithTime(date: string, time: string) {
  // Interpret as UTC to align with backend expectations and avoid TZ drift
  if (!date || !time) return undefined as any
  return new Date(`${date}T${time}:00Z`).toISOString()
}

function todayYMD() {
  const d = new Date()
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function NewEventPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState(todayYMD())
  const [endDate, setEndDate] = useState(todayYMD())
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('17:00')
  const [location, setLocation] = useState('')
  const [mapsUrl, setMapsUrl] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function onCreate() {
    try {
      setBusy(true); setErr('')
      if (!title.trim()) throw new Error('Title is required')
      const starts_at = toIsoWithTime(startDate, startTime)
      const ends_at = endTime ? toIsoWithTime(endDate || startDate, endTime) : undefined
      const body: any = {
        title: title.trim(),
        starts_at,
        ends_at,
        location: location || undefined,
        address_maps_link: mapsUrl || undefined,
        contact_phone: contactPhone || undefined,
        contact_email: contactEmail || undefined,
      }
      const ev = await api.createEvent(body)
      router.push(`/events/${ev.id}/overview`)
    } catch (e: any) {
      setErr(e?.message || 'Failed to create event')
    } finally { setBusy(false) }
  }

  return (
    <section className="space-y-4">
      <div>
        <a href="/events" className="group inline-flex items-center gap-2 text-sm px-2 py-1 rounded border border-transparent hover:border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <span className="inline-block">←</span>
          <span className="sr-only sm:not-sr-only sm:inline">Back to Events</span>
        </a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_3fr] gap-6">
        <nav className="w-full md:w-56 lg:w-64">
          <div className="sticky top-4">
            <div className="grid gap-1">
              <span className="text-left block px-3 py-2 rounded border bg-gray-900 text-white dark:bg-white dark:text-black">Details</span>
              <span className="text-left block px-3 py-2 rounded border opacity-50 cursor-not-allowed">Overview</span>
              <span className="text-left block px-3 py-2 rounded border opacity-50 cursor-not-allowed">Attendees</span>
              <span className="text-left block px-3 py-2 rounded border opacity-50 cursor-not-allowed">Purchases</span>
              <span className="text-left block px-3 py-2 rounded border opacity-50 cursor-not-allowed">Tickets</span>
              <span className="text-left block px-3 py-2 rounded border opacity-50 cursor-not-allowed">Promote</span>
              <span className="text-left block px-3 py-2 rounded border opacity-50 cursor-not-allowed">Invite</span>
            </div>
          </div>
        </nav>
        <div>
          <div className="border rounded">
            <div className="border-b px-4 py-3 text-base font-medium">New Event</div>
            <div className="p-4">
              <div className="grid gap-3 max-w-xl">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Title</div>
                  <input value={title} onChange={(e)=> setTitle(e.target.value)} className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900" />
                </div>
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-2">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Start date</div>
                    <input type="date" value={startDate} onChange={(e)=> setStartDate(e.target.value)} className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">End date</div>
                    <input type="date" value={endDate} onChange={(e)=> setEndDate(e.target.value)} className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Start</div>
                    <input type="time" step={60} value={startTime} onChange={(e)=> setStartTime(e.target.value)} className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">End</div>
                    <input type="time" step={60} value={endTime} onChange={(e)=> setEndTime(e.target.value)} className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900" />
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Location</div>
                  <input value={location} onChange={(e)=> setLocation(e.target.value)} className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900" />
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Google Maps URL</div>
                  <input value={mapsUrl} onChange={(e)=> setMapsUrl(e.target.value)} placeholder="https://maps.google.com/..." className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900" />
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Event Contact</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input value={contactPhone} onChange={(e)=> setContactPhone(e.target.value)} placeholder="Phone" className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900" />
                    <input value={contactEmail} onChange={(e)=> setContactEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900" />
                  </div>
                </div>
                {err && <div className="text-sm text-red-600">{err}</div>}
                <div>
                  <button onClick={onCreate} disabled={busy} className="px-3 py-2 border rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800">{busy ? 'Creating…' : 'Create Event'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
