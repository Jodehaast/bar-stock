import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized, requireRole } from '@/lib/permissions'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionOrUnauthorized(req, res)
  if (!session) return
  if (!requireRole(res, session, ['ADMIN'])) return

  const id = Number(req.query.productId)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' })

  if (req.method === 'PATCH') {
    const { name, unit, category, isActive } = req.body
    const product = await prisma.product.update({
      where: { id },
      data: { name, unit, category, isActive },
    })
    return res.json(product)
  }

  res.setHeader('Allow', ['PATCH'])
  res.status(405).end()
}
