"use client"
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api/client'
import { formatAmount } from '@/lib/format'

type TypeItem = { id: number; name: string; price_baht?: number | null; max_quantity?: number | null; active?: boolean }

export default function PromoteClient({ eventId, initialTypes }: { eventId: number; initialTypes: TypeItem[] }) {
  const [types, setTypes] = useState<TypeItem[]>(initialTypes || [])
  const [purchasedByType, setPurchasedByType] = useState<Record<number, number>>({})
  const [description, setDescription] = useState('')
  const [speakers, setSpeakers] = useState('')
  const [audience, setAudience] = useState('')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const tix = await api.listTickets(eventId)
        const by: Record<number, number> = {}
        for (const t of tix || []) {
          if (t.payment_status === 'paid') {
            const tid = Number(t.ticket_type_id)
            by[tid] = (by[tid] || 0) + 1
          }
        }
        setPurchasedByType(by)
      } catch {}
    })()
  }, [eventId])

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getEventPromotion(eventId)
        setDescription(data?.description || '')
        setSpeakers(data?.speakers || '')
        setAudience(data?.audience || '')
      } catch {}
    })()
  }, [eventId])

  async function onCopyLink() {
    try {
      const url = `${window.location.origin}/promo/${eventId}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(()=> setCopied(false), 1200)
    } catch {}
  }

  async function save() {
    setSaving(true); setErr('')
    try { await api.saveEventPromotion(eventId, { description, speakers, audience }) }
    catch (e:any) { setErr(e?.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center">
        <h2 className="text-xl font-semibold">Promote</h2>
        <div className="ml-auto flex items-center gap-2">
          <Link href={`/promo/${eventId}`} target="_blank" className="px-3 py-2 border rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800">Preview Page</Link>
          <button type="button" onClick={onCopyLink} className="px-3 py-2 border rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800">{copied ? 'Copied!' : 'Page Link'}</button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-sm font-medium mb-2">Ticket Status</div>
          {types.length === 0 && <div className="text-sm text-gray-500">No ticket types.</div>}
          <div className="grid gap-2">
            {types.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <div className="text-sm">{t.name} {t.active ? '' : '(inactive)'} {t.price_baht != null ? `— ${formatAmount(Number(t.price_baht)||0, 'THB')}` : ''}</div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[11px]">
                  {(() => { const sold = purchasedByType[t.id] || 0; return t.max_quantity != null ? `${sold}/${t.max_quantity} sold` : `${sold} sold` })()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium">Promotion Page Details</div>
          <div className="grid gap-3">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Event Description</div>
              <textarea rows={4} value={description} onChange={(e)=> setDescription(e.target.value)} placeholder="Describe the event…" className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900" />
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Speaker List</div>
              <textarea rows={3} value={speakers} onChange={(e)=> setSpeakers(e.target.value)} placeholder="List speakers, one per line…" className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900" />
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Who is this for</div>
              <textarea rows={3} value={audience} onChange={(e)=> setAudience(e.target.value)} placeholder="Ideal attendees / audience…" className="w-full px-3 py-2 border rounded text-sm bg-white dark:bg-gray-900" />
            </div>
            <div>
              <button onClick={save} disabled={saving} className="px-3 py-2 border rounded text-sm bg-blue-600 text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save Details'}</button>
            </div>
            {err && <div className="text-sm text-red-600">{err}</div>}
          </div>
        </div>
      </div>
    </section>
  )
}
