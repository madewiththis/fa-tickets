import React from 'react'

type Item = { key: string; value: React.ReactNode }

export function KeyValue({ items, columns = 2 }: { items: Item[]; columns?: 1 | 2 | 3 }) {
  const grid = columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'
  return (
    <div className={`grid gap-4 ${grid}`}>
      {items.map(({ key, value }) => (
        <div key={key} className="space-y-1">
          <div className="text-xs text-muted-foreground">{key}</div>
          <div className="text-sm">{value}</div>
        </div>
      ))}
    </div>
  )
}

