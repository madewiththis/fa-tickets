"use client"
import { useEffect, useState } from 'react'
import { api } from '@/lib/api/client'

export default function ContentClient({ events }: { events: any[] }) {
  const [types, setTypes] = useState<Record<number, any[]>>({})
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [copied, setCopied] = useState<string>('')

  async function toggle(evId: number) {
    setExpanded(prev => ({ ...prev, [evId]: !prev[evId] }))
    if (!types[evId]) {
      try {
        const list = await api.listTicketTypes(evId)
        setTypes(prev => ({ ...prev, [evId]: list }))
      } catch {
        setTypes(prev => ({ ...prev, [evId]: [] }))
      }
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(text)
      setTimeout(()=> setCopied(''), 1500)
    } catch {}
  }

  function purchasePath(evId: number, ttId: number) {
    return `/purchase?event_id=${evId}&ticket_type_id=${ttId}`
  }

  return (
    <div className="grid gap-3">
      {events.map(ev => (
        <div key={ev.id} className="border rounded">
          <div className="px-4 py-3">
            <div className="text-base font-medium">{ev.title}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{ev.location || ''}</div>
          </div>
          <div className="border-t">
            <button onClick={()=> toggle(ev.id)} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800">Ticket types</button>
            {expanded[ev.id] && (
              <div className="px-4 py-2 space-y-2">
                {(types[ev.id] || []).length === 0 && (
                  <div className="text-sm text-gray-500">No ticket types.</div>
                )}
                {(types[ev.id] || []).map((t:any) => (
                  <div key={t.id} className="grid grid-cols-[1fr_auto] items-center gap-2 border-t pt-2">
                    <div>
                      <div className="text-sm">{t.name} {t.active ? '' : '(inactive)'} {t.price_baht != null ? `— ${t.price_baht} THB` : ''}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Link: <code>{purchasePath(ev.id, t.id)}</code></div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=> copy(window.location.origin + purchasePath(ev.id, t.id))} className="px-3 py-1 border rounded text-sm">{copied === (window.location.origin + purchasePath(ev.id, t.id)) ? 'Copied!' : 'Copy link'}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      {events.length === 0 && (
        <div className="border rounded p-6 text-sm text-gray-500">No events found. Create an event to generate purchase links.</div>
      )}
    </div>
  )
}
