import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/permissions'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionOrUnauthorized(req, res)
  if (!session) return

  const barId = Number(req.query.barId)
  if (isNaN(barId)) return res.status(400).json({ error: 'Invalid barId' })

  if (req.method === 'GET') {
    const inventory = await prisma.barInventory.findMany({
      where: { barId },
      include: { product: true },
      orderBy: [{ product: { category: 'asc' } }, { product: { name: 'asc' } }],
    })
    return res.json(inventory)
  }

  res.setHeader('Allow', ['GET'])
  res.status(405).end()
}
