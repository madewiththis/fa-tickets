"use client"
import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api/client'

export default function ReportsPage() {
  const [eventId, setEventId] = useState<number | ''>('' as any)
  const [summary, setSummary] = useState<any>(null)
  const [error, setError] = useState('')
  const [events, setEvents] = useState<any[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [scope, setScope] = useState<'active' | 'all'>('active')

  useEffect(() => {
    (async () => {
      setLoadingEvents(true)
      setError('')
      try {
        const pageSize = 200
        let all: any[] = []
        let offset = 0
        while (true) {
          const page = await api.listEvents(pageSize, offset)
          all = all.concat(page)
          if (page.length < pageSize) break
          offset += pageSize
        }
        setEvents(all)
      } catch (e:any) {
        setError(e.message || 'Failed to load events')
      } finally {
        setLoadingEvents(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    if (scope === 'all') return events
    const now = new Date()
    return events.filter((ev:any) => {
      const starts = ev.starts_at ? new Date(ev.starts_at) : null
      const ends = ev.ends_at ? new Date(ev.ends_at) : null
      if (ends) return ends >= now
      if (starts) return starts >= now
      return false
    })
  }, [events, scope])

  async function load() {
    if (!eventId) return
    setError('')
    try { setSummary(await api.reconciliation(Number(eventId))) }
    catch (e:any) { setError(e.message) }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Reports</h2>
      <div className="flex flex-nowrap items-center gap-2">
        <select value={scope} onChange={(e)=> setScope(e.target.value as any)} className="px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900">
          <option value="active">Active events</option>
          <option value="all">All events</option>
        </select>
        <div className="flex-1 min-w-0">
          <select value={eventId ? String(eventId) : ''} onChange={(e)=> setEventId(e.target.value ? Number(e.target.value) : ('' as any))} className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900">
            <option value="">{loadingEvents ? 'Loading…' : 'Select event…'}</option>
            {filtered.map((ev:any) => (
              <option key={ev.id} value={String(ev.id)}>#{ev.id} • {ev.title}</option>
            ))}
          </select>
        </div>
        <button onClick={load} disabled={!eventId} className="px-3 py-2 border rounded text-sm whitespace-nowrap">Load</button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {summary && (
        <ReportSummary summary={summary} />
      )}
    </section>
  )
}

function ReportSummary({ summary }: { summary: any }) {
  const ev = summary.event || {}
  const starts = ev.starts_at ? new Date(ev.starts_at) : null
  const ends = ev.ends_at ? new Date(ev.ends_at) : null
  const now = new Date()

  const timeUntilStart = starts ? formatDistance(now, starts) : '—'
  const endDelta = ends ? (ends > now ? `Ends in ${formatDistance(now, ends)}` : `Ended ${formatDistance(ends, now)} ago`) : '—'

  const registered = summary.registered ?? ((summary.assigned||0) + (summary.delivered||0) + (summary.checked_in||0))
  const attended = summary.checked_in || 0
  const rate = registered > 0 ? `${Math.round((attended/registered)*100)}%` : '0%'
  const revenue = typeof summary.revenue_baht === 'number' ? summary.revenue_baht : 0

  return (
    <div className="border rounded p-4 mt-2">
      <div className="font-semibold mb-2">{ev.title || 'Event'}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Time until start" value={timeUntilStart} />
        <Stat label="Event end" value={endDelta} />
        <Stat label="Registered" value={String(registered)} />
        <Stat label="Attended" value={String(attended)} />
        <Stat label="Attendance rate" value={rate} />
        <Stat label="Revenue (THB)" value={String(revenue)} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded p-3">
      <div className="text-xs text-gray-600 dark:text-gray-400">{label}</div>
      <div className="text-lg font-medium">{value}</div>
    </div>
  )
}

function formatDistance(a: Date, b: Date) {
  const ms = Math.abs(b.getTime() - a.getTime())
  const minutes = Math.floor(ms/60000)
  const hours = Math.floor(minutes/60)
  const days = Math.floor(hours/24)
  if (days > 0) return `${days}d ${hours%24}h`
  if (hours > 0) return `${hours}h ${minutes%60}m`
  return `${minutes}m`
}
