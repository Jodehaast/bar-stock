import {
  Box, Button, Heading, HStack, Text, VStack, Badge,
  Alert, AlertIcon,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import AppShell from '@/components/layout/AppShell'
import { requireAuth } from '@/lib/permissions'
import type { GetServerSideProps } from 'next'
import useSWR, { mutate } from 'swr'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { useToast } from '@chakra-ui/react'

interface Movement {
  id: number
  type: string
  status: string
  notes: string | null
  createdAt: string
  fromBar: { id: number; name: string } | null
  toBar: { id: number; name: string } | null
  createdBy: { name: string }
  approvedBy: { name: string } | null
  lines: {
    id: number
    quantityRequested: number
    quantityActual: number | null
    product: { name: string; unit: string }
  }[]
  event?: { id: number; name: string }
  eventId?: number
}

// Fetch all movements across events that need action
function useMyQueue(role: string) {
  return useSWR<Movement[]>(role ? `/api/inbox?role=${role}` : null, { refreshInterval: 15000 })
}

export default function InboxPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role ?? ''
  const { data: movements = [], isLoading } = useMyQueue(role)
  const toast = useToast()
  const [acting, setActing] = useState<number | null>(null)

  const act = async (movementId: number, status: string, eventId: number) => {
    setActing(movementId)
    const res = await fetch(`/api/events/${eventId}/movements/${movementId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setActing(null)
    if (res.ok) {
      toast({ title: `Marked as ${status.toLowerCase().replace('_', ' ')}`, status: 'success', duration: 2000 })
      mutate(`/api/inbox?role=${role}`)
    } else {
      const err = await res.json()
      toast({ title: err.error ?? 'Error', status: 'error', duration: 3000 })
    }
  }

  // Role-based action buttons
  const getActions = (m: Movement, eventId: number) => {
    const actions: { label: string; status: string; color: string }[] = []
    if (role === 'ADMIN' || role === 'SECTION_MANAGER') {
      if (m.status === 'PENDING') {
        actions.push({ label: 'Approve', status: 'APPROVED', color: 'green' })
        actions.push({ label: 'Reject', status: 'REJECTED', color: 'red' })
      }
    }
    if (role === 'ADMIN' || role === 'STOCK_ROOM_STAFF') {
      if (m.status === 'APPROVED') {
        actions.push({ label: 'Mark Ready', status: 'READY', color: 'blue' })
      }
    }
    if (role === 'ADMIN' || role === 'RUNNER') {
      if (m.status === 'READY') {
        actions.push({ label: 'Collected', status: 'IN_TRANSIT', color: 'orange' })
      }
      if (m.status === 'IN_TRANSIT') {
        actions.push({ label: 'Delivered ✓', status: 'DELIVERED', color: 'green' })
      }
    }
    return actions
  }

  const roleLabel: Record<string, string> = {
    ADMIN: 'All pending actions',
    SECTION_MANAGER: 'Requests awaiting your approval',
    STOCK_ROOM_STAFF: 'Approved orders to prep',
    RUNNER: 'Stock ready to collect & deliver',
    BAR_STAFF: 'Your submitted requests',
    VIEWER: '',
  }

  const statusColors: Record<string, string> = {
    PENDING: 'yellow',
    APPROVED: 'blue',
    READY: 'cyan',
    IN_TRANSIT: 'orange',
    DELIVERED: 'green',
    REJECTED: 'red',
    CANCELLED: 'gray',
  }

  return (
    <AppShell title="Inbox">
      <VStack align="stretch" spacing={6}>
        <HStack justify="space-between">
          <VStack align="start" spacing={0}>
            <Heading size="md">Inbox</Heading>
            <Text fontSize="sm" color="gray.400">{roleLabel[role] ?? 'Your requests'}</Text>
          </VStack>
          <Badge colorScheme={movements.length > 0 ? 'red' : 'gray'} fontSize="md" px={3} py={1} borderRadius="full">
            {movements.length} pending
          </Badge>
        </HStack>

        {movements.length === 0 && !isLoading && (
          <Alert status="success" borderRadius="lg">
            <AlertIcon />
            <Text>All clear — nothing pending right now.</Text>
          </Alert>
        )}

        {movements.map((m) => {
          const eventId = (m as any).eventId ?? (m.event as any)?.id
          const actions = getActions(m, eventId)
          return (
            <Box key={m.id} bg="gray.800" borderRadius="xl" border="1px" borderColor="gray.700" overflow="hidden">
              {/* Header */}
              <HStack px={4} py={3} justify="space-between" wrap="wrap" gap={2} borderBottom="1px" borderColor="gray.700">
                <HStack spacing={2} wrap="wrap">
                  <Badge colorScheme={statusColors[m.status] ?? 'gray'} textTransform="uppercase" fontSize="xs">
                    {m.status.replace('_', ' ')}
                  </Badge>
                  <Badge variant="outline" colorScheme="gray" fontSize="xs">{m.type.replace('_', ' ')}</Badge>
                  {m.fromBar && <Text fontSize="xs" color="gray.400">From: <strong>{m.fromBar.name}</strong></Text>}
                  {m.toBar && <Text fontSize="xs" color="gray.400">To: <strong>{m.toBar.name}</strong></Text>}
                </HStack>
                <HStack spacing={2}>
                  <Text fontSize="xs" color="gray.500">by {m.createdBy.name} · {new Date(m.createdAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</Text>
                  <Button as={NextLink} href={`/events/${eventId}/movements/${m.id}`} size="xs" variant="ghost" color="gray.400">
                    Details →
                  </Button>
                </HStack>
              </HStack>

              {/* Lines */}
              <Box px={4} py={2}>
                <HStack wrap="wrap" gap={2}>
                  {m.lines.map((line) => (
                    <Badge key={line.id} colorScheme="gray" variant="subtle" px={2} py={1}>
                      {line.quantityRequested} × {line.product.name}
                    </Badge>
                  ))}
                </HStack>
                {m.notes && <Text fontSize="xs" color="gray.500" mt={1}>Note: {m.notes}</Text>}
              </Box>

              {/* Actions */}
              {actions.length > 0 && (
                <HStack px={4} py={3} borderTop="1px" borderColor="gray.700" justify="flex-end" spacing={2}>
                  {actions.map((a) => (
                    <Button
                      key={a.status}
                      size="sm"
                      colorScheme={a.color}
                      isLoading={acting === m.id}
                      onClick={() => act(m.id, a.status, eventId)}
                      variant={a.status === 'REJECTED' || a.status === 'CANCELLED' ? 'outline' : 'solid'}
                    >
                      {a.label}
                    </Button>
                  ))}
                </HStack>
              )}
            </Box>
          )
        })}
      </VStack>
    </AppShell>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const redirect = await requireAuth(ctx)
  if (redirect) return redirect
  return { props: {} }
}
