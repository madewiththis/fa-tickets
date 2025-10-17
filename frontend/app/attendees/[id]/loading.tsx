export default function ContactLoading() {
  return (
    <section className="space-y-4 animate-pulse">
      <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-[1fr_3fr] gap-6">
        <nav className="w-full md:w-56 lg:w-64">
          <div className="sticky top-4">
            <div className="grid gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-9 bg-gray-200 dark:bg-gray-800 rounded" />
              ))}
            </div>
          </div>
        </nav>
        <div>
          <div className="border rounded">
            <div className="border-b px-4 py-3">
              <div className="h-5 w-56 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="h-4 w-72 bg-gray-200 dark:bg-gray-800 rounded mt-2" />
            </div>
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-6 bg-gray-100 dark:bg-gray-900 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

