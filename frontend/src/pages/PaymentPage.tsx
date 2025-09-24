import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api/client'

function parseHashParams() {
  // Accept both #pay?token=... and #/pay?token=...
  let hash = window.location.hash || ''
  if (hash.startsWith('#/')) hash = '#' + hash.slice(2)
  const idx = hash.indexOf('?')
  const hashQuery = new URLSearchParams(idx >= 0 ? hash.substring(idx + 1) : '')
  const searchQuery = new URLSearchParams(window.location.search || '')
  const get = (k: string) => (hashQuery.get(k) || searchQuery.get(k) || '').trim()
  const code = get('code')
  const eventIdStr = get('event_id')
  const token = get('token')
  const event_id = eventIdStr ? Number(eventIdStr) : undefined
  return { code, event_id, token }
}

export default function PaymentPage() {
  const [{ code, event_id, token }, setParams] = useState(parseHashParams())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [ticket, setTicket] = useState<any | null>(null)
  const [card, setCard] = useState('')
  const [name, setName] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const onHashChange = () => setParams(parseHashParams())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    (async () => {
      if (!code && !token) return
      setLoading(true); setError(''); setTicket(null); setSuccess(false)
      try {
        const t = token ? await api.lookupByToken(token) : await api.lookupTicket(code, event_id)
        setTicket(t)
      } catch (e:any) {
        setError(e.message || 'Failed to lookup ticket')
      } finally {
        setLoading(false)
      }
    })()
  }, [code, event_id, token])

  async function pay() {
    if (!ticket) return
    setLoading(true); setError('')
    try {
      if (token) await api.payByToken(token)
      else await api.payTicket(ticket.event_id, ticket.short_code)
      setSuccess(true)
      // Refresh ticket
      const t = token ? await api.lookupByToken(token) : await api.lookupTicket(ticket.short_code, ticket.event_id)
      setTicket(t)
    } catch (e:any) {
      setError(e.message || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <h2>Pay for Ticket</h2>
      {!code && !token && <p style={{ color:'#b00020' }}>Missing data in URL. Provide <code>#pay?token=&lt;GUID&gt;</code>.</p>}
      {loading && <p>Loading…</p>}
      {error && <p style={{ color:'#b00020' }}>{error}</p>}
      {ticket && (
        <div style={{ border:'1px solid #ddd', padding:12, borderRadius:6 }}>
          <div><strong>Event:</strong> {ticket.event_title || ticket.event_id}</div>
          {!!ticket.short_code && (<div><strong>Code:</strong> {ticket.short_code}</div>)}
          <div><strong>Status:</strong> {ticket.status}</div>
          <div><strong>Payment:</strong> {ticket.payment_status}</div>
          {ticket.payment_status !== 'paid' && !success && (
            <div style={{ marginTop:12 }}>
              <div style={{ display:'grid', gap:8, maxWidth: 360 }}>
                <input placeholder='Card number' value={card} onChange={e=>setCard(e.target.value)} />
                <input placeholder='Name on card' value={name} onChange={e=>setName(e.target.value)} />
                <div style={{ display:'flex', gap:8 }}>
                  <input placeholder='MM/YY' value={expiry} onChange={e=>setExpiry(e.target.value)} />
                  <input placeholder='CVC' value={cvc} onChange={e=>setCvc(e.target.value)} />
                </div>
                <button onClick={pay} disabled={loading || (!code && !token)}>Pay now</button>
              </div>
            </div>
          )}
          {success && (
            <div style={{ marginTop:12, color:'#087f23' }}>Payment successful. Thank you!</div>
          )}
          {ticket.payment_status === 'paid' && (
            <div style={{ marginTop:12, color:'#087f23' }}>This ticket is already paid.</div>
          )}
        </div>
      )}
    </section>
  )
}
