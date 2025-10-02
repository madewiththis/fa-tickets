"use client"
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api/client'

export default function AttendeesClient({ initialRows }: { initialRows: any[] }) {
  const [rows, setRows] = useState<any[]>(initialRows || [])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        if (!q.trim()) { setErr(''); if (!ignore) setRows(initialRows || []); return }
        setLoading(true); setErr('')
        const list = await api.listContacts({ search: q, limit: 50, offset: 0 })
        if (!ignore) setRows(list)
      } catch (e: any) { if (!ignore) setErr(e?.message || 'Failed to load') }
      finally { if (!ignore) setLoading(false) }
    })()
    return () => { ignore = true }
  }, [q, initialRows])

  const filtered = useMemo(() => rows, [rows])

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Search</div>
          <input
            value={q}
            onChange={(e)=> setQ(e.target.value)}
            placeholder="Name, email, phone…"
            className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900"
          />
        </div>
      </div>
      {loading && <div className="text-sm text-gray-500">Loading…</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="border rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Counts</th>
              <th className="p-2">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r:any) => (
              <tr key={r.id} className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className="p-2 whitespace-nowrap">
                  <Link href={`/attendees/${r.id}/overview`} className="underline underline-offset-2">
                    {[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}
                  </Link>
                </td>
                <td className="p-2 whitespace-nowrap">{r.email || '—'}</td>
                <td className="p-2">
                  <span className="inline-flex items-center gap-1 mr-3">{r.events_purchased || 0} evts</span>
                  <span className="inline-flex items-center gap-1">{r.tickets_held || 0} tix</span>
                </td>
                <td className="p-2 text-xs text-gray-600 dark:text-gray-400">{r.last_activity ? new Date(r.last_activity).toLocaleString() : '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="p-4 text-gray-500" colSpan={4}>No attendees found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

