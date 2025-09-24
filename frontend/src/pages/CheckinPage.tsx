import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api/client'
import { NumericKeypad } from '../components/NumericKeypad'

export default function CheckinPage() {
  const [eventId, setEventId] = useState<number | ''>('' as any)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState<any[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      setLoadingEvents(true)
      setError('')
      try {
        const list = await api.listEvents()
        setEvents(list)
      } catch (e:any) {
        setError(e.message || 'Failed to load events')
      } finally {
        setLoadingEvents(false)
      }
    })()
  }, [])

  const upcomingEvents = useMemo(() => {
    const now = new Date()
    return (events || []).filter((ev:any) => {
      const starts = ev.starts_at ? new Date(ev.starts_at) : null
      const ends = ev.ends_at ? new Date(ev.ends_at) : null
      if (ends) return ends >= now
      if (starts) return starts >= now
      return false
    })
  }, [events])

  function onInput(d: string) {
    if (code.length < 3) setCode(code + d)
  }
  function onBackspace() { setCode(code.slice(0, -1)) }
  async function onSubmit() {
    if (!eventId || code.length !== 3) return
    setLoading(true); setMessage('')
    try {
      const res = await api.checkin(Number(eventId), code)
      setMessage(`Checked in ticket #${res.ticket_id} (${res.short_code}).`) }
    catch(e:any){ setMessage(e.message) }
    finally { setLoading(false); setCode('') }
  }

  return (
    <section>
      <h2>Check-in</h2>
      <div style={{ display:'grid', gap:8, maxWidth: 360 }}>
        <select value={eventId} onChange={(e)=> setEventId(e.target.value ? Number(e.target.value) : '' as any)}>
          <option value=''>Select event… {loadingEvents ? '(loading…)': ''}</option>
          {upcomingEvents.map((ev:any) => (
            <option key={ev.id} value={ev.id}>
              #{ev.id} • {ev.title} • {ev.starts_at ? new Date(ev.starts_at).toLocaleString() : ''}
            </option>
          ))}
        </select>
        <div style={{ fontSize: 24, letterSpacing: 8, minHeight: 32 }}>{code.padEnd(3, '•')}</div>
        <NumericKeypad onInput={onInput} onBackspace={onBackspace} onSubmit={onSubmit} disabled={!eventId || loading} />
      </div>
      {error && <p style={{ color:'#b00020' }}>{error}</p>}
      {message && <p>{message}</p>}
    </section>
  )
}
