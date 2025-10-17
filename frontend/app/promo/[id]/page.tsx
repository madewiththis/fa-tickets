import { api } from '@/lib/api/client'
import { formatDateDDMMYY } from '@/lib/format'

export default async function PublicEventPage({ params }: { params: { id: string } }) {
  const publicId = params.id
  let ev: any = null
  try { ev = await api.resolveEvent(publicId) } catch (e: any) { return <div className="text-sm text-red-600">Failed to load event: {e?.message || 'Unknown error'}</div> }
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold">{ev.title}</h2>
      <div className="text-sm text-gray-600 dark:text-gray-400">{formatDateDDMMYY(ev.starts_at)}{ev.ends_at ? ` • ${formatDateDDMMYY(ev.ends_at)}` : ''}</div>
      <div className="text-sm">{ev.location || ''}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400">This is a public page placeholder. Purchase flows can be linked from here.</div>
    </section>
  )
}

