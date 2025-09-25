import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, EmptyState, CopyButton } from '@/components/kit'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    return `/purchase?event_id=${evId}&ticket_type_id=${ttId}`
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(text)
      setTimeout(()=> setCopied(''), 1500)
    } catch {}
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Content Management" />
      {loading && <p>Loading…</p>}
      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="grid gap-3">
        {events.map(ev => (
          <Card key={ev.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{ev.title}</CardTitle>
              <div className="text-xs text-muted-foreground">Starts: {formatDate(ev.starts_at)} {ev.ends_at ? `• Ends: ${formatDate(ev.ends_at)}` : ''}</div>
              <div className="text-xs text-muted-foreground">{ev.location || ''}</div>
            </CardHeader>
            <CardContent className="pt-2">
              <Accordion type="single" collapsible>
                <AccordionItem value="types">
                  <AccordionTrigger>Ticket types</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {(types[ev.id] || []).length === 0 && (
                        <div className="text-sm text-muted-foreground">No ticket types.</div>
                      )}
                      {(types[ev.id] || []).map((t:any) => (
                        <div key={t.id} className="grid grid-cols-[1fr_auto] items-center gap-2 border-t pt-2">
                          <div>
                            <div className="text-sm">{t.name} {t.active ? '' : '(inactive)'} {t.price_baht != null ? `— ${t.price_baht} THB` : ''}</div>
                            <div className="text-xs text-muted-foreground">Link: <code>{purchaseLink(ev.id, t.id)}</code></div>
                          </div>
                          <div className="flex gap-2">
                            <Link to={purchaseLink(ev.id, t.id)} className="px-3 py-1 border rounded text-sm">Open</Link>
                            <CopyButton value={window.location.origin + purchaseLink(ev.id, t.id)}>{copied === purchaseLink(ev.id, t.id) ? 'Copied!' : 'Copy link'}</CopyButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        ))}
        {events.length === 0 && !loading && (
          <EmptyState title="No events found." description="Create an event to generate purchase links." />
        )}
      </div>
    </section>
  )
}
