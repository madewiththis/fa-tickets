import { useEffect, useState } from 'react'
import { api } from '@/lib/api/client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { logEmail } from '@/lib/devlog'
import { Copy } from 'lucide-react'

export default function AdminEmailLogsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [testTo, setTestTo] = useState('')
  const { toast } = useToast()

  async function load() {
    setLoading(true); setErr('')
    try { setRows(await api.listEmailLogs(100, 0)) } catch (e:any) { setErr(e.message || 'Failed to load logs') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => {
    const text = q.trim().toLowerCase()
    if (!text) return true
    const hay = [r.to_email, r.template_name, r.subject, r.status, r.text_body].map((v:any)=> String(v||'').toLowerCase()).join(' ')
    return hay.includes(text)
  })

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold">Email Logs</h2>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</Button>
      </div>
      {err && <div className="text-sm text-destructive">{err}</div>}
      <div className="flex items-center gap-2 flex-wrap">
        <Input placeholder="Filter…" value={q} onChange={(e)=> setQ(e.target.value)} className="max-w-xs" />
        <div className="ml-auto flex items-center gap-2">
          <Input placeholder="Email address" value={testTo} onChange={(e)=> setTestTo(e.target.value)} className="max-w-xs" />
          <Button
            onClick={async ()=> {
              if (!testTo.includes('@')) { toast({ title: 'Enter a valid email', variant: 'destructive' as any }); return }
              try {
                logEmail('test_email:request', { to: testTo })
                await api.sendTestEmail(testTo)
                logEmail('test_email:sent', { to: testTo })
                toast({ title: 'Test email sent' })
                load()
              } catch (e:any) {
                logEmail('test_email:failed', { to: testTo, error: e?.message })
                toast({ title: e?.message || 'Send failed', variant: 'destructive' as any })
                load()
              }
            }}
          >Send test email</Button>
        </div>
      </div>
      <div className="border rounded">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Refs</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r:any) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</TableCell>
                <TableCell className="text-xs">{r.to_email}</TableCell>
                <TableCell className="text-xs">{r.template_name}</TableCell>
                <TableCell className="text-xs">{r.subject}</TableCell>
                <TableCell className="text-xs capitalize">{r.status}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{[r.event_id && `ev:${r.event_id}`, r.ticket_id && `t:${r.ticket_id}`, r.purchase_id && `p:${r.purchase_id}`].filter(Boolean).join(' · ')}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async ()=> {
                      try {
                        const payload = {
                          id: r.id,
                          created_at: r.created_at,
                          to_email: r.to_email,
                          subject: r.subject,
                          template_name: r.template_name,
                          status: r.status,
                          event_id: r.event_id,
                          ticket_id: r.ticket_id,
                          purchase_id: r.purchase_id,
                          context: r.context || {},
                          text_body: r.text_body || '',
                        }
                        await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
                        toast({ title: 'Copied email JSON' })
                      } catch (e:any) {
                        toast({ title: e?.message || 'Copy failed', variant: 'destructive' as any })
                      }
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" /> Copy
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No email logs.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
