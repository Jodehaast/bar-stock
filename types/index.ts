export type UserRole = 'ADMIN' | 'BAR_MANAGER' | 'RUNNER' | 'VIEWER'
export type EventStatus = 'SETUP' | 'ACTIVE' | 'CLOSED'
export type BarStatus = 'OPEN' | 'CLOSED'
export type MovementType = 'INITIAL_ALLOCATION' | 'RESTOCK' | 'TRANSFER' | 'CLOSE_OUT'
export type MovementStatus = 'PENDING' | 'APPROVED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
}
