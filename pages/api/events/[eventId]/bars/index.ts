import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized, requireRole } from '@/lib/permissions'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionOrUnauthorized(req, res)
  if (!session) return

  const eventId = Number(req.query.eventId)
  if (isNaN(eventId)) return res.status(400).json({ error: 'Invalid eventId' })

  if (req.method === 'GET') {
    const bars = await prisma.bar.findMany({
      where: { eventId },
      include: {
        manager: { select: { id: true, name: true } },
        _count: { select: { inventory: true } },
      },
      orderBy: { name: 'asc' },
    })
    return res.json(bars)
  }

  if (req.method === 'POST') {
    if (!requireRole(res, session, ['ADMIN'])) return
    const { name, location, responsibleCompany, managerId } = req.body
    if (!name) return res.status(400).json({ error: 'name required' })
    try {
      const bar = await prisma.bar.create({
        data: { eventId, name, location, responsibleCompany, managerId: managerId || null },
      })
      return res.status(201).json(bar)
    } catch {
      return res.status(409).json({ error: 'Bar name already exists in this event' })
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end()
}
