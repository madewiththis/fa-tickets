import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api/client'
import { PageHeader, Stat } from '@/components/kit'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

export default function ReportsPage() {
  const [eventId, setEventId] = useState<number | ''>('' as any)
  const [summary, setSummary] = useState<any>(null)
  const [error, setError] = useState('')
  const [events, setEvents] = useState<any[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [scope, setScope] = useState<'active' | 'all'>('active')

  useEffect(() => {
    (async () => {
      setLoadingEvents(true)
      setError('')
      try {
        const pageSize = 200
        let all: any[] = []
        let offset = 0
        while (true) {
          const page = await api.listEvents(pageSize, offset)
          all = all.concat(page)
          if (page.length < pageSize) break
          offset += pageSize
        }
        setEvents(all)
      } catch (e:any) {
        setError(e.message || 'Failed to load events')
      } finally {
        setLoadingEvents(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    if (scope === 'all') return events
    const now = new Date()
    return events.filter((ev:any) => {
      const starts = ev.starts_at ? new Date(ev.starts_at) : null
      const ends = ev.ends_at ? new Date(ev.ends_at) : null
      if (ends) return ends >= now
      if (starts) return starts >= now
      return false
    })
  }, [events, scope])

  async function load() {
    if (!eventId) return
    setError('')
    try { setSummary(await api.reconciliation(Number(eventId))) }
    catch (e:any) { setError(e.message) }
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Reports" />
      <div className="flex flex-nowrap items-center gap-2">
        <Select value={scope} onValueChange={(v)=> setScope(v as any)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active events</SelectItem>
            <SelectItem value="all">All events</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1 min-w-0">
          <Select value={eventId ? String(eventId) : ''} onValueChange={(v)=> setEventId(v ? Number(v) : ('' as any))}>
            <SelectTrigger className="w-full"><SelectValue placeholder={loadingEvents ? 'Loading…' : 'Select event…'} /></SelectTrigger>
            <SelectContent>
              {filtered.map((ev:any) => (
                <SelectItem key={ev.id} value={String(ev.id)}>
                  #{ev.id} • {ev.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={load} disabled={!eventId} className="whitespace-nowrap">Load</Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {summary && (
        <ReportSummary summary={summary} />
      )}
    </section>
  )
}

function ReportSummary({ summary }: { summary: any }) {
  const ev = summary.event || {}
  const starts = ev.starts_at ? new Date(ev.starts_at) : null
  const ends = ev.ends_at ? new Date(ev.ends_at) : null
  const now = new Date()

  const timeUntilStart = starts ? formatDistance(now, starts) : '—'
  const endDelta = ends ? (ends > now ? `Ends in ${formatDistance(now, ends)}` : `Ended ${formatDistance(ends, now)} ago`) : '—'

  const registered = summary.registered ?? ((summary.assigned||0) + (summary.delivered||0) + (summary.checked_in||0))
  const attended = summary.checked_in || 0
  const rate = registered > 0 ? `${Math.round((attended/registered)*100)}%` : '0%'
  const revenue = typeof summary.revenue_baht === 'number' ? summary.revenue_baht : 0

  return (
    <Card className="mt-2">
      <CardContent className="pt-6">
        <div className="font-semibold mb-2">{ev.title || 'Event'}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat label="Time until start" value={timeUntilStart} />
          <Stat label="Event end" value={endDelta} />
          <Stat label="Registered" value={String(registered)} />
          <Stat label="Attended" value={String(attended)} />
          <Stat label="Attendance rate" value={rate} />
          <Stat label="Revenue (THB)" value={String(revenue)} />
        </div>
      </CardContent>
    </Card>
  )
}

function Metric() { return null }

function formatDistance(a: Date, b: Date) {
  const ms = Math.abs(b.getTime() - a.getTime())
  const minutes = Math.floor(ms/60000)
  const hours = Math.floor(minutes/60)
  const days = Math.floor(hours/24)
  if (days > 0) return `${days}d ${hours%24}h`
  if (hours > 0) return `${hours}h ${minutes%60}m`
  return `${minutes}m`
}
