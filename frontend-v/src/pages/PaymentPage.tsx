import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { formatAmount, formatNumber } from '@/lib/format'
import { api } from '../lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PageHeader, AsyncButton } from '@/components/kit'
import { StatusBadge } from '@/components/kit'
import { QRCodeDisplay } from '@/components/kit'

function useQueryParams() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const code = (params.get('code') || '').trim()
  const token = (params.get('token') || '').trim()
  const purchaseGuid = (params.get('purchase') || '').trim()
  const eventIdStr = (params.get('event_id') || '').trim()
  const event_id = eventIdStr ? Number(eventIdStr) : undefined
  return { code, token, event_id, purchaseGuid }
}

export default function PaymentPage() {
  const { code, event_id, token, purchaseGuid } = useQueryParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [ticket, setTicket] = useState<any | null>(null)
  const [purchase, setPurchase] = useState<any | null>(null)
  const [card, setCard] = useState('')
  const [name, setName] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [success, setSuccess] = useState(false)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    (async () => {
      if (!code && !token && !purchaseGuid) return
      setLoading(true); setError(''); setTicket(null); setSuccess(false)
      try {
        if (purchaseGuid) {
          const p = await api.getPurchaseByGuid(purchaseGuid)
          setPurchase(p)
        } else {
          const t = token ? await api.lookupByToken(token) : await api.lookupTicket(code, event_id)
          setTicket(t)
        }
      } catch (e:any) {
        setError(e.message || 'Failed to lookup ticket')
      } finally {
        setLoading(false)
      }
    })()
  }, [code, event_id, token, purchaseGuid])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  async function pay() {
    if (!ticket && !purchase) return
    setLoading(true); setError('')
    try {
      if (purchase) {
        await api.payPurchase(purchase.id)
        const p = await api.getPurchase(purchase.id)
        setPurchase(p)
      } else if (token) await api.payByToken(token)
      else await api.payTicket(ticket.event_id, ticket.short_code)
      setSuccess(true)
      // Refresh ticket
      if (ticket) {
        const t = token ? await api.lookupByToken(token) : await api.lookupTicket(ticket.short_code, ticket.event_id)
        setTicket(t)
      }
    } catch (e:any) {
      setError(e.message || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Pay for Ticket" />
      {!code && !token && !purchaseGuid && (
        <p className="text-sm text-destructive">Missing data in URL. Provide <code>/pay?token=&lt;GUID&gt;</code>.</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {purchase ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Purchase #{purchase.id}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {(() => {
                const created = purchase.created_at ? new Date(purchase.created_at).getTime() : null
                if (!created) return null
                const expires = created + 24*3600*1000
                const ms = Math.max(0, expires - now)
                const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000), s = Math.floor((ms%60000)/1000)
                return <div>Reservation holds for 24h. Time remaining: {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</div>
              })()}
            </div>
            <div className="border rounded">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b"><th className="text-left p-2">Ticket Type</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Price</th><th className="text-right p-2">Subtotal</th></tr>
                </thead>
                <tbody>
                  {(() => {
                    const map: Record<string, { name: string; qty: number; price: number }> = {}
                    for (const t of purchase.tickets || []) {
                      const key = String(t.type_id || '0') + ':' + (t.type_name || 'Ticket')
                      if (!map[key]) map[key] = { name: t.type_name || 'Ticket', qty: 0, price: (t as any).type_price || 0 }
                      map[key].qty += 1
                    }
                    const rows = Object.values(map)
                    const total = rows.reduce((s, r) => s + r.qty * r.price, 0)
                    return (
                      <>
                        {rows.map((r, idx) => (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="p-2">{r.name}</td>
                            <td className="p-2 text-right">{formatNumber(r.qty)}</td>
                            <td className="p-2 text-right">{formatAmount(r.price, purchase.currency || 'THB')}</td>
                            <td className="p-2 text-right">{formatAmount(r.qty * r.price, purchase.currency || 'THB')}</td>
                          </tr>
                        ))}
                        <tr>
                          <td className="p-2 text-right font-medium" colSpan={3}>Total</td>
                          <td className="p-2 text-right font-medium">{formatAmount(total, purchase.currency || 'THB')}</td>
                        </tr>
                      </>
                    )
                  })()}
                </tbody>
              </table>
            </div>
            { !success && (
              <div className="max-w-sm space-y-2">
                <Input placeholder="Card number" value={card} onChange={(e)=>setCard(e.target.value)} />
                <Input placeholder="Name on card" value={name} onChange={(e)=>setName(e.target.value)} />
                <div className="flex gap-2">
                  <Input placeholder="MM/YY" value={expiry} onChange={(e)=>setExpiry(e.target.value)} />
                  <Input placeholder="CVC" value={cvc} onChange={(e)=>setCvc(e.target.value)} />
                </div>
                <AsyncButton onClick={pay} disabled={loading} className="w-full">Pay now</AsyncButton>
              </div>
            )}
            { success && (
              <div className="text-sm text-green-600 dark:text-green-400">Payment successful. Tickets will arrive by email.</div>
            )}
          </CardContent>
        </Card>
      ) : ticket && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{ticket.event_title || `Event #${ticket.event_id}`}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 text-sm">
              {!!ticket.short_code && (
                <div>
                  <span className="text-muted-foreground mr-1">Code:</span>
                  <span className="font-medium">{ticket.short_code}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                <StatusBadge status={(ticket.status || 'assigned') as any} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Payment:</span>
                <StatusBadge status={(ticket.payment_status === 'paid' ? 'paid' : 'unpaid') as any} />
              </div>
            </div>

            {ticket.payment_status !== 'paid' && !success && (
              <div className="max-w-sm space-y-2">
                <Input placeholder="Card number" value={card} onChange={(e)=>setCard(e.target.value)} />
                <Input placeholder="Name on card" value={name} onChange={(e)=>setName(e.target.value)} />
                <div className="flex gap-2">
                  <Input placeholder="MM/YY" value={expiry} onChange={(e)=>setExpiry(e.target.value)} />
                  <Input placeholder="CVC" value={cvc} onChange={(e)=>setCvc(e.target.value)} />
                </div>
                <AsyncButton onClick={pay} disabled={loading || (!code && !token)} className="w-full">Pay now</AsyncButton>
              </div>
            )}

            {(success || ticket.payment_status === 'paid') && (
              <div className="space-y-2">
                <div className="text-sm text-green-600 dark:text-green-400">Payment successful. Your ticket is ready.</div>
                {!!ticket.short_code && (
                  <QRCodeDisplay imageUrl={api.qrUrl(ticket.short_code)} />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  )
}
