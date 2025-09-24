import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api/client'

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
    <section>
      <h2>Reports</h2>
      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <select value={scope} onChange={e=> setScope((e.target.value as 'active'|'all'))}>
          <option value='active'>Active events</option>
          <option value='all'>All events</option>
        </select>
        <select
          value={eventId}
          onChange={e=> setEventId(e.target.value ? Number(e.target.value) : '' as any)}
          style={{ minWidth: 360 }}
        >
          <option value=''>Select event… {loadingEvents ? '(loading…)': ''}</option>
          {filtered.map((ev:any) => (
            <option key={ev.id} value={ev.id}>
              #{ev.id} • {ev.title} • {ev.starts_at ? new Date(ev.starts_at).toLocaleString() : ''}
            </option>
          ))}
        </select>
        <button onClick={load} disabled={!eventId}>Load</button>
      </div>
      {error && <p>{error}</p>}
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
    <div style={{ marginTop: 16, padding: '12px 16px', border: '1px solid #ddd', borderRadius: 6 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{ev.title || 'Event'}</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(200px, 1fr))', gap: 12 }}>
        <Metric label="Time until start" value={timeUntilStart} />
        <Metric label="Event end" value={endDelta} />
        <Metric label="Registered" value={String(registered)} />
        <Metric label="Attended" value={String(attended)} />
        <Metric label="Attendance rate" value={rate} />
        <Metric label="Revenue (THB)" value={String(revenue)} />
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string, value: string }) {
  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      <span style={{ color:'#555', fontSize: 12 }}>{label}</span>
      <span style={{ fontSize: 18 }}>{value}</span>
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
