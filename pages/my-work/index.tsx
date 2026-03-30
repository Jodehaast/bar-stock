import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { GetServerSideProps } from 'next'

export default function MyWork() { return null }

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions)
  if (!session) return { redirect: { destination: '/login', permanent: false } }
  const role = (session?.user as any)?.role
  const destinations: Record<string, string> = {
    BAR_STAFF: '/my-work/bar',
    RUNNER: '/my-work/runner',
    STOCK_ROOM_STAFF: '/my-work/stockroom',
    SECTION_MANAGER: '/my-work/manager',
  }
  const dest = destinations[role] ?? '/events'
  return { redirect: { destination: dest, permanent: false } }
}
