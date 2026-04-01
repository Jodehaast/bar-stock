import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const config = { api: { bodyParser: false } }

const ROLE_STATUSES: Record<string, string[]> = {
  ADMIN: ['PENDING', 'APPROVED', 'READY', 'IN_TRANSIT'],
  SECTION_MANAGER: ['PENDING'],
  STOCK_ROOM_STAFF: ['APPROVED'],
  RUNNER: ['READY', 'IN_TRANSIT'],
  BAR_STAFF: ['PENDING', 'APPROVED', 'READY', 'IN_TRANSIT'],
  VIEWER: [],
}

async function fetchInbox(role: string, userId: number) {
  const statuses = ROLE_STATUSES[role] ?? []
  if (statuses.length === 0) return []

  const activeEvents = await prisma.event.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true },
  })
  const activeEventIds = activeEvents.map((e) => e.id)
  if (activeEventIds.length === 0) return []

  const whereClause: any = {
    status: { in: statuses },
    eventId: { in: activeEventIds },
  }
  if (role === 'BAR_STAFF') whereClause.createdById = userId

  return prisma.stockMovement.findMany({
    where: whereClause,
    include: {
      fromBar: { select: { id: true, name: true } },
      toBar: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      lines: { include: { product: { select: { id: true, name: true, unit: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).end()

  const role = (session.user as any).role as string
  const userId = Number((session.user as any).id)

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const send = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
    if (typeof (res as any).flush === 'function') (res as any).flush()
  }

  // Send initial data immediately
  const initial = await fetchInbox(role, userId)
  send(initial)

  // Poll every 3 seconds and push if anything changed
  let lastJson = JSON.stringify(initial)
  const poll = setInterval(async () => {
    try {
      const data = await fetchInbox(role, userId)
      const json = JSON.stringify(data)
      if (json !== lastJson) {
        lastJson = json
        send(data)
      }
    } catch { /* connection likely closed */ }
  }, 3000)

  // Heartbeat to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n')
    if (typeof (res as any).flush === 'function') (res as any).flush()
  }, 20000)

  req.on('close', () => {
    clearInterval(poll)
    clearInterval(heartbeat)
    res.end()
  })
}
