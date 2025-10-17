import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { PageHeader, FormGrid, FormField, AsyncButton } from '@/components/kit'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Calendar, DateRange } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { ChevronLeft, Pencil, Copy as CopyIcon, CopyCheck, Mails, SquareArrowOutUpRight, Search as SearchIcon, CalendarPlus2, Mail, Send, RotateCcw, MailCheck, ScanEye, ReceiptText, UserPlus, TicketMinus } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { logEmail } from '@/lib/devlog'
import { api } from '@/lib/api/client'
import { formatAmount, formatNumber } from '@/lib/format'

type EventItem = any
type TicketType = any

function formatDate(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2,'0')
  const mm = String(d.getMonth()+1).padStart(2,'0')
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

function toIsoDate(date?: string) {
  // Convert yyyy-MM-dd to ISO at midnight UTC to avoid TZ drift
  if (!date) return undefined
  return new Date(`${date}T00:00:00Z`).toISOString()
}

function toIsoWithTime(date?: string, time?: string) {
  if (!date || !time) return undefined as any
  // Interpret as UTC to match existing midnight-UTC behavior
  return new Date(`${date}T${time}:00Z`).toISOString()
}

function fromIsoToLocalDate(iso?: string) {
  if (!iso) return undefined
  const d = new Date(iso)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth()+1).padStart(2,'0')
  const dd = String(d.getUTCDate()).padStart(2,'0')
  return `${yyyy}-${mm}-${dd}`
}

function fromIsoToLocalTime(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const hh = String(d.getUTCHours()).padStart(2,'0')
  const mi = String(d.getUTCMinutes()).padStart(2,'0')
  return `${hh}:${mi}`
}

function normalizeUrl(value: string) {
  const v = (value || '').trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  if (/^www\./i.test(v)) return `https://${v}`
  return `https://www.${v}`
}

