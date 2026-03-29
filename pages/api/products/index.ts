import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized, requireRole } from '@/lib/permissions'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionOrUnauthorized(req, res)
  if (!session) return

  if (req.method === 'GET') {
    const products = await prisma.product.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
    return res.json(products)
  }

  if (req.method === 'POST') {
    if (!requireRole(res, session, ['ADMIN'])) return
    const { name, unit, category, totsPerBottle } = req.body
    if (!name || !unit) return res.status(400).json({ error: 'name and unit are required' })
    try {
      const product = await prisma.product.create({
        data: { name, unit, category, totsPerBottle: totsPerBottle ? Number(totsPerBottle) : null },
      })
      return res.status(201).json(product)
    } catch {
      return res.status(409).json({ error: 'Product already exists' })
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end()
}
