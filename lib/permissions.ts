import type { Session } from 'next-auth'
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

export type UserRole =
  | 'ADMIN'           // Full access, ultimate approver
  | 'SECTION_MANAGER' // Approves requests from their bars
  | 'STOCK_ROOM_STAFF'// Preps stock, marks READY
  | 'RUNNER'          // Collects and delivers stock
  | 'BAR_STAFF'       // Creates requests, views their bar
  | 'VIEWER'          // Read-only

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Admin',
  SECTION_MANAGER: 'Section Manager',
  STOCK_ROOM_STAFF: 'Stock Room Staff',
  RUNNER: 'Runner',
  BAR_STAFF: 'Bar Staff',
  VIEWER: 'Viewer',
}

export function getRole(session: Session | null): UserRole | null {
  return ((session?.user as any)?.role as UserRole) ?? null
}

export function isAdmin(session: Session | null) {
  return getRole(session) === 'ADMIN'
}

/** Can approve/reject PENDING requests */
export function canApprove(session: Session | null) {
  const role = getRole(session)
  return role === 'ADMIN' || role === 'SECTION_MANAGER'
}

/** Can mark APPROVED → READY (stock prepped) */
export function canMarkReady(session: Session | null) {
  const role = getRole(session)
  return role === 'ADMIN' || role === 'STOCK_ROOM_STAFF'
}

/** Can mark READY → IN_TRANSIT and IN_TRANSIT → DELIVERED */
export function canDispatchAndDeliver(session: Session | null) {
  const role = getRole(session)
  return role === 'ADMIN' || role === 'RUNNER'
}

/** Can create restock/transfer requests */
export function canRequestRestock(session: Session | null) {
  const role = getRole(session)
  return role === 'ADMIN' || role === 'BAR_STAFF' || role === 'SECTION_MANAGER' || role === 'RUNNER'
}

/** Legacy alias */
export function canApproveMovements(session: Session | null) {
  return canApprove(session)
}

export function canEditEvent(session: Session | null) {
  return isAdmin(session)
}

export function requireRole(
  res: NextApiResponse,
  session: Session | null,
  roles: UserRole[]
): boolean {
  if (!session) {
    res.status(401).json({ error: 'Unauthenticated' })
    return false
  }
  const role = getRole(session)
  if (!role || !(roles as string[]).includes(role)) {
    res.status(403).json({ error: 'Forbidden' })
    return false
  }
  return true
}

export async function getSessionOrUnauthorized(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<Session | null> {
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    res.status(401).json({ error: 'Unauthenticated' })
    return null
  }
  return session
}

export async function requireAuth(
  context: GetServerSidePropsContext
): Promise<{ redirect: { destination: string; permanent: boolean } } | null> {
  const session = await getServerSession(context.req, context.res, authOptions)
  if (!session) {
    return { redirect: { destination: '/login', permanent: false } }
  }
  return null
}
