import type { Session } from 'next-auth'
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

export type UserRole = 'ADMIN' | 'BAR_MANAGER' | 'RUNNER' | 'VIEWER'

export function getRole(session: Session | null): UserRole | null {
  return ((session?.user as any)?.role as UserRole) ?? null
}

export function isAdmin(session: Session | null) {
  return getRole(session) === 'ADMIN'
}

export function canApproveMovements(session: Session | null) {
  const role = getRole(session)
  return role === 'ADMIN' || role === 'RUNNER'
}

export function canRequestRestock(session: Session | null) {
  const role = getRole(session)
  return role === 'ADMIN' || role === 'BAR_MANAGER'
}

export function canEditEvent(session: Session | null) {
  return isAdmin(session)
}

/** Throws a 401/403 JSON response if the user doesn't meet the role requirement */
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
  if (!role || !roles.includes(role)) {
    res.status(403).json({ error: 'Forbidden' })
    return false
  }
  return true
}

/** Helper for API routes: returns session or writes 401 and returns null */
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

/** Helper for getServerSideProps: redirect to /login if not authenticated */
export async function requireAuth(
  context: GetServerSidePropsContext
): Promise<{ redirect: { destination: string; permanent: boolean } } | null> {
  const session = await getServerSession(context.req, context.res, authOptions)
  if (!session) {
    return { redirect: { destination: '/login', permanent: false } }
  }
  return null
}
