"use client"
import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api/client'

export default function CheckinPage() {
  const [eventId, setEventId] = useState<number | ''>('' as any)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [events, setEvents] = useState<any[]>([])
  const [attendees, setAttendees] = useState<any[]>([])
  const [valid, setValid] = useState(false)
  const [checking, setChecking] = useState(false)
  const [justChecked, setJustChecked] = useState(false)

  useEffect(() => {
    (async () => {
      setLoadingEvents(true)
      try { setEvents(await api.listEvents(200, 0)) } finally { setLoadingEvents(false) }
    })()
  }, [])

  const upcomingEvents = useMemo(() => {
    const now = new Date()
    const evs = Array.isArray(events) ? events : []
    return evs.filter((ev:any) => {
      const starts = ev.starts_at ? new Date(ev.starts_at) : null
      const ends = ev.ends_at ? new Date(ev.ends_at) : null
      if (ends) return ends >= now
      if (starts) return starts >= now
      return false
    })
  }, [events])

  useEffect(() => {
    (async () => {
      setAttendees([])
      if (!eventId) return
      try { setAttendees(await api.listAttendees(Number(eventId))) } catch {}
    })()
  }, [eventId])

  useEffect(() => {
    (async () => {
      setValid(false)
      setJustChecked(false)
      if (!eventId || code.length !== 3) return
      try { await api.lookupTicket(code, Number(eventId)); setValid(true) } catch { setValid(false) }
    })()
  }, [code, eventId])

  const person = useMemo(() => {
    const c = code.trim().toUpperCase()
    return attendees.find(a => (a.short_code || '').toUpperCase() === c)
  }, [attendees, code])
  const alreadyChecked = !!(person && person.checked_in_at)

  async function confirmCheckin() {
    if (!eventId || code.length !== 3 || !valid) return
    setChecking(true); setMessage('')
    try {
      await api.checkin(Number(eventId), code)
      setJustChecked(true)
      setTimeout(() => { setJustChecked(false); setCode(''); setValid(false) }, 500)
    } catch (e: any) { setMessage(e?.message || 'Failed to check in') }
    finally { setChecking(false) }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Check in</h2>
      <div className="grid gap-3 max-w-sm">
        <select value={eventId ? String(eventId) : ''} onChange={(e)=> setEventId(e.target.value ? Number(e.target.value) : ('' as any))} className="px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900">
          <option value="">{loadingEvents ? 'Loading…' : 'Select event…'}</option>
          {upcomingEvents.map((ev:any) => (
            <option key={ev.id} value={String(ev.id)}>#{ev.id} • {ev.title}</option>
          ))}
        </select>
        {eventId ? (
          <div className="border rounded p-3 space-y-3">
            <div className="flex items-center gap-2">
              <input
                inputMode="text"
                pattern="[0-9A-Za-z]{3}"
                maxLength={3}
                value={code}
                onChange={(e)=> setCode(e.target.value.toUpperCase().slice(0,3))}
                placeholder="Enter code"
                className="flex-1 text-center text-3xl tracking-[0.6em] h-16 border rounded"
                autoFocus
              />
            </div>
            {code.length === 3 && (
              <div className="space-y-2">
                <div className={`${valid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'} text-base font-semibold`}>
                  {valid ? 'Code is valid' : 'Code not found for this event'}{valid && alreadyChecked ? ' — already checked in' : ''}
                </div>
                {person && (
                  <div className="text-sm grid gap-1">
                    <div><span className="text-gray-600 dark:text-gray-400">Ticket No.:</span> {person.ticket_number || '—'}</div>
                    <div><span className="text-gray-600 dark:text-gray-400">Name:</span> {[person.first_name, person.last_name].filter(Boolean).join(' ') || '—'}</div>
                    <div><span className="text-gray-600 dark:text-gray-400">Email:</span> {person.email || '—'}</div>
                    <div><span className="text-gray-600 dark:text-gray-400">Phone:</span> {person.phone || '—'}</div>
                  </div>
                )}
                <div>
                  {!valid ? (
                    <button onClick={()=> setCode('')} className="w-full px-3 py-2 border rounded text-sm">Clear</button>
                  ) : alreadyChecked ? (
                    <button onClick={()=> { setCode(''); setMessage('') }} className="w-full px-3 py-2 border rounded text-sm">OK</button>
                  ) : justChecked ? (
                    <button className="w-full px-3 py-2 border rounded text-sm bg-green-600 text-white" disabled>User has been checked in</button>
                  ) : (
                    <button onClick={confirmCheckin} disabled={checking} className="w-full px-3 py-2 border rounded text-sm">{checking ? 'Checking in…' : 'Check in'}</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}
        {message && <p className="text-sm text-red-600">{message}</p>}
      </div>
    </section>
  )
}
