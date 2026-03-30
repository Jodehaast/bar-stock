import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized, requireRole } from '@/lib/permissions'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionOrUnauthorized(req, res)
  if (!session) return

  const barId = Number(req.query.barId)
  if (isNaN(barId)) return res.status(400).json({ error: 'Invalid barId' })

  if (req.method === 'GET') {
    const bar = await prisma.bar.findUnique({
      where: { id: barId },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        event: { select: { id: true, name: true, status: true } },
      },
    })
    if (!bar) return res.status(404).json({ error: 'Not found' })
    return res.json(bar)
  }

  if (req.method === 'PATCH') {
    if (!requireRole(res, session, ['ADMIN'])) return
    const { name, location, responsibleCompany, managerId, status, stockType } = req.body
    const bar = await prisma.bar.update({
      where: { id: barId },
      data: {
        ...(name && { name }),
        ...(location !== undefined && { location }),
        ...(responsibleCompany !== undefined && { responsibleCompany }),
        ...(managerId !== undefined && { managerId: managerId || null }),
        ...(status && { status }),
        ...(stockType && { stockType }),
      },
    })
    return res.json(bar)
  }

  res.setHeader('Allow', ['GET', 'PATCH'])
  res.status(405).end()
}
