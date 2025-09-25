import { useEffect, useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

function pad2(n: number) { return String(n).padStart(2,'0') }
function formatDateDMY(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const dd = pad2(d.getUTCDate())
  const mm = pad2(d.getUTCMonth() + 1)
  const yyyy = d.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}
function formatTimeHM(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  let h = d.getUTCHours()
  const m = d.getUTCMinutes()
  const am = h < 12
  const h12 = h % 12 === 0 ? 12 : h % 12
  const minStr = m === 0 ? '' : `:${pad2(m)}`
  return `${h12}${minStr}${am ? 'am' : 'pm'}`
}

export default function PublicEventPage() {
  const { search } = useLocation()
  const q = useMemo(()=> new URLSearchParams(search), [search])
  const publicId = q.get('event') || ''
  const [id, setId] = useState<number | null>(null)
  const [ev, setEv] = useState<any>(null)
  const [promo, setPromo] = useState<any>(null)
  const [types, setTypes] = useState<any[]>([])
  const [err, setErr] = useState('')
  const [qty, setQty] = useState<Record<number, number>>({})

  useEffect(() => {
    (async () => {
      try {
        if (!publicId) { setErr('Missing event id'); return }
        const e = await api.resolveEvent(publicId)
        setId(e.id)
        const [p, t] = await Promise.all([
          api.getEventPromotion(e.id).catch(()=>({})),
          api.listTicketTypes(e.id).catch(()=>[]),
        ])
        setEv(e); setPromo(p); setTypes(t)
      } catch (e:any) {
        setErr(e.message || 'Failed to load')
      }
    })()
  }, [publicId])

  const totalSelected = useMemo(() => Object.values(qty).reduce((a,b)=> a + (b||0), 0), [qty])
  function startPurchase() {
    const items = Object.entries(qty).filter(([_, n]) => (n||0) > 0).map(([k,n])=> ({ ticket_type_id: Number(k), qty: Number(n) }))
    const qs = new URLSearchParams()
    qs.set('event_id', String(id))
    qs.set('items', encodeURIComponent(JSON.stringify(items)))
    window.location.href = `/purchase2?${qs.toString()}`
  }

  if (!ev) return <div className="container mx-auto max-w-3xl p-4">{err || 'Loading…'}</div>

  return (
    <div className="container mx-auto max-w-3xl p-4 space-y-4">
      {/* No step guidance on event page per spec */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-3xl font-semibold">{ev.title}</CardTitle>
          <div className="text-sm text-muted-foreground">
            {formatDateDMY(ev.starts_at)}{ev.ends_at ? ` — ${formatDateDMY(ev.ends_at)}` : ''}
            {ev.starts_at && (
              <> ({formatTimeHM(ev.starts_at)}{ev.ends_at ? ` to ${formatTimeHM(ev.ends_at)}` : ''})</>
            )}
          </div>
          {ev.location && <div className="text-sm text-muted-foreground">{ev.location}</div>}
          {ev.address_maps_link && (
            <div className="text-sm"><a className="underline" href={ev.address_maps_link} target="_blank" rel="noreferrer">Open map</a></div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {(ev.contact_phone || ev.contact_email || ev.contact_url) && (
            <section>
              <div className="text-lg font-medium mb-1">Contact</div>
              <div className="grid gap-1 text-sm">
                {ev.contact_phone && <div>Phone: {ev.contact_phone}</div>}
                {ev.contact_email && <div>Email: {ev.contact_email}</div>}
                {ev.contact_url && <div>Website: <a className="underline" href={ev.contact_url}>{ev.contact_url}</a></div>}
              </div>
            </section>
          )}
          {promo?.description && (
            <section>
              <div className="text-lg font-medium mb-1">About</div>
              <div className="whitespace-pre-wrap text-sm">{promo.description}</div>
            </section>
          )}
          {promo?.speakers && (
            <section>
              <div className="text-lg font-medium mb-1">Speakers</div>
              <div className="whitespace-pre-wrap text-sm">{promo.speakers}</div>
            </section>
          )}
          {promo?.audience && (
            <section>
              <div className="text-lg font-medium mb-1">Who is this for</div>
              <div className="whitespace-pre-wrap text-sm">{promo.audience}</div>
            </section>
          )}
          <section>
            <div className="text-lg font-medium mb-2">Buy Tickets</div>
            <div className="grid gap-2">
              {types.filter((t:any)=>t.active).map((t:any) => {
                const v = qty[t.id] || 0
                const setVal = (n: number) => setQty(prev => ({ ...prev, [t.id]: Math.max(0, Math.min(999, n)) }))
                return (
                  <div key={t.id} className={`flex items-center justify-between border rounded p-2 ${v>0 ? 'bg-secondary/40' : ''}`}>
                    <div className="text-sm">{t.name} {t.price_baht != null ? `— ${t.price_baht} THB` : ''}</div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" onClick={()=> setVal((v||0) - 1)} aria-label="Decrease">-</Button>
                      <Button size="icon" variant="outline" onClick={()=> setVal((v||0) + 1)} aria-label="Increase">+</Button>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={3}
                        className="w-16 text-right"
                        value={v === 0 ? '' : String(v)}
                        placeholder="0"
                        onChange={(e)=> {
                          const digits = (e.target.value || '').replace(/[^0-9]/g, '').slice(0,3)
                          setVal(digits ? Number(digits) : 0)
                        }}
                      />
                      <Button size="icon" variant="outline" onClick={()=> setVal(0)} aria-label="Clear"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )
              })}
              {types.filter((t:any)=>t.active).length === 0 && (
                <div className="text-sm text-muted-foreground">No active tickets.</div>
              )}
            </div>
            <div className="pt-3">
              <Button disabled={totalSelected <= 0} onClick={startPurchase}>Buy</Button>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
