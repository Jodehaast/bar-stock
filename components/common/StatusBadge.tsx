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
  PAID: 'Paid',
  COMP: 'Comp',
  MIXED: 'Mixed',
  BAR: 'Bar',
  STOCK_ROOM: 'Stock Room',
}

interface Props {
  value: string
  type?: 'event' | 'bar' | 'movement' | 'movementType' | 'role' | 'stockType' | 'barType'
  size?: 'sm' | 'md'
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'red',
  BAR_MANAGER: 'cyan',
  RUNNER: 'orange',
  VIEWER: 'gray',
}

const STOCK_TYPE_COLORS: Record<string, string> = {
  PAID: 'green',
  COMP: 'purple',
  MIXED: 'yellow',
}

const BAR_TYPE_COLORS: Record<string, string> = {
  BAR: 'blue',
  STOCK_ROOM: 'orange',
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
      : type === 'stockType'
      ? STOCK_TYPE_COLORS
      : type === 'barType'
      ? BAR_TYPE_COLORS
      : MOVEMENT_COLORS

  return (
    <Badge colorScheme={colorMap[value] ?? 'gray'} fontSize={size === 'sm' ? 'xs' : 'sm'}>
      {LABELS[value] ?? value}
    </Badge>
  )
}
