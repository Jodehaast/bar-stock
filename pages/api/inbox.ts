import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/permissions'

// Which statuses each role needs to action
const ROLE_STATUSES: Record<string, string[]> = {
  ADMIN: ['PENDING', 'APPROVED', 'READY', 'IN_TRANSIT'],
  SECTION_MANAGER: ['PENDING'],
  STOCK_ROOM_STAFF: ['APPROVED'],
  RUNNER: ['READY', 'IN_TRANSIT'],
  BAR_STAFF: ['PENDING', 'APPROVED', 'READY', 'IN_TRANSIT'],
  VIEWER: [],
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end()
  }

  const session = await getSessionOrUnauthorized(req, res)
  if (!session) return

  const role = (session.user as any).role as string
  const userId = Number((session.user as any).id)
  const statuses = ROLE_STATUSES[role] ?? []

  if (statuses.length === 0) return res.json([])

  // Find active event IDs first
  const activeEvents = await prisma.event.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true },
  })
  const activeEventIds = activeEvents.map((e) => e.id)
  const eventNameMap: Record<number, string> = {}
  activeEvents.forEach((e) => { eventNameMap[e.id] = e.name })

  if (activeEventIds.length === 0) return res.json([])

  // BAR_STAFF only sees their own requests
  const whereClause: any = {
    status: { in: statuses },
    eventId: { in: activeEventIds },
  }
  if (role === 'BAR_STAFF') {
    whereClause.createdById = userId
  }

  const movements = await prisma.stockMovement.findMany({
    where: whereClause,
    include: {
      fromBar: { select: { id: true, name: true } },
      toBar: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      lines: {
        include: { product: { select: { id: true, name: true, unit: true } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Attach event info manually since there's no relation
  const result = movements.map((m) => ({
    ...m,
    eventId: m.eventId,
    event: { id: m.eventId, name: eventNameMap[m.eventId] ?? '' },
  }))

  return res.json(result)
}
