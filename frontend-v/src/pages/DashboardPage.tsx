import { PageHeader, Stat } from '@/components/kit'
import { Card, CardContent } from '@/components/ui/card'

export default function DashboardPage() {
  return (
    <section className="space-y-4">
      <PageHeader title="Dashboard" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Events" value="—" />
        <Stat label="Tickets" value="—" />
        <Stat label="Revenue" value="—" />
      </div>
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">Coming soon.</CardContent>
      </Card>
    </section>
  )
}
