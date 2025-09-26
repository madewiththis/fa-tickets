import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, HandCoins, TicketCheck, ScanEye, Send, Copy, TicketMinus, MoreHorizontal, Mail, RotateCcw, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

export default function AttendeeDetailPage() {
  const { id } = useParams()
  const contactId = id ? Number(id) : undefined
  const [contact, setContact] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [purchases, setPurchases] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [purchase, setPurchase] = useState<any | null>(null)
  const [purchaseDetails, setPurchaseDetails] = useState<Record<number, any>>({})
  const [active, setActive] = useState<'overview'|'purchases'|'tickets'>('overview')
  const [filterEventId, setFilterEventId] = useState<number | null>(null)
  const [reassignFor, setReassignFor] = useState<any | null>(null)
  const [rEmail, setREmail] = useState('')
  const [rFirst, setRFirst] = useState('')
  const [rLast, setRLast] = useState('')
  const [rPhone, setRPhone] = useState('')
  const [expandedTicketId, setExpandedTicketId] = useState<number | null>(null)
  const { toast } = useToast()
  const navigate = useNavigate()

  const location = useLocation()
  // Sync active tab with URL without triggering data refetches
  useEffect(() => {
    if (!contactId) return
    if (location.pathname.endsWith('/tickets')) setActive('tickets')
    else if (location.pathname.endsWith('/purchases')) setActive('purchases')
    else setActive('overview')
    // Redirect bare /attendees/:id to /overview
    if (!/\/(overview|tickets|purchases)$/.test(location.pathname)) {
      const segments = location.pathname.split('/')
      if (segments.length === 3) {
        navigate(`/attendees/${contactId}/overview`, { replace: true })
      }
    }
  }, [contactId, location.pathname, navigate])

  // Fetch data when the contact changes (initial load), not on every tab switch
  useEffect(() => {
    (async () => {
      if (!contactId) return
      setLoading(true); setError('')
      try {
        const c = await api.getContact(contactId)
        setContact(c)
        setPurchases(await api.listContactPurchases(contactId))
        setTickets(await api.listHolderTickets(contactId))
      } catch (e:any) {
        setError(e.message || 'Failed to load contact')
      } finally { setLoading(false) }
    })()
  }, [contactId])

  async function openPurchase(purchaseId: number) {
    try { setPurchase(await api.getPurchase(purchaseId)) } catch {}
  }

  async function showPurchasesForEvent(evId: number | null) {
    if (!contactId) return
    setActive('purchases')
    setFilterEventId(evId)
    try {
      const list = await api.listContactPurchases(contactId, evId ?? undefined)
      setPurchases(list)
    } catch {}
  }

  // Load detailed info for each purchase (to derive event title and payment status)
  useEffect(() => {
    (async () => {
      if (!purchases || purchases.length === 0) { setPurchaseDetails({}); return }
      try {
        const results = await Promise.allSettled(purchases.map((p:any) => api.getPurchase(p.id)))
        const map: Record<number, any> = {}
        results.forEach((r:any, idx:number) => {
          if (r.status === 'fulfilled') {
            const det = r.value
            const pid = purchases[idx].id
            map[pid] = det
          }
        })
        setPurchaseDetails(map)
      } catch {
        setPurchaseDetails({})
      }
    })()
  }, [purchases])

  function useCountdown(startIso?: string, endIso?: string) {
    if (!startIso) return ''
    const now = new Date()
    const start = new Date(startIso)
    const end = endIso ? new Date(endIso) : undefined
    if (end && now > end) {
      const diff = Math.max(0, Math.floor((now.getTime()-end.getTime())/1000))
      const d = Math.floor(diff/86400); const h = Math.floor((diff%86400)/3600)
      return `Ended ${d>0? d+ 'd ' : ''}${h}h ago`
    }
    if (now >= start && (!end || now <= end)) return 'Live now'
    const diff = Math.max(0, Math.floor((start.getTime()-now.getTime())/1000))
    const d = Math.floor(diff/86400); const h = Math.floor((diff%86400)/3600); const m = Math.floor((diff%3600)/60)
    return `Starts in ${d>0? d+'d ': ''}${h}h ${m}m`
  }

  return (
    <section className="space-y-4">
      <div>
        <Link to="/attendees" className="group inline-flex items-center gap-2 text-sm px-2 py-1 rounded border border-transparent hover:border-input hover:bg-secondary transition-colors">
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:inline">Back to Attendees</span>
        </Link>
      </div>
      {loading && <p>Loading…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {contact && (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_3fr] gap-6">
          <nav className="w-full md:w-56 lg:w-64">
            <div className="sticky top-4">
              <div className="grid gap-1">
                {[
                  { key: 'overview', label: 'Overview', href: `/attendees/${contactId}/overview` },
                  { key: 'tickets', label: 'Tickets', href: `/attendees/${contactId}/tickets` },
                  { key: 'purchases', label: 'Purchases', href: `/attendees/${contactId}/purchases` },
                ].map((it:any) => (
                  <button
                    key={it.key}
                    onClick={() => { setActive(it.key as any); if (it.href) navigate(it.href) }}
                    className={`text-left px-3 py-2 rounded border ${active === it.key ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
                  >{it.label}</button>
                ))}
              </div>
            </div>
          </nav>
          <div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{[contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email || 'Contact'}</CardTitle>
                <div className="text-xs text-muted-foreground">{contact.email || '—'} • {contact.phone || '—'}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="inline-flex items-center gap-1">
                    <HandCoins className="h-3.5 w-3.5" />
                    <span>{(contact.buyer?.events?.length || 0)} evts</span>
                  </Badge>
                  <Badge variant="secondary" className="inline-flex items-center gap-1">
                    <TicketCheck className="h-3.5 w-3.5" />
                    <span>{(contact.holder?.tickets_count || 0)} tix</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {active === 'overview' && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="transition-colors hover:bg-secondary cursor-pointer" onClick={()=> { setActive('purchases'); navigate(`/attendees/${contactId}/purchases`) }}>
                      <CardHeader className="pb-1"><CardTitle className="text-sm">Purchases</CardTitle></CardHeader>
                      <CardContent className="pt-2">
                        <ul className="text-sm space-y-1">
                          {contact.buyer?.events?.map((ev:any) => (
                            <li key={ev.event_id} className="flex items-center justify-between">
                              <span>{ev.title || `Event #${ev.event_id}`} ({ev.tickets} tickets)</span>
                              <Button size="sm" variant="outline" onClick={()=> { showPurchasesForEvent(ev.event_id); setActive('purchases'); navigate(`/attendees/${contactId}/purchases`) }}>View purchases</Button>
                            </li>
                          ))}
                          {(!contact.buyer?.events || contact.buyer.events.length === 0) && <li className="text-muted-foreground">No purchases</li>}
                        </ul>
                      </CardContent>
                    </Card>
                    <Card className="transition-colors hover:bg-secondary cursor-pointer" onClick={()=> { setActive('tickets'); navigate(`/attendees/${contactId}/tickets`) }}>
                      <CardHeader className="pb-1"><CardTitle className="text-sm">Tickets (as attendee)</CardTitle></CardHeader>
                      <CardContent className="pt-2">
                        <div className="text-sm">Tickets held: {contact.holder?.tickets_count || 0}</div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {active === 'purchases' && (
                  <div className="space-y-2">
                    {filterEventId && (
                      <div className="mb-2">
                        <Badge variant="secondary" className="mr-2">Filtered by event #{filterEventId}</Badge>
                        <Button size="sm" variant="outline" onClick={()=> showPurchasesForEvent(null)}>Show all</Button>
                      </div>
                    )}
                    {!purchase ? (
                      <div className="border rounded">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Event</TableHead>
                              <TableHead>Date</TableHead>
            <TableHead>Tickets</TableHead>
                              <TableHead>Total Amount</TableHead>
                              <TableHead>Payment Status</TableHead>
                              <TableHead className="w-[120px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {purchases.map((p:any) => {
                              const det = purchaseDetails[p.id]
                              const firstTicket = det?.tickets?.[0]
                              const eventTitle = firstTicket?.event_title || firstTicket?.event_id || '—'
                              const startsAt = firstTicket?.event_starts_at
                              const endsAt = firstTicket?.event_ends_at
                              const paymentStatus = (() => {
                                const tickets = det?.tickets || []
                                if (tickets.length === 0) return '—'
                                const statuses = new Set(tickets.map((t:any)=> t.payment_status))
                                if (statuses.size === 1) return Array.from(statuses)[0]
                                if (statuses.has('paid')) return 'paid'
                                return 'mixed'
                              })()
                              const amount = p.total_amount != null ? `${p.total_amount} ${p.currency || ''}` : '—'
                              return (
                                <TableRow key={p.id}>
                                  <TableCell>{eventTitle}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{startsAt ? new Date(startsAt).toLocaleDateString() : '—'}{startsAt ? ` • ${useCountdown(startsAt, endsAt)}` : ''}</TableCell>
                                  <TableCell>{p.tickets || 0}</TableCell>
                                  <TableCell>{amount}</TableCell>
                                  <TableCell className="capitalize">{paymentStatus}</TableCell>
                                  <TableCell className="text-right"><Button size="sm" variant="outline" onClick={()=> openPurchase(p.id)}>View</Button></TableCell>
                                </TableRow>
                              )
                            })}
                            {purchases.length === 0 && (
                              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No purchases</TableCell></TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">Purchase #{purchase.id}</div>
                        </div>
                        <div className="grid sm:grid-cols-3 gap-2 text-sm">
                          <div><span className="text-muted-foreground">Payment Ref:</span> {purchase.external_payment_ref || '—'}</div>
                          <div><span className="text-muted-foreground">Amount:</span> {purchase.total_amount != null ? `${purchase.total_amount} ${purchase.currency || ''}` : '—'}</div>
                          <div><span className="text-muted-foreground">Created:</span> {purchase.created_at ? new Date(purchase.created_at).toLocaleString() : '—'}</div>
                        </div>
                        <div className="border rounded">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Ticket Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Payment</TableHead>
                                <TableHead className="w-[120px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {purchase.tickets?.map((t:any) => (
                                <TableRow key={t.id}>
                                  <TableCell>{t.short_code || '—'}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{t.event_starts_at ? new Date(t.event_starts_at).toLocaleString() : '—'}{t.event_starts_at ? ` • ${useCountdown(t.event_starts_at, t.event_ends_at)}` : ''}</TableCell>
                                  <TableCell>{t.type_name || t.type_id || '—'}</TableCell>
                                  <TableCell className="capitalize">{t.status?.replaceAll('_',' ')}</TableCell>
                                  <TableCell className="capitalize">{t.payment_status}</TableCell>
                                  <TableCell className="text-right">
                                    {!t.holder_contact_id && (
                                      <Button size="sm" variant="outline" onClick={()=> { setReassignFor({ id: t.id, ticket_number: t.ticket_number, short_code: t.short_code }); setREmail(purchase?.buyer?.email || ''); setRFirst(purchase?.buyer?.first_name || ''); setRLast(purchase?.buyer?.last_name || ''); setRPhone(purchase?.buyer?.phone || ''); }}>Assign</Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end pt-1">
                          <Button variant="outline" size="sm" onClick={()=> toast({ title: 'Resent invoice (mock)' })}>
                            <Mail className="h-4 w-4 mr-1" /> Resend Invoice
                          </Button>
                          <Button variant="outline" size="sm" onClick={()=> toast({ title: 'Resent all tickets (mock)' })}>
                            <Send className="h-4 w-4 mr-1" /> Resend All Tickets
                          </Button>
                          <Button variant="outline" size="sm" onClick={()=> toast({ title: 'Refund initiated (mock)' })}>
                            <RotateCcw className="h-4 w-4 mr-1" /> Refund
                          </Button>
                          <Button variant="outline" size="sm" onClick={()=> setPurchase(null)}>
                            <X className="h-4 w-4 mr-1" /> Close
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {active === 'tickets' && (
                <div className="border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Event</TableHead>
                        <TableHead className="w-[20%]">Ticket Type</TableHead>
                        <TableHead className="w-[20%]">Event Date</TableHead>
                        <TableHead className="w-[10%]">Status</TableHead>
                        <TableHead className="w-[10%]">Payment Status</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tickets.map((t:any) => (
                        <>
                          <TableRow key={`row-${t.id}`}>
                            <TableCell className="whitespace-nowrap">{t.event_title || t.event_id}</TableCell>
                            <TableCell className="whitespace-nowrap">{t.type_name || t.type_id || '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{t.event_starts_at ? new Date(t.event_starts_at).toLocaleDateString() : '—'}</TableCell>
                            <TableCell className="capitalize whitespace-nowrap">{t.status?.replaceAll('_',' ') || '—'}</TableCell>
                            <TableCell className="capitalize whitespace-nowrap">{t.payment_status || '—'}</TableCell>
                            <TableCell className="text-right">
                              <Button size="icon" variant="outline" onClick={()=> setExpandedTicketId(expandedTicketId === t.id ? null : t.id)} aria-label="Actions">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {expandedTicketId === t.id && (
                            <TableRow key={`actions-${t.id}`}>
                              <TableCell colSpan={6}>
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" variant="outline" onClick={()=> window.open(`/ticket?code=${encodeURIComponent(t.short_code || '')}`, '_blank')} disabled={!t.short_code}>
                                    <ScanEye className="h-4 w-4 mr-1" /> Preview
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={async ()=> { try { await api.resendTicket(t.id); toast({ title: 'Ticket resent' }) } catch (e:any) { toast({ title: e.message || 'Failed to resend', variant: 'destructive' as any }) } }}>
                                    <Send className="h-4 w-4 mr-1" /> Resend Ticket
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={async ()=> { try { await navigator.clipboard.writeText(window.location.origin + `/ticket?code=${encodeURIComponent(t.short_code || '')}`); toast({ title: 'Link copied' }) } catch (e:any) { toast({ title: e.message || 'Copy failed', variant: 'destructive' as any }) } }} disabled={!t.short_code}>
                                    <Copy className="h-4 w-4 mr-1" /> Ticket Link
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={()=> { setReassignFor(t); setREmail(contact?.email || ''); setRFirst(contact?.first_name || ''); setRLast(contact?.last_name || ''); setRPhone(contact?.phone || ''); }}>
                                    <TicketMinus className="h-4 w-4 mr-1" /> Reassign
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}
                      {tickets.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No tickets</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Removed purchase modal in favor of inline details */}

      {/* Reassign dialog */}
      <Dialog open={!!reassignFor} onOpenChange={(o)=> !o ? setReassignFor(null) : null}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Ticket: #{reassignFor?.ticket_number || '—'} • Code: {reassignFor?.short_code || '—'}</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">Email</label>
                <Input value={rEmail} onChange={(e)=> setREmail(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">First name</label>
                <Input value={rFirst} onChange={(e)=> setRFirst(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Last name</label>
                <Input value={rLast} onChange={(e)=> setRLast(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">Phone</label>
                <Input value={rPhone} onChange={(e)=> setRPhone(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=> setReassignFor(null)}>Cancel</Button>
              <Button onClick={async ()=> {
                if (!reassignFor) return;
                try {
                  await api.reassignTicket(reassignFor.id, { email: rEmail, first_name: rFirst, last_name: rLast, phone: rPhone });
                  setReassignFor(null);
                  // Refresh holder tickets if viewing a holder; also refresh purchase details if open
                  if (contactId) setTickets(await api.listHolderTickets(contactId));
                  if (purchase?.id) {
                    try { setPurchase(await api.getPurchase(purchase.id)) } catch {}
                  }
                  toast({ title: 'Ticket reassigned' })
                } catch (e:any) {
                  toast({ title: e.message || 'Reassign failed', variant: 'destructive' as any })
                }
              }}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
