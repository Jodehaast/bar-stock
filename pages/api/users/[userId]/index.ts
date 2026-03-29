import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized, requireRole } from '@/lib/permissions'
import bcrypt from 'bcryptjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionOrUnauthorized(req, res)
  if (!session) return
  if (!requireRole(res, session, ['ADMIN'])) return

  const id = Number(req.query.userId)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' })

  if (req.method === 'PATCH') {
    const { name, role, password } = req.body
    const data: any = {}
    if (name) data.name = name
    if (role) data.role = role
    if (password) data.passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    })
    return res.json(user)
  }

  if (req.method === 'DELETE') {
    await prisma.user.delete({ where: { id } })
    return res.status(204).end()
  }

  res.setHeader('Allow', ['PATCH', 'DELETE'])
  res.status(405).end()
}
