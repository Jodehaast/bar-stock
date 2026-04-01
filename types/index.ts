export type UserRole = 'ADMIN' | 'SECTION_MANAGER' | 'STOCK_ROOM_STAFF' | 'RUNNER' | 'BAR_STAFF' | 'VIEWER'
export type EventStatus = 'SETUP' | 'ACTIVE' | 'CLOSED'
export type BarStatus = 'OPEN' | 'CLOSED'
export type MovementType = 'INITIAL_ALLOCATION' | 'RESTOCK' | 'TRANSFER' | 'CLOSE_OUT'
export type MovementStatus = 'PENDING' | 'APPROVED' | 'READY' | 'IN_TRANSIT' | 'DELIVERED' | 'REJECTED' | 'CANCELLED'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
}
