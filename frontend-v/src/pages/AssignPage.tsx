import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api/client'
import { PageHeader, FormGrid, FormField, AsyncButton } from '@/components/kit'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { logEmail } from '@/lib/devlog'

export default function AssignPage() {
  const navigate = useNavigate()
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
  // Removed capacity summary
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
      // no capacity info
      if (!eventId) return
      try {
        const types = await api.listTicketTypes(Number(eventId))
        setTicketTypes(types)
      } catch (e:any) {
        console.warn('[Assign] Failed to load ticket types', e)
        setTicketTypes([])
      }
      // no capacity info
    })()
  }, [eventId])

  async function assign() {
    setResult('')
    try {
      const body:any = { event_id: Number(eventId), customer: { email, first_name: firstName, last_name: lastName, phone }, payment_status: paymentStatus }
      if (ticketTypeId) body.ticket_type_id = Number(ticketTypeId)
      if (previewCode) body.desired_short_code = previewCode
      logEmail('assign:request', { event_id, payment_status: paymentStatus, ticket_type_id: ticketTypeId })
      const res = await api.assign(body)
      logEmail(paymentStatus === 'unpaid' ? 'email:reserved_assignment_holder:queued' : 'email:ticket_email:queued', { to: email, event_id })
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
    <section className="space-y-4">
      <PageHeader title="Assign Ticket" />
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 max-w-xl">
            <FormField label="Event">
              <Select value={eventId ? String(eventId) : ''} onValueChange={(v)=> setEventId(v ? Number(v) : ('' as any))}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingEvents ? 'Loading…' : 'Select event…'} />
                </SelectTrigger>
                <SelectContent>
                  {upcomingEvents.map((ev:any) => (
                    <SelectItem key={ev.id} value={String(ev.id)}>#{ev.id} • {ev.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* capacity removed */}
            </FormField>

            <FormGrid cols={2}>
              <FormField label="Ticket type">
                <Select value={ticketTypeId ? String(ticketTypeId) : ''} onValueChange={(v)=> setTicketTypeId(v ? Number(v) : ('' as any))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {(ticketTypes || []).map((t:any) => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name} {t.price_baht != null ? `— ${t.price_baht} THB` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Payment status">
                <Select value={paymentStatus} onValueChange={(v)=> setPaymentStatus(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="waived">Waived</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </FormGrid>

            <FormGrid cols={2}>
              <FormField label="First name"><Input value={firstName} onChange={(e)=>setFirstName(e.target.value)} /></FormField>
              <FormField label="Last name"><Input value={lastName} onChange={(e)=>setLastName(e.target.value)} /></FormField>
            </FormGrid>
            <FormGrid cols={2}>
              <FormField label="Email"><Input value={email} onChange={(e)=>setEmail(e.target.value)} /></FormField>
              <FormField label="Phone"><Input value={phone} onChange={(e)=>setPhone(e.target.value)} /></FormField>
            </FormGrid>

            {!previewCode ? (
              <AsyncButton onClick={preview} disabled={!eventId || !email || previewing}>{previewing ? 'Generating…' : 'Preview Ticket'}</AsyncButton>
            ) : (
              <Card className="mt-2">
                <CardHeader className="pb-2"><CardTitle className="text-base">Email Preview</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm"><strong>Subject:</strong> Your Ticket Code for {(events.find(e=> e.id === eventId) || {}).title || 'Event'}</div>
                  <div className="text-sm"><strong>To:</strong> {email}</div>
                  <div className="mt-2 whitespace-pre-wrap text-sm">
                    {(() => {
                      const title = (events.find(e=> e.id === eventId) || {}).title || 'the event'
                      const lines = [`Hi${firstName ? ' ' + firstName : ''},`]
                      if (paymentStatus === 'unpaid') {
                        const origin = (import.meta as any).env.VITE_PUBLIC_APP_ORIGIN || window.location.origin
                        const link = `${origin}/pay?token=<GUID>`
                        lines.push('', `Your ticket is reserved for ${title}.`, 'Please complete payment to receive your ticket.', `Pay here: ${link}`)
                      } else {
                        lines.push('', `Your 3-digit check-in code for ${title} is: ${previewCode}.`, '', 'Show this code at the door to check in.')
                      }
                      lines.push('', 'Thank you!')
                      return lines.join('\n')
                    })()}
                  </div>
                  {qrDataUrl && (
                    <div className="mt-2"><img alt="Ticket QR" src={qrDataUrl} className="h-40 w-40" /></div>
                  )}
                  <div className="mt-2 flex gap-2">
                    <AsyncButton onClick={assign} disabled={!eventId || !email}>Assign & Send</AsyncButton>
                    <Button type="button" variant="outline" onClick={()=> setPreviewCode(null)}>Edit details</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && <p className="text-sm">{result}</p>}
    </section>
  )
}