function EventList() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [includePast, setIncludePast] = useState(false)
  const [stats, setStats] = useState<Record<number, any>>({})
  const [unsoldValue, setUnsoldValue] = useState<Record<number, number>>({})

  // Live countdown ticker
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t)=>t+1), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    (async () => {
      setLoading(true); setErr('')
      try {
        const list = await api.listEvents(200, 0)
        setEvents(list)
        // Fetch stats + ticket types to compute unsold estimate
        try {
          const reconAll = await Promise.allSettled(list.map((ev:any)=> api.reconciliation(ev.id)))
          const typesAll = await Promise.allSettled(list.map((ev:any)=> api.listTicketTypes(ev.id)))
          const m: Record<number, any> = {}
          const uv: Record<number, number> = {}
          list.forEach((ev:any, idx:number) => {
            const r = reconAll[idx]
            if (r.status === 'fulfilled') m[ev.id] = r.value
            const t = typesAll[idx]
            if (t.status === 'fulfilled') {
              const types = t.value as any[]
              const priced = types.filter(tt => typeof tt.price_baht === 'number')
              const avg = priced.length > 0 ? priced.reduce((s:any,tt:any)=> s + (tt.price_baht||0), 0) / priced.length : 0
              const available = r.status === 'fulfilled' ? (r.value.available || 0) : 0
              uv[ev.id] = Math.round(available * avg)
            }
          })
          setStats(m)
          setUnsoldValue(uv)
        } catch {}
      } catch (e:any) {
        setErr(e.message || 'Failed to load events')
      } finally { setLoading(false) }
    })()
  }, [])

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

  const now = new Date()
  const isPast = (ev:any) => {
    const end = ev.ends_at ? new Date(ev.ends_at) : new Date(ev.starts_at)
    return end < now
  }
  const upcoming = events.filter(ev => !isPast(ev)).sort((a:any,b:any)=> new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
  const past = events.filter(ev => isPast(ev)).sort((a:any,b:any)=> new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
  const filtered = (q.trim() ? events : (includePast ? events : upcoming)).filter(ev => {
    const t = q.trim().toLowerCase()
    if (!t) return true
    return [ev.title, ev.location].some((v:any)=> String(v||'').toLowerCase().includes(t))
  })

  return (
    <section className="space-y-4">
      <PageHeader
        title="Events"
        actions={<Link to="/events/new" className="px-3 py-1.5 rounded border inline-flex items-center gap-1"><CalendarPlus2 className="h-4 w-4" /> New Event</Link>}
      />
      {loading && <p>Loading…</p>}
      {err && <p className="text-sm text-destructive">{err}</p>}

      {/* Search */}
      <div>
        <div className="relative">
          <Input value={q} onChange={(e)=> setQ(e.target.value)} placeholder="Search events…" className="pl-8 pr-8" />
          <SearchIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          {q && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={()=> setQ('')} aria-label="Clear search">×</button>
          )}
        </div>
      </div>

      {/* Starting Soon */}
      {!q.trim() && (
        <div className="space-y-2 mb-8">
          <div className="text-sm font-medium">Starting Soon</div>
          <div className="grid gap-3 grid-cols-1">
            {upcoming.slice(0,3).map(ev => (
              <Card key={ev.id}>
                <CardHeader className="pb-2">
                  <div className="grid sm:grid-cols-[1fr_220px] gap-3 items-start">
                    <div>
                      <CardTitle className="text-base">{ev.title}</CardTitle>
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
                        <span>{formatDate(ev.starts_at)}{ev.ends_at ? ` • ${formatDate(ev.ends_at)}` : ''}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded border text-[11px]">{useCountdown(ev.starts_at, ev.ends_at)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{ev.location || ''}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Link to={`/events/${ev.id}`} className="px-3 py-1 border rounded text-sm">Details</Link>
                        <Link to={`/events/${ev.id}/ticket-types`} className="px-3 py-1 border rounded text-sm">Tickets</Link>
                        <Link to={`/events/${ev.id}/invite`} className="px-3 py-1 border rounded text-sm">Invite</Link>
                        <Link to={`/events/${ev.id}/attendees`} className="px-3 py-1 border rounded text-sm">Attendees</Link>
                        <Link to={`/events/${ev.id}/promote`} className="px-3 py-1 border rounded text-sm">Promote</Link>
                        <EventPageMenu ev={ev} />
                      </div>
                    </div>
                    <div className="w-[220px] flex flex-col items-stretch gap-1">
                      {stats[ev.id] ? (
                        (()=>{
                          const s = stats[ev.id]
                          const total = s.tickets_total || 0
                          const registered = s.registered || 0
                          const paid = s.paid_count || 0
                          const available = s.available || 0
                          const paidValue = s.revenue_baht || 0
                          const unsoldVal = unsoldValue[ev.id] || 0
                          const pct = (n:number) => total > 0 ? Math.round((n/total)*100) : 0
                          const money = (n:number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'THB', currencyDisplay: 'narrowSymbol' as any, maximumFractionDigits: 0 }).format(n)
                          return (
                            <div className="text-[11px] border rounded p-2">
                              <div className="font-medium mb-1">Tickets</div>
                              <div className="flex justify-between"><span>Total</span><span>{total}</span></div>
                              <div className="flex justify-between"><span>Issued</span><span>{registered} ({pct(registered)}%)</span></div>
                              <div className="flex justify-between"><span>Paid</span><span>{paid} ({pct(paid)}%) {paidValue ? `(${money(paidValue)})` : ''}</span></div>
                              <div className="flex justify-between"><span>Unsold</span><span>{available} ({pct(available)}%) {unsoldVal ? `(${money(unsoldVal)})` : ''}</span></div>
                            </div>
                          )
                        })()
                      ) : (
                        <span className="text-xs text-muted-foreground">Loading stats…</span>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
            {upcoming.length === 0 && (
              <Card><CardContent className="py-6 text-sm text-muted-foreground">No upcoming events.</CardContent></Card>
            )}
          </div>
        </div>
      )}

      {/* All Events */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">All Events</div>
          {!q.trim() && (
            <Button variant="outline" size="sm" onClick={()=> setIncludePast(!includePast)}>{includePast ? 'Hide past events' : 'Show past events'}</Button>
          )}
        </div>
        <div className="border rounded">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Name</TableHead>
                <TableHead>Starting In</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Tickets</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="w-[200px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(ev => (
                <TableRow key={ev.id}>
                  <TableCell>{ev.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{useCountdown(ev.starts_at, ev.ends_at)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(ev.starts_at)}{ev.ends_at ? ` • ${formatDate(ev.ends_at)}` : ''}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{(() => { const s = stats[ev.id]; return s ? (s.tickets_total ?? '—') : '—' })()}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {(() => {
                      const s = stats[ev.id]
                      if (!s) return '—'
                      const sold = s.paid_count || 0
                      return `${sold}`
                    })()}
                 </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {(() => {
                      const single = ev.location_address?.single_line || ev.location || ''
                      const str = String(single || '')
                      return str.length > 25 ? str.slice(0,25) + '…' : (str || '—')
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Link to={`/events/${ev.id}`} className="px-3 py-1 border rounded text-sm">Open</Link>
                      <EventPageMenu ev={ev} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">No events.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  )
}

function EventPageMenu({ ev }: { ev: any }) {
  async function ensurePublicId(): Promise<string | null> {
    if (ev.public_id) return ev.public_id as string
    try {
      const full = await api.getEvent(ev.id)
      return full.public_id || null
    } catch { return null }
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">Event Page</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={async ()=> { const pid = await ensurePublicId(); if (pid) window.open(`/eventpage?event=${encodeURIComponent(pid)}`, '_blank') }}>
          <SquareArrowOutUpRight className="h-4 w-4 mr-2" /> Preview
        </DropdownMenuItem>
        <DropdownMenuItem onClick={async ()=> { const pid = await ensurePublicId(); if (pid) { try { await navigator.clipboard.writeText(window.location.origin + `/eventpage?event=${encodeURIComponent(pid)}`) } catch {} } }}>
          <CopyIcon className="h-4 w-4 mr-2" /> Copy link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Sidebar({ eventId, active, onSelect }: { eventId?: number; active: string; onSelect: (key: string) => void }) {
  const items = [
    ...(eventId ? [{ key: 'overview', label: 'Overview', enabled: true }] : []),
    { key: 'details', label: 'Details', enabled: true },
    { key: 'tickets', label: 'Tickets', enabled: !!eventId },
    { key: 'promote', label: 'Promote', enabled: !!eventId },
    { key: 'invite', label: 'Invite', enabled: !!eventId },
    { key: 'attendees', label: 'Attendees', enabled: !!eventId },
    { key: 'purchases', label: 'Purchases', enabled: !!eventId },
  ]
  return (
    <nav className="w-full md:w-56 lg:w-64">
      <div className="sticky top-4">
        <div className="grid gap-1">
          {items.map(it => (
            <button
              key={it.key}
              disabled={!it.enabled}
              onClick={() => it.enabled && onSelect(it.key)}
              className={`text-left px-3 py-2 rounded border ${active === it.key ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'} ${!it.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {it.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}

function useEventCode(startsDateLocal?: string, events?: EventItem[]) {
  return useMemo(() => {
    if (!startsDateLocal) return ''
    const d = new Date(startsDateLocal)
    if (Number.isNaN(d.getTime())) return ''
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const base = `${yyyy}${mm}${dd}`
    const titles = (events || []).map((e:any) => e.title || '')
    const same = titles.filter((t) => t === base || (t.startsWith(base + '-') && /^\d{8}-\d+$/.test(t)))
    if (same.length === 0) return base
    let n = 1
    same.forEach((t) => { const m = t.match(/-(\d+)$/); if (m) n = Math.max(n, parseInt(m[1]) + 1) })
    return `${base}-${n}`
  }, [startsDateLocal, events])
}

function DetailsSection({ eventId }: { eventId?: number }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  // Fields
  const [title, setTitle] = useState('')
  const [userEditedTitle, setUserEditedTitle] = useState(false)
  const [starts, setStarts] = useState<string | undefined>(undefined)
  const [ends, setEnds] = useState<string | undefined>(undefined)
  const [dateOpen, setDateOpen] = useState(false)
  const [startTime, setStartTime] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('')

  // Location
  const [mapsUrl, setMapsUrl] = useState('')
  const [addrQuick, setAddrQuick] = useState('')
  const [addrFormatted, setAddrFormatted] = useState('')

  // Contact
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  // For code uniqueness
  const [events, setEvents] = useState<EventItem[]>([])

  // Load events for code uniqueness and load current event if editing
  useEffect(() => {
    (async () => {
      try {
        const list = await api.listEvents(200, 0)
        setEvents(list)
      } catch {}
    })()
  }, [])

  useEffect(() => {
    if (!eventId) return
    (async () => {
      setLoading(true); setErr('')
      try {
        const ev = await api.getEvent(eventId)
        setTitle(ev.title || '')
        setStarts(fromIsoToLocalDate(ev.starts_at))
        setEnds(fromIsoToLocalDate(ev.ends_at))
        setStartTime(fromIsoToLocalTime(ev.starts_at))
        setEndTime(fromIsoToLocalTime(ev.ends_at || ev.starts_at))
        setMapsUrl(ev.address_maps_link || '')
        setAddrQuick(ev.location_address?.single_line || '')
        setAddrFormatted(ev.location_address?.formatted || '')
        setContactPhone(ev.contact_phone || '')
        setContactEmail(ev.contact_email || '')
      } catch (e:any) {
        setErr(e.message || 'Failed to load event')
      } finally { setLoading(false) }
    })()
  }, [eventId])

  // Default range to today when creating a new event
  useEffect(() => {
    if (eventId) return
    if (!starts) {
      const now = new Date()
      const yyyy = now.getUTCFullYear()
      const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(now.getUTCDate()).padStart(2, '0')
      const today = `${yyyy}-${mm}-${dd}`
      setStarts(today)
      setEnds(today)
      if (!startTime) setStartTime('10:00')
      if (!endTime) setEndTime('17:00')
    }
  }, [eventId])

  const eventCode = useEventCode(starts, events)

  // Auto-suggest title from eventCode if user hasn't edited
  useEffect(() => {
    if (!userEditedTitle) setTitle(eventCode)
  }, [eventCode, userEditedTitle])

  const errors = useMemo(() => {
    const errs: Record<string, string | undefined> = {}
    if (!title.trim()) errs.title = 'Title is required'
    if (!starts) errs.starts = 'Start date is required'
    if (!startTime) errs.startTime = 'Start time is required'
    if (!endTime) errs.endTime = 'End time is required'
    if (starts && ends && new Date(ends) < new Date(starts)) errs.ends = 'End date must be after start date'
    if (mapsUrl && !/^https?:\/\//i.test(normalizeUrl(mapsUrl))) errs.mapsUrl = 'Enter a valid URL'
    if (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail)) errs.contactEmail = 'Enter a valid email'
    if (starts && (!ends || ends === starts) && startTime && endTime) {
      // Same-day time ordering
      const a = startTime
      const b = endTime
      if (b <= a) errs.endTime = 'End time should be after start time'
    }
    return errs
  }, [title, starts, ends, startTime, endTime, mapsUrl, contactEmail])

  // Debounced validation visibility
  const [hasEdited, setHasEdited] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  useEffect(() => {
    if (!hasEdited) return
    setShowValidation(false)
    const id = window.setTimeout(() => setShowValidation(true), 500)
    return () => window.clearTimeout(id)
  }, [title, starts, ends, startTime, endTime, mapsUrl, contactEmail, addrQuick])

  async function save() {
    // Basic guard; detailed messages show inline
    if (Object.keys(errors).length > 0) { setHasEdited(true); setShowValidation(true); setErr('Please fix the highlighted fields.'); return }
    setErr('')
    const payload: any = {
      title: title || eventCode || 'Event',
      starts_at: toIsoWithTime(starts, startTime),
      ends_at: toIsoWithTime(ends || starts, endTime),
      address_maps_link: mapsUrl || null,
      location_address: (addrQuick || addrFormatted) ? { single_line: addrQuick || undefined, formatted: addrFormatted || undefined } : null,
      contact_phone: contactPhone || null,
      contact_email: contactEmail || null,
    }
    try {
      if (!eventId) {
        const created = await api.createEvent({ ...payload, capacity: 1000 })
        toast({ title: 'Event created' })
        navigate(`/events/${created.id}`)
      } else {
        await api.updateEvent(eventId, payload)
        toast({ title: 'Event updated' })
      }
    } catch (e:any) {
      setErr(e.message || 'Failed to save')
    }
  }

  return (
    <>
    <div className="space-y-6">
      {loading && <p>Loading…</p>}
      {err && <p className="text-sm text-destructive">{err}</p>}

      <div className="space-y-6">
        <div className="space-y-3">
          <FormGrid cols={2}>
            <FormField label="Title" required error={showValidation ? errors.title : undefined}>
              <Input value={title} onChange={(e)=> { setTitle(e.target.value); setUserEditedTitle(true); setHasEdited(true) }} placeholder="Event title or code" className={showValidation && errors.title ? 'border-destructive focus-visible:ring-destructive' : ''} />
            </FormField>
            <FormField label="Event Code">
              <Input value={eventCode} readOnly placeholder="Auto-generated from date" />
            </FormField>
          </FormGrid>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium">Date</div>
          <FormGrid cols={2}>
            <FormField className="md:col-span-1" label="Select range" required error={showValidation ? (errors.starts || errors.ends) : undefined}>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    {(() => {
                      function fmt(v?: string) {
                        if (!v) return ''
                        const d = new Date(v)
                        return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })
                      }
                      if (starts && ends) return `${fmt(starts)} — ${fmt(ends)}`
                      if (starts) return fmt(starts)
                      return <span className="text-muted-foreground">Pick a date</span>
                    })()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    numberOfMonths={2}
                    selected={{ from: starts ? new Date(starts) : undefined, to: ends ? new Date(ends) : undefined } as DateRange}
                    defaultMonth={starts ? new Date(starts) : undefined}
                    onSelect={(range: DateRange | undefined) => {
                      const from = range?.from ? fromIsoToLocalDate(range.from.toISOString()) : undefined
                      const to = range?.to ? fromIsoToLocalDate(range.to.toISOString()) : undefined
                      setStarts(from)
                      setEnds(to)
                      setHasEdited(true)
                    }}
                  />
                </PopoverContent>
              </Popover>
            </FormField>
            <FormField className="md:col-span-1" label="Times" required>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Start</span>
                <Input
                  type="time"
                  step={60}
                  value={startTime}
                  onChange={(e)=> { setStartTime(e.target.value); setHasEdited(true) }}
                  className={`w-28 ${showValidation && errors.startTime ? 'border-destructive focus-visible:ring-destructive ' : ''} bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none`}
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="time"
                  step={60}
                  value={endTime}
                  onChange={(e)=> { setEndTime(e.target.value); setHasEdited(true) }}
                  className={`w-28 ${showValidation && errors.endTime ? 'border-destructive focus-visible:ring-destructive ' : ''} bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none`}
                />
              </div>
              {showValidation && (errors.starts || errors.ends) && (
                <p className="text-xs text-destructive mt-1">{errors.starts || errors.ends}</p>
              )}
            </FormField>
          </FormGrid>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium">Location</div>
          <FormGrid cols={2}>
            <FormField className="md:col-span-2" label="Address (Quick single line)">
              <Input placeholder="Street, Area, City, Country" value={addrQuick} onChange={(e)=> { setAddrQuick(e.target.value); setHasEdited(true) }} />
            </FormField>
            <FormField className="md:col-span-2" label="Google Maps URL" error={showValidation ? errors.mapsUrl : undefined}>
              <div className="relative">
                <Input
                  type="url"
                  placeholder="https://maps.google.com/..."
                  value={mapsUrl}
                  onChange={(e)=> { setMapsUrl(e.target.value); setHasEdited(true) }}
                  onBlur={(e)=> setMapsUrl(normalizeUrl(e.target.value))}
                  className={`${showValidation && errors.mapsUrl ? 'border-destructive focus-visible:ring-destructive ' : ''} pr-9`}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
                  onClick={()=> { const url = normalizeUrl(mapsUrl); if (url) window.open(url, '_blank') }}
                  disabled={!mapsUrl.trim()}
                  aria-label="Open Google Maps URL"
                >
                  <SquareArrowOutUpRight className="h-4 w-4" />
                </button>
              </div>
            </FormField>
            {false && (
              <FormField className="md:col-span-2" label="Address (Formatted)">
                <Textarea rows={3} placeholder={"Building\nStreet\nCity, State ZIP"} value={addrFormatted} onChange={(e)=> setAddrFormatted(e.target.value)} />
              </FormField>
            )}
          </FormGrid>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium">Event Contact</div>
          <FormGrid cols={3}>
            <FormField label="Phone"><Input value={contactPhone} onChange={(e)=> { setContactPhone(e.target.value); setHasEdited(true) }} /></FormField>
            <FormField label="Email" error={showValidation ? errors.contactEmail : undefined}><Input type="email" value={contactEmail} onChange={(e)=> { setContactEmail(e.target.value); setHasEdited(true) }} className={showValidation && errors.contactEmail ? 'border-destructive focus-visible:ring-destructive' : ''} /></FormField>
          </FormGrid>
        </div>

        <div className="pt-2">
          <AsyncButton onClick={save}>{eventId ? 'Save Changes' : 'Create Event'}</AsyncButton>
        </div>
      </div>
    </div>
    </>
  )
}

function TicketsSection({ eventId }: { eventId: number }) {
  const { toast } = useToast()
  const [types, setTypes] = useState<TicketType[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const [name, setName] = useState('')
  const [price, setPrice] = useState<number | ''>('' as any)
  const [maxQty, setMaxQty] = useState<number | ''>('' as any)
  // New ticket types default to inactive; no UI toggle on create.

  // Removed capacity tracking; totals determined by ticket types
  const [issuedByType, setIssuedByType] = useState<Record<number, number>>({})
  const [purchasedByType, setPurchasedByType] = useState<Record<number, number>>({})
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState<number | ''>('' as any)
  const [editMax, setEditMax] = useState<number | ''>('' as any)

  function purchaseLink(evId: number, ttId: number) {
    return `/purchase?event_id=${evId}&ticket_type_id=${ttId}`
  }

  async function refresh() {
    setLoading(true); setErr('')
    try {
      const list = await api.listTicketTypes(eventId)
      setTypes(list)
      try {
        const tickets = await api.listTickets(eventId)
        const issued: Record<number, number> = {}
        const purchased: Record<number, number> = {}
        for (const t of tickets) {
          const k = Number(t.ticket_type_id)
          issued[k] = (issued[k] || 0) + 1
          if (t.payment_status === 'paid') purchased[k] = (purchased[k] || 0) + 1
        }
        setIssuedByType(issued)
        setPurchasedByType(purchased)
      } catch {}
    } catch (e:any) {
      setErr(e.message || 'Failed to load ticket types')
    } finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [eventId])

  async function addType() {
    try {
      await api.createTicketType(eventId, {
        name,
        price_baht: price === '' ? null : Number(price),
        max_quantity: maxQty === '' ? null : Number(maxQty),
        active: false,
      })
      setName(''); setPrice('' as any); setMaxQty('' as any)
      toast({ title: 'Ticket type added' })
      refresh()
    } catch (e:any) {
      setErr(e.message || 'Failed to add ticket type')
    }
  }

  return (
    <div className="space-y-6">
      {loading && <p>Loading…</p>}
      {err && <p className="text-sm text-destructive">{err}</p>}

      <div className="space-y-3">
        <div className="text-sm font-medium">Add ticket type</div>
        <FormGrid cols={4} className="items-end lg:[grid-template-columns:2fr_1fr_auto_auto]">
          <FormField label="Name">
            <Input value={name} onChange={(e)=> setName(e.target.value)} placeholder="General Admission" />
          </FormField>
          <FormField label="Price (THB)">
            <Input type="number" value={price === '' ? '' : String(price)} onChange={(e)=> setPrice(e.target.value ? Number(e.target.value) : ('' as any))} />
          </FormField>
          <FormField label="Max quantity" className="max-w-[9rem]">
            <Input type="number" value={maxQty === '' ? '' : String(maxQty)} onChange={(e)=> setMaxQty(e.target.value ? Number(e.target.value) : ('' as any))} />
          </FormField>
          <div className="md:col-span-1 lg:col-span-1">
            <AsyncButton className="w-full" onClick={addType}>Add</AsyncButton>
          </div>
        </FormGrid>
        {/* Capacity summary removed */}
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Existing types</div>
        <div className="space-y-2">
          {types.length === 0 && <div className="text-sm text-muted-foreground">No ticket types.</div>}
          {types.map((t:any) => (
            <div key={t.id} className="grid grid-cols-[1fr_auto] items-center gap-2 border-t pt-2">
              <div>
                {editingId === t.id ? (
                  <div className="space-y-2">
                    <FormGrid cols={4} className="items-end lg:[grid-template-columns:2fr_1fr_auto_auto]">
                      <FormField label="Name" error={!editName.trim() ? 'Name is required' : undefined}>
                        <Input value={editName} onChange={(e)=> setEditName(e.target.value)} />
                      </FormField>
                      <FormField label="Price (THB)" error={editPrice !== '' && Number(editPrice) < 0 ? 'Price must be 0 or more' : undefined}>
                        <Input type="number" value={editPrice === '' ? '' : String(editPrice)} onChange={(e)=> setEditPrice(e.target.value ? Number(e.target.value) : ('' as any))} />
                      </FormField>
                      <FormField label="Max quantity" className="max-w-[9rem]" error={editMax !== '' && Number(editMax) < 0 ? 'Max must be 0 or more' : undefined}>
                        <Input type="number" value={editMax === '' ? '' : String(editMax)} onChange={(e)=> setEditMax(e.target.value ? Number(e.target.value) : ('' as any))} />
                      </FormField>
                      <div className="flex gap-2">
                        <AsyncButton
                          disabled={(() => {
                            const curPrice:any = t.price_baht ?? ''
                            const curMax:any = t.max_quantity ?? ''
                            const noChange = editName === (t.name || '') && (editPrice === '' ? '' : Number(editPrice)) === (curPrice === '' ? '' : Number(curPrice)) && (editMax === '' ? '' : Number(editMax)) === (curMax === '' ? '' : Number(curMax))
                            const invalid = !editName.trim() || (editPrice !== '' && Number(editPrice) < 0) || (editMax !== '' && Number(editMax) < 0)
                            return noChange || invalid
                          })()}
                          onClick={async ()=> {
                          try {
                            await api.updateTicketType(t.id, {
                              name: editName,
                              price_baht: editPrice === '' ? null : Number(editPrice),
                              max_quantity: editMax === '' ? null : Number(editMax),
                            })
                            toast({ title: 'Ticket type updated' })
                            setEditingId(null)
                            refresh()
                          } catch (e:any) {
                            toast({ title: e.message || 'Failed to update', variant: 'destructive' as any })
                          }
                        }}>Save</AsyncButton>
                        <Button type="button" variant="outline" onClick={()=> setEditingId(null)}>Cancel</Button>
                      </div>
                    </FormGrid>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs">Max: {t.max_quantity ?? '—'}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs">Issued: {issuedByType[t.id] ?? 0}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs">Purchased: {purchasedByType[t.id] ?? 0}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-sm">{t.name} {t.active ? '' : '(inactive)'} {t.price_baht != null ? `— ${t.price_baht} THB` : ''}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs">Max: {t.max_quantity ?? '—'}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs">Issued: {issuedByType[t.id] ?? 0}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs">Purchased: {purchasedByType[t.id] ?? 0}</span>
                    </div>
                  </>
                )}
              </div>
              <div>
                {editingId !== t.id && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      title="Edit"
                      aria-label="Edit"
                      onClick={() => { setEditingId(t.id); setEditName(t.name || ''); setEditPrice(t.price_baht ?? ('' as any)); setEditMax(t.max_quantity ?? ('' as any)) }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async ()=> { try { await navigator.clipboard.writeText(window.location.origin + purchaseLink(eventId, t.id)) } catch {} }}
                    >
                      <CopyIcon className="h-4 w-4 mr-1" /> Booking Link
                    </Button>
                    <Button variant="outline" size="sm" onClick={async ()=> { await api.updateTicketType(t.id, { active: !t.active }); refresh() }}>{t.active ? 'Deactivate' : 'Activate'}</Button>
                    <Button asChild variant="outline" size="sm" title="Invite" aria-label="Invite">
                      <Link to={`/events/${eventId}/invite?ticket_type_id=${t.id}`}><Mails className="h-4 w-4" /></Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PromoteSection({ eventId }: { eventId: number }) {
  const { toast } = useToast()
  const [types, setTypes] = useState<TicketType[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [description, setDescription] = useState('')
  const [speakers, setSpeakers] = useState('')
  const [audience, setAudience] = useState('')
  const [purchasedByType, setPurchasedByType] = useState<Record<number, number>>({})

  useEffect(() => {
    (async () => {
      setLoading(true); setErr('')
      try {
        const list = await api.listTicketTypes(eventId)
        setTypes(list)
        try {
          const tickets = await api.listTickets(eventId)
          const purchased: Record<number, number> = {}
          for (const t of tickets) {
            if (t.payment_status === 'paid') {
              const k = Number(t.ticket_type_id)
              purchased[k] = (purchased[k] || 0) + 1
            }
          }
          setPurchasedByType(purchased)
        } catch {}
      } catch (e:any) {
        setErr(e.message || 'Failed to load ticket types')
      } finally { setLoading(false) }
    })()
  }, [eventId])

  // Per requirements, we no longer expose direct ticket links

  // Load/save promotion details via backend endpoints
  useEffect(() => {
    (async () => {
      try {
        const data = await api.getEventPromotion(eventId)
        setDescription(data.description || '')
        setSpeakers(data.speakers || '')
        setAudience(data.audience || '')
      } catch (e:any) {
        // If not found or endpoint unavailable, leave empty
        console.warn('Promotion fetch failed', e)
      }
    })()
  }, [eventId])

  async function savePromotion() {
    const payload = { description, speakers, audience }
    try {
      await api.saveEventPromotion(eventId, payload)
      toast({ title: 'Promotion details saved' })
    } catch (e:any) {
      toast({ title: e.message || 'Failed to save', variant: 'destructive' as any })
    }
  }

  return (
    <div className="space-y-6">
      {loading && <p>Loading…</p>}
      {err && <p className="text-sm text-destructive">{err}</p>}

      <div className="space-y-2">
        <div className="flex items-center justify-end">
          <PromoActions eventId={eventId} />
        </div>
        <div className="text-sm font-medium">Ticket Status</div>
        {types.length === 0 && <div className="text-sm text-muted-foreground">No ticket types.</div>}
        {types.map((t:any) => (
          <div key={t.id} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="text-sm">{t.name} {t.active ? '' : '(inactive)'} {t.price_baht != null ? `— ${t.price_baht} THB` : ''}</div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[11px]">
                {(() => { const sold = purchasedByType[t.id] || 0; return t.max_quantity != null ? `${sold}/${t.max_quantity} sold` : `${sold} sold` })()}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium">Promotion Page Details</div>
        <FormGrid cols={1}>
          <FormField label="Event Description">
            <Textarea rows={4} value={description} onChange={(e)=> setDescription(e.target.value)} placeholder="Describe the event…" />
          </FormField>
          <FormField label="Speaker List">
            <Textarea rows={3} value={speakers} onChange={(e)=> setSpeakers(e.target.value)} placeholder="List speakers, one per line…" />
          </FormField>
          <FormField label="Who is this for">
            <Textarea rows={3} value={audience} onChange={(e)=> setAudience(e.target.value)} placeholder="Ideal attendees / audience…" />
          </FormField>
        </FormGrid>
        <div><AsyncButton onClick={savePromotion}>Save Details</AsyncButton></div>
      </div>
    </div>
  )
}

function InviteSection({ eventId }: { eventId: number }) {
  const { toast } = useToast()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [ticketTypes, setTicketTypes] = useState<any[] | null>(null)
  const [ticketTypeId, setTicketTypeId] = useState<number | ''>('' as any)
  const [paymentStatus, setPaymentStatus] = useState<'paid'|'unpaid'|'waived'>('unpaid')
  // Removed capacity summary
  const [previewCode, setPreviewCode] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const types = await api.listTicketTypes(Number(eventId))
        setTicketTypes(types)
      } catch {
        setTicketTypes([])
      }
      // no capacity info
    })()
  }, [eventId])

  // Preselect ticket type from query string (ticket_type_id)
  useEffect(() => {
    const qp = new URLSearchParams(location.search)
    const tid = qp.get('ticket_type_id')
    if (tid) setTicketTypeId(Number(tid))
  }, [location.search])

  async function assign() {
    try {
      const body:any = { event_id: Number(eventId), customer: { email, first_name: firstName, last_name: lastName, phone }, payment_status: paymentStatus }
      if (ticketTypeId) body.ticket_type_id = Number(ticketTypeId)
      if (previewCode) body.desired_short_code = previewCode
      logEmail('assign:request', { event_id, payment_status: paymentStatus, ticket_type_id: ticketTypeId })
      const res = await api.assign(body)
      logEmail(paymentStatus === 'unpaid' ? 'email:reserved_assignment_holder:queued' : 'email:ticket_email:queued', { to: email, event_id })
      toast({ title: `Assigned ticket #${res.ticket_id}` })
      setPreviewCode(null)
    } catch (e:any) { toast({ title: e.message || 'Failed', variant: 'destructive' as any }) }
  }

  async function preview() {
    setPreviewing(true)
    try {
      const p = await api.assignPreview(Number(eventId))
      setPreviewCode(p.short_code)
      try {
        const svg = await api.qrSvgText(p.short_code)
        const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
        setQrDataUrl(dataUrl)
      } catch { setQrDataUrl(null) }
    } catch (e:any) {
      toast({ title: e.message || 'Failed', variant: 'destructive' as any })
    } finally { setPreviewing(false) }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 max-w-xl">
        {/* capacity removed */}
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
          <AsyncButton onClick={preview} disabled={!email || previewing}>{previewing ? 'Generating…' : 'Preview Ticket'}</AsyncButton>
        ) : (
          <Card className="mt-2">
            <CardHeader className="pb-2"><CardTitle className="text-base">Email Preview</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm"><strong>Subject:</strong> Your Ticket Code</div>
              <div className="text-sm"><strong>To:</strong> {email}</div>
              <div className="mt-2 whitespace-pre-wrap text-sm">
                {(() => {
                  const lines = [`Hi${firstName ? ' ' + firstName : ''},`]
                  if (paymentStatus === 'unpaid') {
                    const origin = (import.meta as any).env.VITE_PUBLIC_APP_ORIGIN || window.location.origin
                    const link = `${origin}/pay?token=<GUID>`
                    lines.push('', 'Your ticket is reserved.', 'Please complete payment to receive your ticket.', `Pay here: ${link}`)
                  } else {
                    lines.push('', `Your 3-digit check-in code is: ${previewCode}.`, '', 'Show this code at the door to check in.')
                  }
                  lines.push('', 'Thank you!')
                  return lines.join('\n')
                })()}
              </div>
              {qrDataUrl && (<div className="mt-2"><img alt="Ticket QR" src={qrDataUrl} className="h-40 w-40" /></div>)}
              <div className="mt-2 flex gap-2">
                <AsyncButton onClick={assign} disabled={!email}>Assign & Send</AsyncButton>
                <Button type="button" variant="outline" onClick={()=> setPreviewCode(null)}>Edit details</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function AttendeesSection({ eventId }: { eventId: number }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const { toast } = useToast()
  const [expanded, setExpanded] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [purchase, setPurchase] = useState<any | null>(null)

  useEffect(() => {
    (async () => {
      setLoading(true); setErr('')
      try {
        const list = await api.listAttendees(eventId)
        setRows(list)
      } catch (e:any) {
        setErr(e.message || 'Failed to load attendees')
      } finally { setLoading(false) }
    })()
  }, [eventId])

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (!text) return true
      const fields = [r.first_name, r.last_name, r.email, r.phone, r.short_code].map((v:any)=> String(v||'').toLowerCase())
      return fields.some(f => f.includes(text))
    })
  }, [rows, q, statusFilter])

  async function reload() {
    try { setRows(await api.listAttendees(eventId)) } catch {}
  }

  function canUnassign(r: any) {
    return r.payment_status === 'unpaid' || r.payment_status === 'waived'
  }

  async function viewPurchase(purchaseId: number | null | undefined) {
    if (!purchaseId) return
    try {
      const p = await api.getPurchase(purchaseId)
      setPurchase(p)
    } catch (e:any) {
      toast({ title: e.message || 'Failed to load purchase', variant: 'destructive' as any })
    }
  }
  function canRefund(r: any) {
    return r.payment_status === 'paid'
  }

  async function onUnassign(r: any) {
    setBusyId(r.ticket_id)
    try {
      await api.unassignTicket(r.ticket_id)
      toast({ title: 'Ticket unassigned' })
      await reload()
    } catch (e:any) {
      toast({ title: e.message || 'Unassign failed', variant: 'destructive' as any })
    } finally { setBusyId(null) }
  }

  async function onRefund(r: any) {
    setBusyId(r.ticket_id)
    try {
      await api.refundTicket(r.ticket_id)
      toast({ title: 'Refund initiated' })
      await reload()
    } catch (e:any) {
      toast({ title: e.message || 'Refund failed', variant: 'destructive' as any })
    } finally { setBusyId(null) }
  }

  return (
    <div className="space-y-6">
      {loading && <p>Loading…</p>}
      {err && <p className="text-sm text-destructive">{err}</p>}

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <FormField label="Search"><Input placeholder="Name, email, phone, code…" value={q} onChange={(e)=> setQ(e.target.value)} /></FormField>
        </div>
        <div className="w-48">
          <FormField label="Ticket status">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="held">Held</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="checked_in">Checked in</SelectItem>
                <SelectItem value="void">Void</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">Legend: Held = buyer-owned, not yet assigned to a holder.</div>

      <div className="border rounded">
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r:any) => (
              <>
                <TableRow key={`row-${r.ticket_id}`} onClick={()=> setExpanded(expanded === r.ticket_id ? null : r.ticket_id)} className="cursor-pointer hover:bg-secondary/50">
                  <TableCell className="whitespace-nowrap">{[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">{r.email || '—'}</TableCell>
                  <TableCell>{r.short_code || '—'}</TableCell>
                  <TableCell className="capitalize">{r.status?.replaceAll('_',' ') || '—'}</TableCell>
                  <TableCell className="capitalize">{r.payment_status || '—'}</TableCell>
                </TableRow>
                {expanded === r.ticket_id && (
                  <TableRow key={`details-${r.ticket_id}`}>
                    <TableCell colSpan={5}>
                        <div className="text-sm grid gap-2">
                          <div className="grid sm:grid-cols-3 gap-2">
                          <div><span className="text-muted-foreground">Ticket ID:</span> {r.ticket_id}</div>
                          <div><span className="text-muted-foreground">Code:</span> {r.short_code || '—'}</div>
                          <div><span className="text-muted-foreground">Checked in:</span> {r.checked_in_at ? new Date(r.checked_in_at).toLocaleString() : '—'}</div>
                          </div>
                          {(r.purchase_id || r.external_payment_ref) && (
                            <div className="grid sm:grid-cols-3 gap-2">
                              <div><span className="text-muted-foreground">Purchase ID:</span> {r.purchase_id || '—'}</div>
                              <div><span className="text-muted-foreground">Payment Ref:</span> {r.external_payment_ref || '—'}</div>
                            </div>
                          )}
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={()=> {
                              const href = r.ticket_uuid ? `/ticket?ref=${encodeURIComponent(r.ticket_uuid)}` : (r.short_code ? `/ticket?code=${encodeURIComponent(r.short_code)}` : '')
                              if (href) window.open(href, '_blank')
                            }}
                            disabled={!r.ticket_uuid && !r.short_code}
                          >
                            <ScanEye className="h-4 w-4 mr-1" /> Preview Ticket
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async ()=> {
                              try {
                                const href = r.ticket_uuid ? `/ticket?ref=${encodeURIComponent(r.ticket_uuid)}` : (r.short_code ? `/ticket?code=${encodeURIComponent(r.short_code)}` : '')
                                if (!href) return
                                await navigator.clipboard.writeText(window.location.origin + href)
                                toast({ title: 'Link copied' })
                              } catch {}
                            }}
                            disabled={!r.ticket_uuid && !r.short_code}
                          >
                            <CopyIcon className="h-4 w-4 mr-1" /> Copy Ticket Link
                          </Button>
                          {(r.payment_status === 'paid' || r.payment_status === 'waived') && (
                            <Button size="sm" variant="outline" onClick={async ()=> { try { logEmail('resend_ticket:request', { ticket_id: r.ticket_id }); await api.resendTicket(r.ticket_id); logEmail('email:ticket_email:queued', { ticket_id: r.ticket_id }); toast({ title: 'Ticket resent' }) } catch (e:any) { toast({ title: e.message || 'Failed', variant: 'destructive' as any }) } }}>
                              <Send className="h-4 w-4 mr-1" /> Resend ticket
                            </Button>
                          )}
                          {r.purchase_id && (
                            <Button size="sm" variant="outline" onClick={()=> { window.location.href = `/events/${eventId}/purchases?purchase=${r.purchase_id}` }}>
                              <ReceiptText className="h-4 w-4 mr-1" /> View Purchase
                            </Button>
                          )}
                          {(r.status === 'held') ? (
                            <Button size="sm" variant="outline" onClick={async ()=> {
                              const email = window.prompt('Assign to email:')
                              if (!email) return
                              try {
                                await api.reassignTicket(r.ticket_id, { email })
                                toast({ title: 'Ticket assigned' })
                                await reload()
                              } catch (e:any) {
                                toast({ title: e.message || 'Assign failed', variant: 'destructive' as any })
                              }
                            }}>
                              <UserPlus className="h-4 w-4 mr-1" /> Assign
                            </Button>
                          ) : (
                            canUnassign(r) && (
                              <Button size="sm" variant="destructive" disabled={busyId === r.ticket_id} onClick={()=> onUnassign(r)}>
                                <TicketMinus className="h-4 w-4 mr-1" /> {busyId === r.ticket_id ? 'Unassigning…' : 'Unassign'}
                              </Button>
                            )
                          )}
                          {/* Refund handled in Purchases section */}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
            {filtered.length === 0 && (<TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No attendees.</TableCell></TableRow>)}
          </TableBody>
        </Table>
      </div>
      
      <Dialog open={!!purchase} onOpenChange={(o)=> !o ? setPurchase(null) : null}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Purchase</DialogTitle>
        </DialogHeader>
        {purchase ? (
          <div className="space-y-3 text-sm">
            <div className="grid sm:grid-cols-3 gap-2">
              <div><span className="text-muted-foreground">Purchase ID:</span> {purchase.id}</div>
              <div><span className="text-muted-foreground">Payment Ref:</span> {purchase.external_payment_ref || '—'}</div>
              <div><span className="text-muted-foreground">Amount:</span> {purchase.total_amount != null ? `${purchase.total_amount} ${purchase.currency || ''}` : '—'}</div>
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              <div><span className="text-muted-foreground">Buyer:</span> {[purchase.buyer?.first_name, purchase.buyer?.last_name].filter(Boolean).join(' ') || '—'}</div>
              <div><span className="text-muted-foreground">Email:</span> {purchase.buyer?.email || '—'}</div>
              <div><span className="text-muted-foreground">Phone:</span> {purchase.buyer?.phone || '—'}</div>
            </div>
            <div className="border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket No.</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchase.tickets?.map((t:any) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.ticket_number || '—'}</TableCell>
                      <TableCell>{t.short_code || '—'}</TableCell>
                      <TableCell>{t.event_title || t.event_id}</TableCell>
                      <TableCell>{t.type_name || t.type_id || '—'}</TableCell>
                      <TableCell className="capitalize">{t.status?.replaceAll('_',' ')}</TableCell>
                      <TableCell className="capitalize">{t.payment_status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
    </div>
  )
}

function PromoActions({ eventId }: { eventId: number }) {
  const [ev, setEv] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    (async () => { try { setEv(await api.getEvent(eventId)) } catch {} })()
  }, [eventId])
  const pageUrl = ev?.public_id ? `${window.location.origin}/eventpage?event=${encodeURIComponent(ev.public_id)}` : ''
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={()=> { if (pageUrl) window.open(pageUrl, '_blank') }}>
        <SquareArrowOutUpRight className="h-4 w-4 mr-1" /> Preview Page
      </Button>
      <Button variant="outline" size="sm" onClick={async ()=> { if (pageUrl) { try { await navigator.clipboard.writeText(pageUrl); setCopied(true); setTimeout(()=> setCopied(false), 1500) } catch {} } }}>
        {copied ? <CopyCheck className="h-4 w-4 mr-1" /> : <CopyIcon className="h-4 w-4 mr-1" />}Page Link
      </Button>
    </div>
  )
}

function EventEditor() {
  const params = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const eventId = params.id ? Number(params.id) : undefined

  const initialTab = location.pathname.endsWith('/overview') ? 'overview'
    : location.pathname.endsWith('/attendees') ? 'attendees'
    : location.pathname.endsWith('/purchases') ? 'purchases'
    : location.pathname.endsWith('/ticket-types') ? 'tickets'
    : location.pathname.endsWith('/promote') ? 'promote'
    : location.pathname.endsWith('/invite') ? 'invite'
    : 'details'

  const [tab, setTab] = useState<string>(initialTab)
  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  function onSelect(key: string) {
    setTab(key)
    if (eventId) {
      const base = `/events/${eventId}`
      if (key === 'overview') navigate(`${base}/overview`)
      if (key === 'details') navigate(base)
      if (key === 'tickets') navigate(`${base}/ticket-types`)
      if (key === 'promote') navigate(`${base}/promote`)
      if (key === 'invite') navigate(`${base}/invite`)
      if (key === 'attendees') navigate(`${base}/attendees`)
      if (key === 'purchases') navigate(`${base}/purchases`)
    }
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title={(
          <Link to="/events" className="group inline-flex items-center gap-2 text-sm px-2 py-1 rounded border border-transparent hover:border-input hover:bg-secondary transition-colors">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:inline">Back to Events</span>
          </Link>
        )}
      />
      <div className="grid grid-cols-1 md:grid-cols-[1fr_3fr] gap-6">
        <Sidebar eventId={eventId} active={tab} onSelect={onSelect} />
        <div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{tab[0].toUpperCase() + tab.slice(1)}</CardTitle></CardHeader>
              <CardContent className="pt-2">
              {tab === 'overview' && eventId && <OverviewSection eventId={eventId} />}
              {tab === 'details' && <DetailsSection eventId={eventId} />}
              {tab === 'tickets' && eventId && <TicketsSection eventId={eventId} />}
              {tab === 'promote' && eventId && <PromoteSection eventId={eventId} />}
              {tab === 'invite' && eventId && <InviteSection eventId={eventId} />}
              {tab === 'attendees' && eventId && <AttendeesSection eventId={eventId} />}
              {tab === 'purchases' && eventId && <EventPurchasesSection eventId={eventId} />}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

export default function EventsPage() {
  const location = useLocation()
  const isList = location.pathname === '/events'
  return isList ? <EventList /> : <EventEditor />
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="border rounded p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-medium">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  )
}

function OverviewSection({ eventId }: { eventId: number }) {
  const [stats, setStats] = useState<any | null>(null)
  const [plannedTotal, setPlannedTotal] = useState<number | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    (async () => {
      try {
        const [recon, types] = await Promise.all([
          api.reconciliation(eventId),
          api.listTicketTypes(eventId).catch(() => []),
        ])
        setStats(recon)
        try {
          const sum = (types || []).filter((t:any)=> t.active && t.max_quantity != null).reduce((s:number,t:any)=> s + (Number(t.max_quantity)||0), 0)
          setPlannedTotal(Number.isFinite(sum) ? sum : 0)
        } catch { setPlannedTotal(null) }
      } catch (e:any) { setErr(e.message || 'Failed to load stats') }
    })()
  }, [eventId])
  return (
    <div className="space-y-3">
      {err && <div className="text-sm text-destructive">{err}</div>}
      {!stats ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Tickets Created" value={plannedTotal ?? '—'} hint="Sum of max quantities for active ticket types" />
          <Stat label="Available" value={stats.available ?? '—'} hint="Not assigned" />
          <Stat label="Assigned" value={stats.assigned ?? '—'} hint="Assigned, not checked in yet" />
          <Stat label="Checked in" value={stats.checked_in ?? '—'} hint="Admitted attendees" />
          <Stat label="Delivered" value={stats.delivered ?? '—'} hint="Emails sent" />
          <Stat label="Registered" value={stats.registered ?? '—'} hint="Assigned + Checked in" />
          <Stat label="Paid" value={stats.paid_count ?? '—'} hint="Tickets marked paid" />
          <Stat label="Unpaid" value={stats.unpaid_count ?? '—'} hint="Awaiting payment" />
          <Stat label="Waived" value={stats.waived_count ?? '—'} hint="Complimentary" />
          <Stat label="Revenue (THB)" value={stats.revenue_baht ?? '—'} hint="Sum of paid ticket prices" />
        </div>
      )}
    </div>
  )
}
function EventPurchasesSection({ eventId }: { eventId: number }) {
  const { toast } = useToast()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [payment, setPayment] = useState<string>('all')
  const [purchase, setPurchase] = useState<any | null>(null)
  const [actionDone, setActionDone] = useState<{ invoice?: boolean; buyerPay?: boolean; resendAll?: boolean; refund?: boolean }>({})

  useEffect(() => {
    (async () => {
      setLoading(true); setErr('')
      try { setRows(await api.listEventPurchases(eventId)) } catch (e:any) { setErr(e.message || 'Failed to load') } finally { setLoading(false) }
    })()
  }, [eventId])

  // Optional: open purchase from query param
  useEffect(() => {
    (async () => {
      const sp = new URLSearchParams(window.location.search)
      const pid = sp.get('purchase')
      if (pid) {
        try { setPurchase(await api.getPurchase(Number(pid))) } catch {}
      }
    })()
  }, [eventId])

  // Derive payment status from aggregated counts on the row

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase()
    return rows.filter((r:any) => {
      if (payment !== 'all') {
        const paid = r.paid_count || 0; const unpaid = r.unpaid_count || 0; const waived = r.waived_count || 0
        const status = (paid>0 && unpaid===0 && waived===0) ? 'paid' : (paid===0 && unpaid>0 && waived===0) ? 'unpaid' : (paid===0 && unpaid===0 && waived>0) ? 'waived' : 'mixed'
        if (status !== payment) return false
      }
      if (!text) return true
      const fields = [r.id, r.external_payment_ref, r.currency].map((v:any)=> String(v||'').toLowerCase())
      return fields.some(f => f.includes(text))
    })
  }, [rows, q, payment])

  return (
    <div className="space-y-6">
      {loading && <p>Loading…</p>}
      {err && <p className="text-sm text-destructive">{err}</p>}
      {!purchase ? (
        <>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <FormField label="Search"><Input placeholder="Purchase id, ref…" value={q} onChange={(e)=> setQ(e.target.value)} /></FormField>
            </div>
            <div className="w-48">
              <FormField label="Payment status">
                <Select value={payment} onValueChange={setPayment}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="waived">Waived</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </div>

          <div className="border rounded">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tickets</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p:any) => {
                  const buyer = p.buyer || {}
                  const buyerName = [buyer.first_name, buyer.last_name].filter(Boolean).join(' ') || '—'
                  const buyerEmail = buyer.email || '—'
                  const paymentStatus = (() => {
                    const paid = p.paid_count || 0; const unpaid = p.unpaid_count || 0; const waived = p.waived_count || 0
                    if (paid>0 && unpaid===0 && waived===0) return 'paid'
                    if (paid===0 && unpaid>0 && waived===0) return 'unpaid'
                    if (paid===0 && unpaid===0 && waived>0) return 'waived'
                    return 'mixed'
                  })()
                  const amountNumber = (p.total_amount != null ? p.total_amount : (p.sum_price != null ? p.sum_price : 0))
                  const amount = formatAmount(amountNumber, p.currency || 'THB')
                  return (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-secondary/50" onClick={async ()=> { try { setPurchase(await api.getPurchase(p.id)) } catch {} }}>
                      <TableCell className="whitespace-nowrap">{buyerName}</TableCell>
                      <TableCell className="whitespace-nowrap">{buyerEmail}</TableCell>
                      <TableCell>{formatNumber(p.tickets || 0)}</TableCell>
                      <TableCell>{amount}</TableCell>
                      <TableCell className="capitalize">{paymentStatus}</TableCell>
                    </TableRow>
                  )
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No purchases</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Purchase #{purchase.id}</div>
            <Button variant="outline" size="sm" onClick={()=> setPurchase(null)}>Back</Button>
          </div>
          <div className="grid sm:grid-cols-3 gap-2 text-sm">
            <div><span className="text-muted-foreground">Payment Ref:</span> {purchase.external_payment_ref || '—'}</div>
            <div><span className="text-muted-foreground">Amount:</span> {purchase.total_amount != null ? `${purchase.total_amount} ${purchase.currency || ''}` : '—'}</div>
            <div><span className="text-muted-foreground">Created:</span> {purchase.created_at ? new Date(purchase.created_at).toLocaleString() : '—'}</div>
          </div>
          <div className="grid sm:grid-cols-3 gap-2 text-sm">
            <div><span className="text-muted-foreground">Buyer:</span> {[purchase.buyer?.first_name, purchase.buyer?.last_name].filter(Boolean).join(' ') || '—'}</div>
            <div><span className="text-muted-foreground">Email:</span> {purchase.buyer?.email || '—'}</div>
            <div><span className="text-muted-foreground">Phone:</span> {purchase.buyer?.phone || '—'}</div>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchase.tickets?.map((t:any) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.short_code || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.event_starts_at ? new Date(t.event_starts_at).toLocaleString() : '—'}</TableCell>
                    <TableCell>{t.type_name || t.type_id || '—'}</TableCell>
                    <TableCell className="capitalize">{t.status?.replaceAll('_',' ')}</TableCell>
                    <TableCell className="capitalize">{t.payment_status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap gap-2 justify-end pt-2">
            {(() => {
              const tks:any[] = purchase?.tickets || []
              const statuses = new Set(tks.map((t:any)=> t.payment_status))
              const allPaid = (statuses.size === 1 && statuses.has('paid'))
              if (!allPaid) {
                return (
                  <Button variant="outline" size="sm" onClick={async ()=> { try { logEmail('resend_purchase_payment:request', { purchase_id: purchase.id }); await api.resendPurchasePayment(purchase.id); logEmail('email:confirm_ticket_reservation:queued', { purchase_id: purchase.id }); setActionDone(prev=>({ ...prev, buyerPay: true })); toast({ title: 'Payment link sent to buyer' }) } catch (e:any) { console.error('resend_purchase_payment:error', e); toast({ title: e.message || 'Failed to send payment link', variant: 'destructive' as any }) } }}>
                    {actionDone.buyerPay ? <MailCheck className="h-4 w-4 mr-1" /> : <Send className="h-4 w-4 mr-1" />} Resend Payment Link
                  </Button>
                )
              }
              return (
                <>
                  <Button variant="outline" size="sm" onClick={async ()=> {
                    try {
                      const actions = tks.map(async (t:any) => { try { await api.resendTicket(t.id) } catch {} })
                      await Promise.all(actions)
                      setActionDone(prev=>({ ...prev, resendAll: true }))
                      toast({ title: 'Resent all ticket emails' })
                    } catch (e:any) {
                      toast({ title: e.message || 'Failed to resend', variant: 'destructive' as any })
                    }
                  }}>
                    {actionDone.resendAll ? <MailCheck className="h-4 w-4 mr-1" /> : <Send className="h-4 w-4 mr-1" />} Resend All Tickets
                  </Button>
                  <Button variant="outline" size="sm" onClick={()=> { setActionDone(prev=>({ ...prev, invoice: true })); toast({ title: 'Resent invoice (mock)' })}}>
                    {actionDone.invoice ? <MailCheck className="h-4 w-4 mr-1" /> : <Mail className="h-4 w-4 mr-1" />} Resend Invoice
                  </Button>
                  <Button variant="outline" size="sm" onClick={async ()=> {
                    try {
                      const actions = tks.filter((t:any)=> t.payment_status === 'paid').map((t:any)=> api.refundTicket(t.id))
                      if (actions.length === 0) { toast({ title: 'No paid tickets to refund' }); return }
                      await Promise.allSettled(actions)
                      setActionDone(prev=>({ ...prev, refund: true }))
                      toast({ title: 'Refund initiated for paid tickets' })
                    } catch (e:any) {
                      toast({ title: e.message || 'Refund failed', variant: 'destructive' as any })
                    }
                  }}>
                    {actionDone.refund ? <MailCheck className="h-4 w-4 mr-1" /> : <RotateCcw className="h-4 w-4 mr-1" />} Refund
                  </Button>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
