import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TicketViewPage() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const code = params.get('code') || undefined
  const token = params.get('token') || params.get('ref') || undefined
  const [data, setData] = useState<any>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    (async () => {
      setErr('')
      try {
        if (!code && !token) throw new Error('Missing code or token')
        const res = token ? await api.ticketByToken(token) : await api.ticketByCode(code!)
        setData(res)
      } catch (e:any) {
        setErr(e.message || 'Failed to load ticket')
      }
    })()
  }, [code, token])

  const qrUrl = useMemo(() => {
    const c = data?.ticket?.code
    return c ? api.qrUrl(String(c), 6) : null
  }, [data])

  return (
    <div className="container mx-auto max-w-lg p-4">
      {!data && !err && <div>Loading…</div>}
      {err && <div className="text-sm text-destructive">{err}</div>}
      {data && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{data.event?.name || 'Event Ticket'}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Event Date:</span><br />{data.event?.start_at ? new Date(data.event.start_at).toLocaleString() : '—'}</div>
              <div><span className="text-muted-foreground">Location:</span><br />{data.event?.location || '—'}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Ticket Number:</span><br />{data.ticket?.number || '—'}</div>
              <div><span className="text-muted-foreground">Ticket Type:</span><br />{data.ticket?.type_name || data.ticket?.type_id || '—'}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Payment Status:</span><br className="hidden sm:block" /><span className="capitalize">{data.ticket?.payment_status || '—'}</span></div>
              <div><span className="text-muted-foreground">Check-in Code:</span><br /><span className="font-mono text-lg tracking-wider">{data.ticket?.code || '—'}</span></div>
            </div>
            {qrUrl && (
              <div className="flex justify-center py-2">
                <img alt="Ticket QR" src={qrUrl} className="h-44 w-44" />
              </div>
            )}
            <div className="mt-2">
              <div className="font-medium">Ticket Assigned To</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mt-1">
                <div><span className="text-muted-foreground">Name:</span><br />{[data.holder?.first_name, data.holder?.last_name].filter(Boolean).join(' ') || '—'}</div>
                <div><span className="text-muted-foreground">Email:</span><br />{data.holder?.email || '—'}</div>
                <div><span className="text-muted-foreground">Phone:</span><br />{data.holder?.phone || '—'}</div>
              </div>
            </div>
            {data.ticket?.attendance_refunded && (
              <div className="text-sm text-amber-600">Note: Attendance was refunded for this ticket.</div>
            )}
            {['refunding','voiding'].includes(data.ticket?.payment_status) && (
              <div className="text-sm text-amber-600">A refund is being processed for this ticket.</div>
            )}
            {['refunded','voided'].includes(data.ticket?.payment_status) && (
              <div className="text-sm text-destructive">This ticket has been {data.ticket.payment_status} and is not valid for entry.</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
