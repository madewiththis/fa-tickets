export default function AttendeesLoading() {
  return (
    <section className="space-y-4 animate-pulse">
      <div className="h-6 w-40 bg-gray-200 dark:bg-gray-800 rounded" />
      <div className="border rounded">
        <div className="p-2 border-b">
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
        <div className="p-2 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 dark:bg-gray-900 rounded" />
          ))}
        </div>
      </div>
    </section>
  )
}

