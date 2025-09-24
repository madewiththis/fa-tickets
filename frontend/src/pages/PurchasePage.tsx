import { useEffect, useState } from 'react'
import { api } from '../lib/api/client'

function parseHashParams() {
  let hash = window.location.hash || ''
  if (hash.startsWith('#/')) hash = '#' + hash.slice(2)
  const idx = hash.indexOf('?')
  const q = new URLSearchParams(idx >= 0 ? hash.substring(idx + 1) : '')
  const eventId = q.get('event_id') ? Number(q.get('event_id')) : undefined
  const ticketTypeId = q.get('ticket_type_id') ? Number(q.get('ticket_type_id')) : undefined
  return { eventId, ticketTypeId }
}

export default function PurchasePage() {
  const [{ eventId, ticketTypeId }, setParams] = useState(parseHashParams())
  const [event, setEvent] = useState<any | null>(null)
  const [types, setTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const onHashChange = () => setParams(parseHashParams())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    (async () => {
      if (!eventId) return
      setLoading(true); setError(''); setEvent(null)
      try {
        const ev = await api.getEvent(eventId)
        setEvent(ev)
        const tt = await api.listTicketTypes(eventId)
        setTypes(tt)
      } catch (e:any) {
        setError(e.message || 'Failed to load event')
      } finally { setLoading(false) }
    })()
  }, [eventId])

  const selectedType = types.find(t => t.id === ticketTypeId)

  async function submit() {
    if (!eventId || !ticketTypeId || !email) return
    setSubmitting(true); setError('')
    try {
      const body = { event_id: eventId, ticket_type_id: ticketTypeId, customer: { email, first_name: first || undefined, last_name: last || undefined, phone: phone || undefined } }
      const res = await api.contentCheckout(body)
      window.location.hash = `#pay?token=${encodeURIComponent(res.token)}`
    } catch (e:any) {
      setError(e.message || 'Checkout failed')
    } finally { setSubmitting(false) }
  }

  function fmtDate(iso?: string) {
    if (!iso) return '—'
    const d = new Date(iso)
    const dd = String(d.getDate()).padStart(2,'0')
    const mm = String(d.getMonth()+1).padStart(2,'0')
    const yy = String(d.getFullYear()).slice(-2)
    return `${dd}/${mm}/${yy}`
  }

  return (
    <section>
      <h2>Purchase</h2>
      {!eventId && <p style={{ color:'#b00020' }}>Missing event_id in URL.</p>}
      {!ticketTypeId && <p style={{ color:'#b00020' }}>Missing ticket_type_id in URL.</p>}
      {loading && <p>Loading…</p>}
      {error && <p style={{ color:'#b00020' }}>{error}</p>}
      {event && (
        <div style={{ border:'1px solid #ddd', borderRadius:6, padding:12 }}>
          <div style={{ fontWeight:600, marginBottom:6 }}>{event.title}</div>
          <div style={{ color:'#555', marginBottom:6 }}>Dates: {fmtDate(event.starts_at)}{event.ends_at ? ` — ${fmtDate(event.ends_at)}` : ''}</div>
          <div style={{ color:'#555', marginBottom:12 }}>{event.location || ''}</div>
          {selectedType ? (
            <div style={{ marginBottom:12 }}><strong>Ticket:</strong> {selectedType.name} {selectedType.price_baht != null ? `— ${selectedType.price_baht} THB` : ''}</div>
          ) : (
            <div style={{ color:'#b00020', marginBottom:12 }}>Ticket type not found or not selected.</div>
          )}
          <div style={{ display:'grid', gap:8, maxWidth: 420 }}>
            <input placeholder='Email (required)' value={email} onChange={e=>setEmail(e.target.value)} />
            <div style={{ display:'flex', gap:8 }}>
              <input placeholder='First name' value={first} onChange={e=>setFirst(e.target.value)} />
              <input placeholder='Last name' value={last} onChange={e=>setLast(e.target.value)} />
            </div>
            <input placeholder='Phone' value={phone} onChange={e=>setPhone(e.target.value)} />
            <button onClick={submit} disabled={!email || !selectedType || submitting}>{submitting ? 'Submitting…' : 'Continue to payment'}</button>
          </div>
        </div>
      )}
    </section>
  )
}
