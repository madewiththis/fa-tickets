"use client"
import { useState } from 'react'
import { api } from '@/lib/api/client'

function fromIsoToLocalDate(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth()+1).padStart(2,'0')
  const dd = String(d.getUTCDate()).padStart(2,'0')
  return `${yyyy}-${mm}-${dd}`
}
function fromIsoToLocalTime(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const hh = String(d.getUTCHours()).padStart(2,'0')
  const mi = String(d.getUTCMinutes()).padStart(2,'0')
  return `${hh}:${mi}`
}
function toIsoWithTime(date?: string, time?: string) {
  if (!date || !time) return undefined as any
  return new Date(`${date}T${time}:00Z`).toISOString()
}

export default function EventDetailsClient({ event }: { event: any }) {
  const [title, setTitle] = useState(event?.title || '')
  const [startDate, setStartDate] = useState(fromIsoToLocalDate(event?.starts_at))
  const [endDate, setEndDate] = useState(fromIsoToLocalDate(event?.ends_at || event?.starts_at))
  const [startTime, setStartTime] = useState(fromIsoToLocalTime(event?.starts_at) || '10:00')
  const [endTime, setEndTime] = useState(fromIsoToLocalTime(event?.ends_at) || '17:00')
  const [location, setLocation] = useState(event?.location || '')
  const [mapsUrl, setMapsUrl] = useState(event?.address_maps_link || '')
  const [contactPhone, setContactPhone] = useState(event?.contact_phone || '')
  const [contactEmail, setContactEmail] = useState(event?.contact_email || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  async function onSave() {
    try {
      setBusy(true); setErr(''); setOk('')
      if (!title.trim()) throw new Error('Title is required')
      const starts_at = toIsoWithTime(startDate, startTime)
      const ends_at = endTime ? toIsoWithTime(endDate || startDate, endTime) : undefined
      await api.updateEvent(event.id, {
        title: title.trim(),
        starts_at,
        ends_at,
        location: location || undefined,
        address_maps_link: mapsUrl || undefined,
        contact_phone: contactPhone || undefined,
        contact_email: contactEmail || undefined,
      })
      setOk('Saved')
    } catch (e: any) { setErr(e?.message || 'Save failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
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
        {ok && <div className="text-sm text-green-600">{ok}</div>}
        <div>
          <button onClick={onSave} disabled={busy} className="px-3 py-2 border rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800">{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
