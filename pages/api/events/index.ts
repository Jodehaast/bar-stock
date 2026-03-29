import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized, requireRole } from '@/lib/permissions'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionOrUnauthorized(req, res)
  if (!session) return

  if (req.method === 'GET') {
    const events = await prisma.event.findMany({
      orderBy: { date: 'desc' },
      include: { _count: { select: { bars: true } } },
    })
    return res.json(events)
  }

  if (req.method === 'POST') {
    if (!requireRole(res, session, ['ADMIN'])) return
    const { name, date, venue, notes } = req.body
    if (!name || !date || !venue) return res.status(400).json({ error: 'name, date, venue required' })
    const event = await prisma.event.create({ data: { name, date: new Date(date), venue, notes } })
    return res.status(201).json(event)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end()
}
