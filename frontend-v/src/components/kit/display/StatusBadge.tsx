import React from 'react'
import { Badge } from '@/components/ui/badge'

type Status = 'paid' | 'unpaid' | 'held' | 'assigned' | 'delivered' | 'waived' | 'checkedIn'

const styles: Record<Status, { variant?: React.ComponentProps<typeof Badge>['variant'] }> = {
  paid: { variant: 'default' },
  unpaid: { variant: 'secondary' },
  held: { variant: 'secondary' },
  assigned: { variant: 'outline' },
  delivered: { variant: 'default' },
  waived: { variant: 'secondary' },
  checkedIn: { variant: 'default' },
}

export function StatusBadge({ status }: { status: Status }) {
  const label = status.replace(/([A-Z])/g, ' $1').trim()
  return <Badge variant={styles[status]?.variant}>{label}</Badge>
}
