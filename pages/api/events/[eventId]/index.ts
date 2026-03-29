import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized, requireRole } from '@/lib/permissions'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionOrUnauthorized(req, res)
  if (!session) return

  const eventId = Number(req.query.eventId)
  if (isNaN(eventId)) return res.status(400).json({ error: 'Invalid eventId' })

  if (req.method === 'GET') {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        bars: {
          include: { manager: { select: { name: true } }, _count: { select: { inventory: true } } },
          orderBy: { name: 'asc' },
        },
        _count: { select: { bars: true } },
      },
    })
    if (!event) return res.status(404).json({ error: 'Not found' })
    return res.json(event)
  }

  if (req.method === 'PATCH') {
    if (!requireRole(res, session, ['ADMIN'])) return
    const { name, date, venue, notes, status } = req.body
    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        ...(name && { name }),
        ...(date && { date: new Date(date) }),
        ...(venue && { venue }),
        ...(notes !== undefined && { notes }),
        ...(status && { status }),
      },
    })
    return res.json(event)
  }

  res.setHeader('Allow', ['GET', 'PATCH'])
  res.status(405).end()
}
