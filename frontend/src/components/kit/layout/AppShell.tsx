import React from 'react'

export function AppShell({ header, sidebar, children }: { header?: React.ReactNode; sidebar?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {header}
      <div className="container mx-auto grid gap-4 md:grid-cols-[220px_1fr] p-4">
        {sidebar ? <aside className="hidden md:block">{sidebar}</aside> : null}
        <main>{children}</main>
      </div>
    </div>
  )
}

