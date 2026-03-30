import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/permissions'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionOrUnauthorized(req, res)
  if (!session) return
  if (req.method !== 'GET') return res.status(405).end()

  const bars = await prisma.bar.findMany({
    where: {
      event: { status: 'ACTIVE' },
      barType: 'BAR',
    },
    include: {
      event: { select: { id: true, name: true, status: true } },
    },
    orderBy: [{ event: { date: 'desc' } }, { name: 'asc' }],
  })

  return res.json(bars)
}
