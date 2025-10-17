import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { logEmail } from '@/lib/devlog'
import { Switch } from '@/components/ui/switch'

type Item = { ticket_type_id: number; qty: number }

export default function MultiPurchasePage() {
  const { search } = useLocation()
  const q = useMemo(()=> new URLSearchParams(search), [search])
  const eventId = q.get('event_id') ? Number(q.get('event_id')) : undefined
  const itemsParam = q.get('items') || '[]'
  const items: Item[] = useMemo(() => { try { return JSON.parse(decodeURIComponent(itemsParam)) } catch { return [] } }, [itemsParam])
  const [ev, setEv] = useState<any>(null)
  const [types, setTypes] = useState<any[]>([])
  const [selectedTypes, setSelectedTypes] = useState<Record<number, string>>({})
  const [step, setStep] = useState<number>(1)
  const [buyer, setBuyer] = useState({ email: '', first_name: '', last_name: '', phone: '' })
  const [emailDirty, setEmailDirty] = useState(false)
  const [showEmailValidation, setShowEmailValidation] = useState(false)
  const [assign, setAssign] = useState<Array<{ type_id: number; type_name: string; first_name: string; last_name: string; email: string }>>([])
  const [done, setDone] = useState(false)
  const [holdUntil, setHoldUntil] = useState<number | null>(null)
  const [now, setNow] = useState<number>(Date.now())
  const [invoiceGuid, setInvoiceGuid] = useState<string | null>(null)
  const [skipped, setSkipped] = useState(false)
  const [holderErrors, setHolderErrors] = useState<Record<number, boolean>>({})
  const [payLater, setPayLater] = useState(false)
  const [invoiceRequired, setInvoiceRequired] = useState(false)
  const [invoiceType, setInvoiceType] = useState<'person'|'company'>('person')
  const [invoice, setInvoice] = useState({ company: '', address: '', company_phone: '', vat_number: '', person_name: '', person_phone: '' })
  const [invoiceCompanyEdited, setInvoiceCompanyEdited] = useState(false)
  const [invoicePersonEdited, setInvoicePersonEdited] = useState(false)

  // Auto-fill "Your name" when invoice type is person and user hasn't edited the field
  useEffect(() => {
    if (invoiceType === 'person' && !invoicePersonEdited) {
      const full = [buyer.first_name, buyer.last_name].filter(Boolean).join(' ').trim()
      setInvoice(prev => ({ ...prev, person_name: full }))
    }
  }, [buyer.first_name, buyer.last_name, invoiceType, invoicePersonEdited])
  const navigate = useNavigate()

  useEffect(() => {
    (async () => {
      if (!eventId) return
      const e = await api.getEvent(eventId)
      setEv(e)
      const tt = await api.listTicketTypes(eventId)
      setTypes(tt)
      // build assign list
      const typeById: Record<number, any> = Object.fromEntries(tt.map((t:any)=> [t.id, t]))
      const list: any[] = []
      const sel: Record<number,string> = {}
      items.forEach((it) => {
        const name = typeById[it.ticket_type_id]?.name || `Type #${it.ticket_type_id}`
        sel[it.ticket_type_id] = name
        for (let i=0;i<it.qty;i++) {
          list.push({ type_id: it.ticket_type_id, type_name: name, first_name: '', last_name: '', email: '' })
        }
      })
      setAssign(list)
      setSelectedTypes(sel)
    })()
  }, [eventId, itemsParam])

  useEffect(() => {
    if (!holdUntil) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [holdUntil])

  const total = useMemo(() => {
    const typeById: Record<number, any> = Object.fromEntries(types.map((t:any)=> [t.id, t]))
    return assign.reduce((sum, a) => sum + (typeById[a.type_id]?.price_baht || 0), 0)
  }, [assign, types])

  const summaryByType: Array<{ type_id: number; type_name: string; count: number }> = useMemo(() => {
    const byId: Record<number, any> = Object.fromEntries(types.map((t:any)=> [t.id, t]))
    const counts: Record<number, number> = {}
    assign.forEach(a => { counts[a.type_id] = (counts[a.type_id] || 0) + 1 })
    // Start with selected types
    const result: Array<{ type_id: number; type_name: string; count: number }> = []
    Object.entries(selectedTypes).forEach(([idStr, name]) => {
      const id = Number(idStr)
      result.push({ type_id: id, type_name: name || byId[id]?.name || `Type #${id}`, count: counts[id] || 0 })
    })
    // Include any types present in assign but not selected (safety)
    Object.keys(counts).forEach((idStr) => {
      const id = Number(idStr)
      if (selectedTypes[id] == null) {
        result.push({ type_id: id, type_name: byId[id]?.name || `Type #${id}`, count: counts[id] || 0 })
      }
    })
    return result
  }, [assign, selectedTypes, types])

  function adjustQty(type_id: number, delta: number) {
    setAssign(prev => {
      const name = selectedTypes[type_id] || prev.find(p => p.type_id === type_id)?.type_name || (types.find((t:any)=> t.id===type_id)?.name || `Type #${type_id}`)
      const current = prev.filter(p => p.type_id === type_id)
      const others = prev.filter(p => p.type_id !== type_id)
      if (delta > 0) {
        const add: any[] = []
        for (let i = 0; i < delta; i++) add.push({ type_id, type_name: name, first_name: '', last_name: '', email: '' })
        setSelectedTypes(st => ({ ...st, [type_id]: name }))
        return [...others, ...current, ...add]
      } else if (delta < 0) {
        const remove = Math.min(current.length, Math.abs(delta))
        const keep = Math.max(0, current.length - remove)
        // Keep selectedTypes entry so row remains visible even if keep = 0
        return [...others, ...current.slice(0, keep)]
      }
      return prev
    })
}

function ProgressSteps({ step }: { step: number }) {
  const pct = step <= 1 ? '0%' : step === 2 ? '50%' : '100%'
  const steps = [1, 2, 3] as const
  const labels: Record<number, string> = { 1: 'Purchase', 2: 'Assign Tickets', 3: 'Done' }
  return (
    <div className="mb-4">
      <div className="relative h-8">
        {/* Track */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-muted-foreground/30 -translate-y-1/2 z-0" />
        {/* Fill */}
        <div className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 transition-all z-0" style={{ width: pct }} />
        {/* Markers */}
        <div className="grid grid-cols-3 relative z-10">
          {steps.map((n, idx) => {
            const isPast = n < step
            const isCurrent = n === step
            return (
              <div key={n} className="flex flex-col items-center gap-1">
                <div className={`h-6 w-6 rounded-full border flex items-center justify-center transition-colors shadow-sm ${
                  isPast ? 'bg-primary text-primary-foreground border-primary' : isCurrent ? 'bg-background border-primary' : 'bg-background border-border'
                }`}>
                  {isPast ? (<Check className="h-4 w-4" />) : (<span className="text-xs">{n}</span>)}
                </div>
                <div className={`text-[11px] ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>{labels[n]}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

  function removeType(type_id: number) {
    setAssign(prev => prev.filter(p => p.type_id !== type_id))
    setSelectedTypes(prev => { const { [type_id]: _omit, ...rest } = prev; return rest })
  }

  // Email debounce validation (step 1)
  useEffect(() => {
    if (!emailDirty) return
    setShowEmailValidation(false)
    const id = window.setTimeout(() => setShowEmailValidation(true), 500)
    return () => window.clearTimeout(id)
  }, [buyer.email, emailDirty])

  function isValidEmail(v: string) {
    if (!v) return false
    return /^\S+@\S+\.\S+$/.test(v)
  }

  function isValidName(v: string) {
    // Letters, spaces, and hyphen only
    return v === '' || /^[A-Za-z\-\s]+$/.test(v)
  }

  function isValidMobile(v: string) {
    // Digits with optional leading +, 7-15 digits total
    return v === '' || /^\+?[0-9]{7,15}$/.test(v)
  }

  function formatDate(iso?: string) {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleString()
  }

  // Removed: Assign all to me (buyer always has access)

  function Thanks() {
    if (payLater) {
      return (
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">{formatDate(ev?.starts_at)}{ev?.ends_at ? ` — ${formatDate(ev?.ends_at)}` : ''}</div>
          <div className="text-sm">Your reservation has been received.</div>
          <div className="border rounded p-3 text-sm space-y-1">
            <div className="font-medium mb-1">Summary</div>
            <div>reservation/invoice sent to &gt; {buyer.email || '—'}</div>
          </div>
          <div className="text-sm text-muted-foreground">Tickets will be issued once payment has been made.</div>
          <div>
            <Button onClick={()=> navigate(`/eventpage?event=${encodeURIComponent(ev?.public_id || '')}`)}>Return to event page</Button>
          </div>
        </div>
      )
    }
    return (
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">Your order has been received.</div>
        <div className="border rounded p-3 text-sm space-y-1">
          <div className="font-medium mb-1">Summary</div>
          <div>invoice sent to &gt; {buyer.email || '—'}</div>
          {skipped ? (
            <div className="text-muted-foreground">Tickets were created under your email. You can assign them later.</div>
          ) : (
            assign.map((a, idx) => (
              <div key={idx}>{a.type_name} ticket sent to &gt; {a.email || `${a.first_name} ${a.last_name}` || '—'}</div>
            ))
          )}
        </div>
        <div>
          <Button onClick={()=> navigate(`/eventpage?event=${encodeURIComponent(ev?.public_id || '')}`)}>Return to event page</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl p-4">
      {/* Step progression */}
      <ProgressSteps step={step} />
      {!ev ? (<>Loading…</>) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{ev.title}</CardTitle>
            <div className="text-xs text-muted-foreground">{formatDate(ev.starts_at)}{ev.ends_at ? ` — ${formatDate(ev.ends_at)}` : ''}</div>
            <div className="text-xs text-muted-foreground">{ev.location || ''}</div>
            {step === 2 && holdUntil && !done && (
              <div className="mt-2 text-xs px-3 py-2 rounded border bg-amber-50 text-amber-800">
                Tickets held for 24 hours. Time remaining: {
                  (() => {
                    const ms = Math.max(0, holdUntil - now)
                    const h = Math.floor(ms / 3600000)
                    const m = Math.floor((ms % 3600000) / 60000)
                    const s = Math.floor((ms % 60000) / 1000)
                    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
                  })()
                }
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-2 space-y-4">
            {done ? (
              <Thanks />
            ) : step === 1 ? (
              <div className="space-y-3">
                {/* Heading removed per spec */}
                <div className="grid gap-4 md:grid-cols-[2fr_3fr]">
                  {/* Left: Order summary */}
                  <div className="border rounded p-3 space-y-2">
                    <div className="text-sm font-medium">Your order</div>
                    {summaryByType.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No tickets selected.</div>
                    ) : (
                      <div className="text-sm space-y-2">
                        {summaryByType.map(s => (
                          <div key={s.type_id} className="flex items-center justify-between">
                            <div>{s.type_name} × {s.count}</div>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="outline" onClick={()=> adjustQty(s.type_id, -1)}>-</Button>
                              <Button size="sm" variant="outline" onClick={()=> adjustQty(s.type_id, +1)}>+</Button>
                              <Button size="sm" variant="outline" onClick={()=> removeType(s.type_id)}>x</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="text-sm font-medium">Total: {total} THB</div>
                  </div>
                  {/* Right: Buyer + Invoice + Payment */}
                  <div className="border rounded p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Email</label>
                    <Input value={buyer.email} onChange={(e)=> { setBuyer(prev => ({ ...prev, email: e.target.value })); setEmailDirty(true) }} />
                    {showEmailValidation && buyer.email.length > 0 && !isValidEmail(buyer.email) && (
                      <div className="text-xs text-destructive mt-1">Please enter a valid email</div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">First name</label>
                    <Input value={buyer.first_name} onChange={(e)=> setBuyer(prev => ({ ...prev, first_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Last name</label>
                    <Input value={buyer.last_name} onChange={(e)=> setBuyer(prev => ({ ...prev, last_name: e.target.value }))} />
                  </div>
                      <div className="col-span-2 flex items-center justify-between py-1">
                      <label className="text-xs text-muted-foreground">Invoice required</label>
                      <Switch checked={invoiceRequired} onCheckedChange={(v)=> { setInvoiceRequired(v); if (v) setInvoiceType('company') }} />
                      </div>
                    {invoiceRequired && (
                      <>
                        <div className="col-span-2 flex items-center gap-2">
                          <Button type="button" size="sm" variant={invoiceType === 'person' ? 'default' : 'outline'} onClick={()=> setInvoiceType('person')}>Person</Button>
                          <Button type="button" size="sm" variant={invoiceType === 'company' ? 'default' : 'outline'} onClick={()=> setInvoiceType('company')}>Company</Button>
                        </div>
                        {invoiceType === 'company' ? (
                          <>
                            <div className="col-span-2"><label className="text-xs text-muted-foreground">Company name</label><Input value={invoice.company} onChange={(e)=> { setInvoiceCompanyEdited(true); setInvoice(prev => ({ ...prev, company: e.target.value })) }} /></div>
                            <div className="col-span-2"><label className="text-xs text-muted-foreground">Address</label><Input value={invoice.address} onChange={(e)=> setInvoice(prev => ({ ...prev, address: e.target.value }))} /></div>
                            <div><label className="text-xs text-muted-foreground">Company phone</label><Input value={invoice.company_phone} onChange={(e)=> setInvoice(prev => ({ ...prev, company_phone: e.target.value }))} /></div>
                            <div><label className="text-xs text-muted-foreground">VAT number</label><Input value={invoice.vat_number} onChange={(e)=> setInvoice(prev => ({ ...prev, vat_number: e.target.value }))} /></div>
                          </>
                        ) : (
                          <>
                            {/* Person: show Your name (does not populate company name) */}
                            <div className="col-span-2"><label className="text-xs text-muted-foreground">Your name</label><Input value={invoice.person_name} onChange={(e)=> { setInvoicePersonEdited(true); setInvoice(prev => ({ ...prev, person_name: e.target.value })) }} /></div>
                            <div className="col-span-2"><label className="text-xs text-muted-foreground">Address</label><Input value={invoice.address} onChange={(e)=> setInvoice(prev => ({ ...prev, address: e.target.value }))} /></div>
                            <div><label className="text-xs text-muted-foreground">Phone</label><Input value={invoice.person_phone} onChange={(e)=> setInvoice(prev => ({ ...prev, person_phone: e.target.value }))} /></div>
                            <div><label className="text-xs text-muted-foreground">Tax ID</label><Input value={invoice.vat_number} onChange={(e)=> setInvoice(prev => ({ ...prev, vat_number: e.target.value }))} /></div>
                          </>
                        )}
                      </>
                    )}
                      <div className="col-span-2"><label className="text-xs text-muted-foreground">Card number</label><Input placeholder="4242 4242 4242 4242" /></div>
                      <div><label className="text-xs text-muted-foreground">Expiry</label><Input placeholder="MM/YY" /></div>
                      <div><label className="text-xs text-muted-foreground">CVC</label><Input placeholder="CVC" /></div>
                    </div>
                  </div>
                </div>
                {/* Bottom actions */}
                <div className="flex items-center justify-between pt-2">
                  <Button variant="outline" onClick={()=> navigate(-1)}>Back</Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      disabled={!buyer.email}
                      onClick={async ()=> {
                        if (!isValidEmail(buyer.email)) return
                        setPayLater(true)
                        if (eventId) {
                          try {
                            const counts: Record<number, number> = {}
                            assign.forEach(a => { counts[a.type_id] = (counts[a.type_id] || 0) + 1 })
                            const items = Object.entries(counts).map(([tid, qty]) => ({ ticket_type_id: Number(tid), qty: Number(qty) }))
                            logEmail('reserve_confirm:request', { event_id: eventId, items })
                            await api.reserveConfirm({ event_id: eventId, email: buyer.email, hold_hours: 24, items })
                            logEmail('reserve_confirm:sent', { to: buyer.email })
                            setHoldUntil(Date.now() + 24*60*60*1000)
                          } catch (e) { console.warn('Reserve confirm email failed', e) }
                        }
                        setStep(2)
                      }}
                    >Pay later</Button>
                    <Button disabled={!buyer.email} onClick={()=> { if (!isValidEmail(buyer.email)) return; setPayLater(false); setStep(2) }}>Buy now</Button>
                  </div>
                </div>
              </div>
            ) : step === 2 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium"></div>
                  <div className="flex items-center gap-2">
                    {invoiceGuid && (
                      <a className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800" href={`/invoice/${invoiceGuid}`} target="_blank" rel="noreferrer">
                        Invoice sent • View now
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5"><path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42L17.59 5H14V3ZM5 5h5V3H3v7h2V5Zm0 14v-5H3v7h7v-2H5Zm16-5v5h-5v2h7v-7h-2Z"/></svg>
                      </a>
                    )}
                    {/* Removed: Assign all to me */}
                  </div>
                </div>
                {/* Group by ticket type */}
                <div className="grid gap-3">
                  {Object.entries(assign.reduce((acc: Record<number, number[]>, _a, i) => {
                    const a = assign[i]
                    acc[a.type_id] = acc[a.type_id] || []
                    acc[a.type_id].push(i)
                    return acc
                  }, {})).map(([typeIdStr, idxs]) => {
                    const typeId = Number(typeIdStr)
                    const typeName = assign[idxs[0]]?.type_name || `Type #${typeId}`
                    return (
                      <div key={typeId} className="border rounded p-2">
                        <div className="text-sm font-medium mb-2">{typeName}</div>
                        <div className="grid gap-2">
                          {idxs.map((idx) => (
                            <div key={idx} className="grid md:grid-cols-[1fr_1fr_2fr_auto] gap-2 items-end">
                              <div>
                                <label className="text-xs text-muted-foreground">First Name</label>
                                <Input value={assign[idx].first_name} onChange={(e)=> setAssign(prev => prev.map((x,i)=> i===idx ? { ...x, first_name: e.target.value } : x))} />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Last Name</label>
                                <Input value={assign[idx].last_name} onChange={(e)=> setAssign(prev => prev.map((x,i)=> i===idx ? { ...x, last_name: e.target.value } : x))} />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Email</label>
                                <Input value={assign[idx].email} onChange={(e)=> { const v = e.target.value; setAssign(prev => prev.map((x,i)=> i===idx ? { ...x, email: v } : x)); setHolderErrors(prev => ({ ...prev, [idx]: !v.includes('@') })) }} className={holderErrors[idx] ? 'border-destructive' : ''} />
                                {holderErrors[idx] && <div className="text-xs text-destructive mt-1">Valid email required</div>}
                              </div>
                              <div>
                                <Button variant="outline" size="sm" onClick={()=> setAssign(prev => prev.map((x,i)=> i===idx ? { ...x, first_name: '', last_name: '', email: '' } : x))}>Clear</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Add/Remove ticket controls removed on step 3 */}
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={()=> setStep(1)}>Back</Button>
                  <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={async ()=> {
                    // Skip assignment: create tickets owned by buyer
                    try {
                      const counts: Record<number, number> = {}
                      assign.forEach(a => { counts[a.type_id] = (counts[a.type_id] || 0) + 1 })
                      const payload = { event_id: eventId, buyer, pay_later: payLater, items: Object.entries(counts).map(([tid, qty]) => ({ ticket_type_id: Number(tid), qty: Number(qty) })) }
                      logEmail('skip_assignment_and_finish:request', { items: summaryByType })
                      await fetch((import.meta as any).env.DEV ? '/api/content/checkout_multi' : ((import.meta as any).env.VITE_API_BASE || '') + '/content/checkout_multi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                      logEmail('skip_assignment_and_finish:created', { count: assign.length })
                      setSkipped(true)
                      setStep(3); setDone(true)
                    } catch (e) {
                      alert('Failed to complete checkout')
                    }
                  }}>Skip, I’ll assign later</Button>
                  <Button onClick={async ()=> {
                    // Validate holder emails
                    const errors: Record<number, boolean> = {}
                    assign.forEach((a, idx) => { if (!a.email || !a.email.includes('@')) errors[idx] = true })
                    setHolderErrors(errors)
                    if (Object.keys(errors).length > 0) return
                    try {
                      const grouped: Record<number, any[]> = {}
                      assign.forEach(a => { grouped[a.type_id] = grouped[a.type_id] || []; grouped[a.type_id].push({ first_name: a.first_name || undefined, last_name: a.last_name || undefined, email: a.email }) })
                      const payload = { event_id: eventId, buyer, pay_later: payLater, items: Object.entries(grouped).map(([tid, arr]) => ({ ticket_type_id: Number(tid), assignees: arr })) }
                      logEmail('assign_and_finish:request', { items: summaryByType })
                      await fetch((import.meta as any).env.DEV ? '/api/content/checkout_multi' : ((import.meta as any).env.VITE_API_BASE || '') + '/content/checkout_multi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                      logEmail('assign_and_finish:emails_queued', { count: assign.length })
                      setStep(3); setDone(true)
                  } catch (e) {
                    alert('Failed to complete checkout')
                  }
                  }}>{payLater ? 'Assign and finish' : 'Send tickets and finish'}</Button>
                  </div>
                </div>
              </div>
            ) : step === 3 ? (<Thanks />) : null}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
