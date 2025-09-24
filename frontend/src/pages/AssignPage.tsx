import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api/client'

export default function AssignPage() {
  const [eventId, setEventId] = useState<number | ''>('' as any)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [result, setResult] = useState<string>('')
  const [events, setEvents] = useState<any[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [error, setError] = useState<string>('')
  const [ticketTypes, setTicketTypes] = useState<any[] | null>(null)
  const [ticketTypeId, setTicketTypeId] = useState<number | ''>('' as any)
  const [paymentStatus, setPaymentStatus] = useState<'paid'|'unpaid'|'waived'>('unpaid')
  const [capacityInfo, setCapacityInfo] = useState<{registered:number, capacity:number} | null>(null)
  const [previewCode, setPreviewCode] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  // Load events and filter to those not in the past
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

  // Load ticket types when event changes
  useEffect(() => {
    (async () => {
      setTicketTypes(null)
      setTicketTypeId('' as any)
      setCapacityInfo(null)
      if (!eventId) return
      try {
        const types = await api.listTicketTypes(Number(eventId))
        setTicketTypes(types)
      } catch (e:any) {
        console.warn('[Assign] Failed to load ticket types', e)
        setTicketTypes([])
      }
      try {
        const r = await api.reconciliation(Number(eventId))
        const registered = (r.registered ?? ((r.assigned||0)+(r.delivered||0)+(r.checked_in||0)))
        setCapacityInfo({ registered, capacity: r.event?.capacity ?? 0 })
      } catch (e:any) {
        console.warn('[Assign] Failed to load capacity info', e)
      }
    })()
  }, [eventId])

  async function assign() {
    setResult('')
    try {
      const body:any = { event_id: Number(eventId), customer: { email, first_name: firstName, last_name: lastName, phone }, payment_status: paymentStatus }
      if (ticketTypeId) body.ticket_type_id = Number(ticketTypeId)
      if (previewCode) body.desired_short_code = previewCode
      const res = await api.assign(body)
      setResult(`Assigned ticket #${res.ticket_id}, code ${res.short_code}`)
      setPreviewCode(null)
    } catch (e:any) { setResult(e.message) }
  }

  async function preview() {
    if (!eventId) return
    setResult(''); setPreviewing(true)
    try {
      const p = await api.assignPreview(Number(eventId))
      setPreviewCode(p.short_code)
      try {
        const svg = await api.qrSvgText(p.short_code)
        const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
        setQrDataUrl(dataUrl)
      } catch (e:any) {
        console.warn('[Assign] Failed to load QR', e)
        setQrDataUrl(null)
      }
    } catch (e:any) {
      setResult(e.message)
    } finally { setPreviewing(false) }
  }

  return (
    <section>
      <h2>Assign Ticket</h2>
      <div style={{ display:'grid', gap:8, maxWidth: 440 }}>
        <select value={eventId} onChange={(e)=> setEventId(e.target.value ? Number(e.target.value) : '' as any)}>
          <option value=''>Select event… {loadingEvents ? '(loading…)': ''}</option>
          {upcomingEvents.map((ev:any) => (
            <option key={ev.id} value={ev.id}>
              #{ev.id} • {ev.title} • {ev.starts_at ? new Date(ev.starts_at).toLocaleString() : ''}
            </option>
          ))}
        </select>
        {capacityInfo && (
          <div style={{ color:'#555' }}>Assigned: {capacityInfo.registered} / {capacityInfo.capacity}</div>
        )}
        <div style={{ display:'grid', gap:8 }}>
          <select value={ticketTypeId} onChange={e=> setTicketTypeId(e.target.value ? Number(e.target.value) : '' as any)} disabled={!ticketTypes}>
            <option value=''>Ticket type (optional)</option>
            {(ticketTypes || []).map((t:any) => (
              <option key={t.id} value={t.id}>{t.name} — {t.price_baht ?? 0} THB</option>
            ))}
          </select>
          <select value={paymentStatus} onChange={e=> setPaymentStatus(e.target.value as any)}>
            <option value='paid'>Paid</option>
            <option value='unpaid'>Unpaid</option>
            <option value='waived'>Waived</option>
          </select>
        </div>
        <input placeholder='First name' value={firstName} onChange={e=>setFirstName(e.target.value)} />
        <input placeholder='Last name' value={lastName} onChange={e=>setLastName(e.target.value)} />
        <input placeholder='Customer email' value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder='Phone' value={phone} onChange={e=>setPhone(e.target.value)} />
        {!previewCode && (
          <button disabled={!eventId || !email || previewing} onClick={preview}>
            {previewing ? 'Generating…' : 'Preview Ticket'}
          </button>
        )}
        {previewCode && (
          <div style={{ border:'1px solid #ddd', borderRadius:6, padding:12 }}>
            <div style={{ fontWeight:600, marginBottom:8 }}>Email Preview</div>
            <div><strong>Subject:</strong> Your Ticket Code for {(events.find(e=> e.id === eventId) || {}).title || 'Event'}</div>
            <div><strong>To:</strong> {email}</div>
            <div style={{ marginTop:8, whiteSpace:'pre-wrap' }}>
              {(() => {
                const title = (events.find(e=> e.id === eventId) || {}).title || 'the event'
                const lines = [
                  `Hi${firstName ? ' ' + firstName : ''},`,
                ]
                if (paymentStatus === 'unpaid') {
                  const origin = (import.meta as any).env.VITE_PUBLIC_APP_ORIGIN || window.location.origin
                  const link = `${origin}/#pay?token=<GUID>`
                  lines.push(
                    '',
                    `Your ticket is reserved for ${title}.`,
                    'Please complete payment to receive your ticket.',
                    `Pay here: ${link}`,
                  )
                } else {
                  lines.push(
                    '',
                    `Your 3-digit check-in code for ${title} is: ${previewCode}.`,
                    '',
                    'Show this code at the door to check in.',
                  )
                }
                lines.push('', 'Thank you!')
                return lines.join('\n')
              })()}
            </div>
            {qrDataUrl && (
              <div style={{ marginTop:12 }}>
                <img alt='Ticket QR' src={qrDataUrl} style={{ width: 160, height: 160 }} />
              </div>
            )}
            <div style={{ marginTop:12, display:'flex', gap:8 }}>
              <button onClick={assign} disabled={!eventId || !email}>Assign & Send</button>
              <button type='button' onClick={()=> setPreviewCode(null)}>Edit details</button>
            </div>
          </div>
        )}
      </div>
      {error && <p style={{ color:'#b00020' }}>{error}</p>}
      {result && <p>{result}</p>}
    </section>
  )
}
