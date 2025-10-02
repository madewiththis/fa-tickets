import Link from 'next/link'
import { ReactNode } from 'react'
import { api } from '@/lib/api/client'
import TabsNav from './tabs/TabsClient'

export default async function EventLayout({ params, children }: { params: { id: string }; children: ReactNode }) {
  const id = Number(params.id)
  let ev: any = null
  try {
    ev = await api.getEvent(id)
  } catch {}

  return (
    <section className="space-y-4">
      <div>
        <Link href="/events" className="group inline-flex items-center gap-2 text-sm px-2 py-1 rounded border border-transparent hover:border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <span className="inline-block">←</span>
          <span className="sr-only sm:not-sr-only sm:inline">Back to Events</span>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_3fr] gap-6">
        <nav className="w-full md:w-56 lg:w-64">
          <div className="sticky top-4">
            <TabsNav eventId={id} />
          </div>
        </nav>
        <div>
          <div className="border rounded">
            <div className="border-b px-4 py-3 text-base font-medium">{ev?.title || `Event #${id}`}</div>
            <div className="p-4">
              {children}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

