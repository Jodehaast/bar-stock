import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const token = req.query.token as string

  const bar = await prisma.bar.findUnique({ where: { accessToken: token } })
  if (!bar) return res.status(404).json({ error: 'Not found' })

  const movements = await prisma.stockMovement.findMany({
    where: { toBarId: bar.id, type: 'RESTOCK' },
    include: {
      lines: { include: { product: { select: { id: true, name: true, unit: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return res.json(movements)
}
