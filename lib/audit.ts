import { prisma } from './prisma'

type AuditAction =
  | 'event.status_changed'
  | 'event.created'
  | 'movement.approved'
  | 'movement.rejected'
  | 'movement.ready'
  | 'movement.in_transit'
  | 'movement.delivered'
  | 'movement.created'
  | 'bar.created'
  | 'bar.deleted'
  | 'user.created'
  | 'user.deleted'

/**
 * Write an audit log entry. Fire-and-forget — errors are swallowed so they
 * never break the main request path.
 */
export function audit(
  userId: number,
  action: AuditAction,
  entityType: string,
  entityId: number,
  detail?: Record<string, unknown>
): void {
  prisma.auditLog
    .create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        detail: detail ? JSON.stringify(detail) : null,
      },
    })
    .catch((err) => console.error('[audit] failed to write log:', err))
}
