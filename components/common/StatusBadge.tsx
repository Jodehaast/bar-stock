import { Badge } from '@chakra-ui/react'

const EVENT_COLORS: Record<string, string> = {
  SETUP: 'blue',
  ACTIVE: 'green',
  CLOSED: 'gray',
}

const BAR_COLORS: Record<string, string> = {
  OPEN: 'green',
  CLOSED: 'gray',
}

const MOVEMENT_COLORS: Record<string, string> = {
  PENDING: 'yellow',
  APPROVED: 'blue',
  DISPATCHED: 'orange',
  DELIVERED: 'green',
  CANCELLED: 'red',
}

const MOVEMENT_TYPE_COLORS: Record<string, string> = {
  INITIAL_ALLOCATION: 'purple',
  RESTOCK: 'cyan',
  TRANSFER: 'teal',
  CLOSE_OUT: 'orange',
}

const LABELS: Record<string, string> = {
  INITIAL_ALLOCATION: 'Initial',
  RESTOCK: 'Restock',
  TRANSFER: 'Transfer',
  CLOSE_OUT: 'Close Out',
  SETUP: 'Setup',
  ACTIVE: 'Active',
  CLOSED: 'Closed',
  OPEN: 'Open',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  ADMIN: 'Admin',
  BAR_MANAGER: 'Bar Manager',
  RUNNER: 'Runner',
  VIEWER: 'Viewer',
}

interface Props {
  value: string
  type?: 'event' | 'bar' | 'movement' | 'movementType' | 'role'
  size?: 'sm' | 'md'
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'red',
  BAR_MANAGER: 'cyan',
  RUNNER: 'orange',
  VIEWER: 'gray',
}

export default function StatusBadge({ value, type = 'movement', size = 'sm' }: Props) {
  const colorMap =
    type === 'event'
      ? EVENT_COLORS
      : type === 'bar'
      ? BAR_COLORS
      : type === 'movementType'
      ? MOVEMENT_TYPE_COLORS
      : type === 'role'
      ? ROLE_COLORS
      : MOVEMENT_COLORS

  return (
    <Badge colorScheme={colorMap[value] ?? 'gray'} fontSize={size === 'sm' ? 'xs' : 'sm'}>
      {LABELS[value] ?? value}
    </Badge>
  )
}
