import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { GetServerSideProps } from 'next'

export default function Home() { return null }

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions)
  const role = (session?.user as any)?.role
  const operationalRoles = ['BAR_STAFF', 'RUNNER', 'STOCK_ROOM_STAFF', 'SECTION_MANAGER']
  if (role && operationalRoles.includes(role)) {
    return { redirect: { destination: '/my-work', permanent: false } }
  }
  return { redirect: { destination: '/events', permanent: false } }
}
