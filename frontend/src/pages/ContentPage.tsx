import { useEffect, useState } from 'react'
import { api } from '../lib/api/client'

type EventItem = any
type TicketType = any

export default function ContentPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [types, setTypes] = useState<Record<number, TicketType[]>>({})
  const [copied, setCopied] = useState<string>('')

  useEffect(() => {
    (async () => {
      setLoading(true); setErr('')
      try {
        const list = await api.listEvents(100, 0)
        setEvents(list)
      } catch (e:any) {
        setErr(e.message || 'Failed to load events')
      } finally { setLoading(false) }
    })()
  }, [])

  async function toggle(evId: number) {
    setExpanded(prev => ({ ...prev, [evId]: !prev[evId] }))
    if (!types[evId]) {
      try {
        const list = await api.listTicketTypes(evId)
        setTypes(prev => ({ ...prev, [evId]: list }))
      } catch (e:any) {
        console.warn('Failed to load types', e)
        setTypes(prev => ({ ...prev, [evId]: [] }))
      }
    }
  }

  function formatDate(iso?: string) {
    if (!iso) return '—'
    const d = new Date(iso)
    const dd = String(d.getDate()).padStart(2,'0')
    const mm = String(d.getMonth()+1).padStart(2,'0')
    const yy = String(d.getFullYear()).slice(-2)
    return `${dd}/${mm}/${yy}`
  }

  function purchaseLink(evId: number, ttId: number) {
    const origin = window.location.origin
    return `${origin}/#purchase?event_id=${evId}&ticket_type_id=${ttId}`
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(text)
      setTimeout(()=> setCopied(''), 1500)
    } catch {}
  }

  return (
    <section>
      <h2>Content Management</h2>
      {loading && <p>Loading…</p>}
      {err && <p style={{ color:'#b00020' }}>{err}</p>}
      <div style={{ display:'grid', gap:12 }}>
        {events.map(ev => (
          <div key={ev.id} style={{ border:'1px solid #ddd', borderRadius:6, padding:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:600 }}>{ev.title}</div>
                <div style={{ color:'#555' }}>Starts: {formatDate(ev.starts_at)} {ev.ends_at ? `• Ends: ${formatDate(ev.ends_at)}` : ''}</div>
                <div style={{ color:'#555' }}>{ev.location || ''}</div>
              </div>
              <button onClick={()=> toggle(ev.id)}>{expanded[ev.id] ? 'Hide' : 'Show'} ticket types</button>
            </div>
            {expanded[ev.id] && (
              <div style={{ marginTop:10 }}>
                {(types[ev.id] || []).length === 0 && (
                  <div style={{ color:'#666' }}>No ticket types.</div>
                )}
                {(types[ev.id] || []).map((t:any) => (
                  <div key={t.id} style={{ display:'grid', gridTemplateColumns:'1fr auto', alignItems:'center', padding:'8px 0', borderTop:'1px solid #eee' }}>
                    <div>
                      <div>{t.name} {t.active ? '' : '(inactive)'} {t.price_baht != null ? `— ${t.price_baht} THB` : ''}</div>
                      <div style={{ color:'#555', fontSize:12 }}>Link: <code>{purchaseLink(ev.id, t.id)}</code></div>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={()=> window.location.hash = `#purchase?event_id=${ev.id}&ticket_type_id=${t.id}`}>Open</button>
                      <button onClick={()=> copy(purchaseLink(ev.id, t.id))}>{copied === purchaseLink(ev.id, t.id) ? 'Copied!' : 'Copy link'}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {events.length === 0 && !loading && (
          <div style={{ color:'#666' }}>No events found.</div>
        )}
      </div>
    </section>
  )
}
