import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../lib/api/client'
import { PageHeader, FormGrid, FormField, AsyncButton } from '@/components/kit'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

function useQueryParams() {
  const { search } = useLocation()
  const q = new URLSearchParams(search)
  const eventId = q.get('event_id') ? Number(q.get('event_id')) : undefined
  const ticketTypeId = q.get('ticket_type_id') ? Number(q.get('ticket_type_id')) : undefined
  return { eventId, ticketTypeId }
}

export default function PurchasePage() {
  const { eventId, ticketTypeId } = useQueryParams()
  const navigate = useNavigate()
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
      navigate(`/pay?token=${encodeURIComponent(res.token)}`)
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
    <section className="space-y-4">
      <PageHeader title="Purchase" />
      {!eventId && <p className="text-sm text-destructive">Missing event_id in URL.</p>}
      {!ticketTypeId && <p className="text-sm text-destructive">Missing ticket_type_id in URL.</p>}
      {loading && <p>Loading…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {event && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{event.title}</CardTitle>
            <div className="text-xs text-muted-foreground">Dates: {fmtDate(event.starts_at)}{event.ends_at ? ` — ${fmtDate(event.ends_at)}` : ''}</div>
            <div className="text-xs text-muted-foreground">{event.location || ''}</div>
          </CardHeader>
          <CardContent className="pt-2">
            {selectedType ? (
              <div className="mb-3 text-sm"><strong>Ticket:</strong> {selectedType.name} {selectedType.price_baht != null ? `— ${selectedType.price_baht} THB` : ''}</div>
            ) : (
              <div className="mb-3 text-sm text-destructive">Ticket type not found or not selected.</div>
            )}
            <div className="max-w-md">
              <FormGrid cols={2}>
                <FormField label="Email (required)"><Input value={email} onChange={(e)=>setEmail(e.target.value)} /></FormField>
                <div />
                <FormField label="First name"><Input value={first} onChange={(e)=>setFirst(e.target.value)} /></FormField>
                <FormField label="Last name"><Input value={last} onChange={(e)=>setLast(e.target.value)} /></FormField>
                <FormField label="Phone"><Input value={phone} onChange={(e)=>setPhone(e.target.value)} /></FormField>
                <div />
              </FormGrid>
              <AsyncButton onClick={submit} disabled={!email || !selectedType || submitting} className="mt-2">
                {submitting ? 'Submitting…' : 'Continue to payment'}
              </AsyncButton>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
