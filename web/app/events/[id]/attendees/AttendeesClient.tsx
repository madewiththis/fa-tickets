"use client"
import { useMemo, useState } from 'react'
import Link from 'next/link'

type Row = any

function prettyStatus(v: string) {
  return (v || '—').replaceAll('_', ' ')
}

export default function AttendeesClient({ rows, eventId }: { rows: Row[]; eventId: number }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [copied, setCopied] = useState<string>('')

  const statuses = useMemo(() => {
    const s = Array.from(new Set((rows || []).map((r: any) => r.status).filter(Boolean))) as string[]
    return s.sort()
  }, [rows])

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase()
    return (rows || []).filter((r: any) => {
      if (status !== 'all') {
        if ((r.status || '') !== status) return false
      }
      if (!text) return true
      const hay = [r.first_name, r.last_name, r.email, r.short_code, r.ticket_number]
      return hay.some((v: any) => String(v || '').toLowerCase().includes(text))
    })
  }, [rows, q, status])

  function toggle(ticketId: number) {
    setExpanded(prev => ({ ...prev, [ticketId]: !prev[ticketId] }))
  }

  async function copyLink(code?: string) {
    if (!code) return
    try {
      const url = `${window.location.origin}/ticket?code=${encodeURIComponent(code)}`
      await navigator.clipboard.writeText(url)
      setCopied(code)
      setTimeout(() => setCopied(''), 1500)
    } catch {}
  }

  return (
    <section className="space-y-4">
      <div className="flex gap-2 items-end flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Search</div>
          <input
            value={q}
            onChange={(e)=> setQ(e.target.value)}
            placeholder="Name, email, code…"
            className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900"
          />
        </div>
        <div className="w-48">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</div>
          <select value={status} onChange={(e)=> setStatus(e.target.value)} className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900">
            <option value="all">All</option>
            {statuses.map(s => (
              <option key={s} value={s}>{prettyStatus(s)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-400">Legend: Held = buyer-owned, not yet assigned to a holder.</div>

      <div className="border rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Code</th>
              <th className="p-2">Status</th>
              <th className="p-2">Payment</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r:any) => {
              const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || '—'
              const isOpen = !!expanded[r.ticket_id]
              const code = r.short_code
              const purchaseId = r.purchase_id
              return (
                <>
                  <tr key={r.ticket_id} className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer" onClick={()=> toggle(r.ticket_id)}>
                    <td className="p-2 whitespace-nowrap">{name}</td>
                    <td className="p-2 whitespace-nowrap">{r.email || '—'}</td>
                    <td className="p-2">{code || '—'}</td>
                    <td className="p-2 capitalize">{prettyStatus(r.status)}</td>
                    <td className="p-2 capitalize">{r.payment_status || '—'}</td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b last:border-b-0 bg-gray-50/60 dark:bg-gray-800/40">
                      <td className="p-2" colSpan={5}>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={code ? `/ticket?code=${encodeURIComponent(code)}` : '#'}
                            onClick={(e)=> { if (!code) e.preventDefault() }}
                            className={`px-2 py-1 border rounded text-sm ${code ? 'hover:bg-gray-100 dark:hover:bg-gray-800' : 'opacity-50 cursor-not-allowed'}`}
                          >View Ticket</Link>
                          <button
                            type="button"
                            onClick={()=> copyLink(code)}
                            disabled={!code}
                            className={`px-2 py-1 border rounded text-sm ${code ? 'hover:bg-gray-100 dark:hover:bg-gray-800' : 'opacity-50 cursor-not-allowed'}`}
                          >{copied === code ? 'Copied!' : 'Copy Ticket Link'}</button>
                          <Link
                            href={`/events/${eventId}/purchases${purchaseId ? `?id=${encodeURIComponent(String(purchaseId))}` : ''}`}
                            className="px-2 py-1 border rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                          >{purchaseId ? `View Purchase #${purchaseId}` : 'View Purchases'}</Link>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td className="p-4 text-gray-500" colSpan={5}>No attendees.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
