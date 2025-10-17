import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/kit'
import { Trash2 } from 'lucide-react'
import { api } from '@/lib/api/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { HandCoins, TicketCheck, Search } from 'lucide-react'

export default function AttendeesPage() {
  const [params, setParams] = useSearchParams()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [q, setQ] = useState(params.get('q') || '')
  // Removed buyer/holder filters per request
  const navigate = useNavigate()

  useEffect(() => {
    (async () => {
      setLoading(true); setError('')
      try {
        const list = await api.listContacts({ search: q || undefined, limit: 50, offset: 0 })
        setRows(list)
      } catch (e:any) {
        setError(e.message || 'Failed to load attendees')
      } finally { setLoading(false) }
    })()
  }, [q])

  useEffect(() => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    setParams(p, { replace: true })
  }, [q])

  const filtered = useMemo(() => rows, [rows])

  return (
    <section className="space-y-4">
      <PageHeader title="Ticket Holders" />
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <div className="text-sm text-muted-foreground mb-1">Search</div>
          <div className="relative">
            <Input value={q} onChange={(e)=> setQ(e.target.value)} placeholder="Name, email, phone…" className="pr-10" />
            {q && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={()=> setQ('')} aria-label="Clear search">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="border rounded">
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Counts</TableHead>
              <TableHead>Last activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r:any) => (
              <TableRow key={r.id} onClick={()=> navigate(`/attendees/${r.id}`)} className="cursor-pointer hover:bg-secondary/50">
                <TableCell className="whitespace-nowrap">{[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}</TableCell>
                <TableCell className="whitespace-nowrap">{r.email || '—'}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 mr-3"><HandCoins className="h-4 w-4" /> {r.events_purchased || 0}</span>
                  <span className="inline-flex items-center gap-1"><TicketCheck className="h-4 w-4" /> {r.tickets_held || 0}</span>
                </TableCell>
                <TableCell>{r.last_activity ? new Date(r.last_activity).toLocaleString() : '—'}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No attendees found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
