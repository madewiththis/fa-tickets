"use client"
import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api/client'

export default function AdminEmailLogsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [testTo, setTestTo] = useState('')

  async function load() {
    setLoading(true); setErr('')
    try {
      const list = await api.listEmailLogs(100, 0) as any[]
      setRows(list)
    } catch (e:any) {
      setErr(e.message || 'Failed to load logs')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase()
    if (!text) return rows
    return rows.filter((r:any) => {
      const hay = [r.to_email, r.template_name, r.subject, r.status, r.text_body].map((v:any)=> String(v||'').toLowerCase()).join(' ')
      return hay.includes(text)
    })
  }, [rows, q])

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold">Email Logs</h2>
        <button onClick={load} disabled={loading} className="px-2 py-1 border rounded text-sm">{loading ? 'Refreshing…' : 'Refresh'}</button>
      </div>
      {err && <div className="text-sm text-red-600">{err}</div>}
      <div className="flex items-center gap-2 flex-wrap">
        <input placeholder="Filter…" value={q} onChange={(e)=> setQ(e.target.value)} className="max-w-xs px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900" />
        <div className="ml-auto flex items-center gap-2">
          <input placeholder="Email address" value={testTo} onChange={(e)=> setTestTo(e.target.value)} className="max-w-xs px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900" />
          <button
            onClick={async ()=> {
              if (!testTo.includes('@')) { alert('Enter a valid email'); return }
              try {
                await api.sendTestEmail(testTo)
                alert('Test email sent')
                load()
              } catch (e:any) {
                alert(e?.message || 'Send failed')
                load()
              }
            }}
            className="px-3 py-2 border rounded text-sm"
          >Send test email</button>
        </div>
      </div>
      <div className="border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2">Time</th>
              <th className="p-2">To</th>
              <th className="p-2">Template</th>
              <th className="p-2">Subject</th>
              <th className="p-2">Status</th>
              <th className="p-2">Refs</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r:any) => (
              <tr key={r.id} className="border-b last:border-b-0">
                <td className="p-2 text-xs text-gray-600 dark:text-gray-400">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2 text-xs">{r.to_email}</td>
                <td className="p-2 text-xs">{r.template_name}</td>
                <td className="p-2 text-xs">{r.subject}</td>
                <td className="p-2 text-xs capitalize">{r.status}</td>
                <td className="p-2 text-xs text-gray-600 dark:text-gray-400">{[r.event_id && `ev:${r.event_id}`, r.ticket_id && `t:${r.ticket_id}`, r.purchase_id && `p:${r.purchase_id}`].filter(Boolean).join(' · ')}</td>
                <td className="p-2 text-right">
                  <button
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
                        alert('Copied email JSON')
                      } catch (e:any) {
                        alert(e?.message || 'Copy failed')
                      }
                    }}
                    className="px-2 py-1 border rounded text-sm"
                  >Copy</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="p-4 text-gray-500" colSpan={7}>No email logs.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
