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
  READY: 'cyan',
  IN_TRANSIT: 'orange',
  DELIVERED: 'green',
  REJECTED: 'red',
  CANCELLED: 'gray',
  // Legacy statuses kept for backward compat
  DISPATCHED: 'orange',
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
  READY: 'Ready to Collect',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  // Legacy
  DISPATCHED: 'Dispatched',
  ADMIN: 'Admin',
  SECTION_MANAGER: 'Section Manager',
  STOCK_ROOM_STAFF: 'Stock Room Staff',
  BAR_MANAGER: 'Bar Manager',
  RUNNER: 'Runner',
  BAR_STAFF: 'Bar Staff',
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
  SECTION_MANAGER: 'teal',
  STOCK_ROOM_STAFF: 'blue',
  BAR_MANAGER: 'cyan',
  RUNNER: 'orange',
  BAR_STAFF: 'purple',
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
