"use client"
import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api/client'
import { formatAmount } from '@/lib/format'

type TypeItem = { id: number; name: string; price_baht: number | null; max_quantity: number | null; active: boolean }

export default function TicketTypesClient({ eventId, initialTypes }: { eventId: number; initialTypes: TypeItem[] }) {
  const [types, setTypes] = useState<TypeItem[]>(initialTypes || [])
  const [creating, setCreating] = useState(false)
  const [newType, setNewType] = useState<Partial<TypeItem>>({ name: '', price_baht: 0, max_quantity: null, active: true })
  const [busyId, setBusyId] = useState<number | 'new' | null>(null)
  const [err, setErr] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [attendees, setAttendees] = useState<any[]>([])

  useEffect(() => {
    (async () => {
      try { setAttendees(await api.listAttendees(eventId)) } catch {}
    })()
  }, [eventId])

  const counts = useMemo(() => {
    const by: Record<number, { issued: number; paid: number }> = {}
    for (const a of attendees || []) {
      const tid = a.ticket_type_id
      if (!tid) continue
      if (!by[tid]) by[tid] = { issued: 0, paid: 0 }
      by[tid].issued += 1
      if (a.payment_status === 'paid') by[tid].paid += 1
    }
    return by
  }, [attendees])

  async function onCreate() {
    try {
      setBusyId('new'); setErr('')
      if (!newType.name?.trim()) throw new Error('Name is required')
      const body = {
        name: newType.name?.trim(),
        price_baht: Number(newType.price_baht) || 0,
        max_quantity: newType.max_quantity != null && newType.max_quantity !== ('' as any) ? Number(newType.max_quantity) : null,
        active: !!newType.active,
      }
      const created = await api.createTicketType(eventId, body)
      setTypes(prev => [...prev, created])
      setCreating(false)
      setNewType({ name: '', price_baht: 0, max_quantity: null, active: true })
    } catch (e: any) {
      setErr(e?.message || 'Create failed')
    } finally { setBusyId(null) }
  }

  async function onUpdate(it: TypeItem, patch: Partial<TypeItem>) {
    const updated = { ...it, ...patch }
    setTypes(prev => prev.map(t => (t.id === it.id ? updated : t)))
  }

  async function save(it: TypeItem) {
    try {
      setBusyId(it.id); setErr('')
      const body: any = {
        name: it.name,
        price_baht: Number(it.price_baht) || 0,
        max_quantity: it.max_quantity != null && it.max_quantity !== ('' as any) ? Number(it.max_quantity) : null,
        active: !!it.active,
      }
      const res = await api.updateTicketType(it.id, body)
      setTypes(prev => prev.map(t => (t.id === it.id ? res : t)))
    } catch (e: any) { setErr(e?.message || 'Save failed') }
    finally { setBusyId(null) }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 justify-end">
        <button onClick={()=> setCreating(c => !c)} className="ml-auto px-3 py-2 border rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800">{creating ? 'Cancel' : 'New Ticket Type'}</button>
      </div>
      {err && <div className="text-sm text-red-600">{err}</div>}

      {creating && (
        <div className="border rounded p-3 grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto] items-end">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Name</div>
            <input value={newType.name as any} onChange={(e)=> setNewType(nt => ({ ...nt, name: e.target.value }))} className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900" />
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Price (THB)</div>
            <input type="number" value={Number(newType.price_baht)||0} onChange={(e)=> setNewType(nt => ({ ...nt, price_baht: Number(e.target.value) }))} className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900" />
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Max qty</div>
            <input type="number" value={(newType.max_quantity as any) ?? ''} onChange={(e)=> setNewType(nt => ({ ...nt, max_quantity: e.target.value === '' ? null : Number(e.target.value) }))} className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900" />
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active</div>
            <select value={newType.active ? 'yes' : 'no'} onChange={(e)=> setNewType(nt => ({ ...nt, active: e.target.value === 'yes' }))} className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900">
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <button onClick={onCreate} disabled={busyId === 'new'} className="px-3 py-2 border rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800">{busyId === 'new' ? 'Creating…' : 'Create'}</button>
          </div>
        </div>
      )}

      <div className="border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2">Name</th>
              <th className="p-2">Price</th>
              <th className="p-2">Qty</th>
              <th className="p-2"># Issued</th>
              <th className="p-2"># Paid</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => {
              const c = counts[t.id] || { issued: 0, paid: 0 }
              const isEdit = editId === t.id
              return (
                <tr key={t.id} className="border-b last:border-b-0">
                  {!isEdit ? (
                    <>
                      <td className="p-2">{t.name || '—'}</td>
                      <td className="p-2">{formatAmount(Number(t.price_baht)||0, 'THB')}</td>
                      <td className="p-2">{t.max_quantity ?? '—'}</td>
                      <td className="p-2">{c.issued}</td>
                      <td className="p-2">{c.paid}</td>
                      <td className="p-2">
                        <button onClick={()=> setEditId(t.id)} className="px-2 py-1 border rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800">Edit</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-2">
                        <input
                          value={t.name || ''}
                          onChange={(e)=> onUpdate(t, { name: e.target.value })}
                          disabled={c.issued > 0}
                          className="w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-900 disabled:opacity-60"
                        />
                      </td>
                      <td className="p-2">
                        <input type="number" value={Number(t.price_baht)||0} onChange={(e)=> onUpdate(t, { price_baht: Number(e.target.value) })} className="w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-900" />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={(t.max_quantity as any) ?? ''}
                          onChange={(e)=> onUpdate(t, { max_quantity: e.target.value === '' ? null : Number(e.target.value) })}
                          className="w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-900"
                        />
                      </td>
                      <td className="p-2"></td>
                      <td className="p-2"></td>
                      <td className="p-2 flex gap-2">
                        <button
                          onClick={async ()=> {
                            // enforce max not below issued
                            const current = types.find(x => x.id === t.id)!
                            const newMax = current.max_quantity != null ? Number(current.max_quantity) : null
                            if (newMax != null && newMax < c.issued) { setErr(`Max qty cannot be below issued (${c.issued})`); return }
                            await save(current)
                            setEditId(null)
                          }}
                          disabled={busyId === t.id}
                          className="px-2 py-1 border rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                        >{busyId === t.id ? 'Saving…' : 'Save'}</button>
                        <button onClick={()=> { setEditId(null); setErr('') }} className="px-2 py-1 border rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
            {types.length === 0 && (
              <tr>
                <td className="p-4 text-gray-500" colSpan={6}>No ticket types.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
