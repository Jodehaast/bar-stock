import {
  Box, Button, Heading, HStack, Text, VStack, Select, Badge, Divider,
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { ChevronRightIcon } from '@chakra-ui/icons'
import { useRouter } from 'next/router'
import AppShell from '@/components/layout/AppShell'
import StatusBadge from '@/components/common/StatusBadge'
import EmptyState from '@/components/common/EmptyState'
import { requireAuth } from '@/lib/permissions'
import type { GetServerSideProps } from 'next'
import useSWR from 'swr'
import { useState } from 'react'

interface Movement {
  id: number; type: string; status: string; notes: string | null
  createdAt: string
  fromBar: { id: number; name: string } | null
  toBar: { id: number; name: string } | null
  createdBy: { name: string }
  lines: { id: number; quantityRequested: number; product: { name: string; unit: string } }[]
}

interface Event { id: number; name: string }

export default function MovementsPage() {
  const router = useRouter()
  const { eventId, barId } = router.query
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const params = new URLSearchParams()
  if (statusFilter) params.set('status', statusFilter)
  if (typeFilter) params.set('type', typeFilter)
  if (barId) params.set('barId', String(barId))

  const { data: movements = [], mutate } = useSWR<Movement[]>(
    eventId ? `/api/events/${eventId}/movements?${params}` : null,
    { refreshInterval: 15000 }
  )
  const { data: event } = useSWR<Event>(eventId ? `/api/events/${eventId}` : null)

  return (
    <AppShell title="Movements">
      <VStack align="stretch" spacing={6}>
        <Breadcrumb separator={<ChevronRightIcon color="gray.500" />} fontSize="sm" color="gray.400">
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href="/events">Events</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href={`/events/${eventId}`}>{event?.name}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem isCurrentPage><BreadcrumbLink>Movements</BreadcrumbLink></BreadcrumbItem>
        </Breadcrumb>

        <HStack justify="space-between" wrap="wrap" gap={3}>
          <Heading size="md">Stock Movements</Heading>
          <HStack>
            <Select size="sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              bg="gray.700" borderColor="gray.600" w="160px">
              <option value="">All Types</option>
              <option value="INITIAL_ALLOCATION">Initial</option>
              <option value="RESTOCK">Restock</option>
              <option value="TRANSFER">Transfer</option>
              <option value="CLOSE_OUT">Close Out</option>
            </Select>
            <Select size="sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              bg="gray.700" borderColor="gray.600" w="150px">
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
          </HStack>
        </HStack>

        {movements.length === 0 ? (
          <EmptyState message="No movements found." />
        ) : (
          <VStack spacing={3} align="stretch">
            {movements.map((m) => (
              <Box
                key={m.id}
                as={NextLink}
                href={`/events/${eventId}/movements/${m.id}`}
                bg="gray.800"
                borderRadius="xl"
                p={4}
                border="1px"
                borderColor="gray.700"
                _hover={{ borderColor: 'brand.500', textDecoration: 'none' }}
                display="block"
              >
                <HStack justify="space-between" wrap="wrap" gap={2}>
                  <HStack spacing={2}>
                    <StatusBadge value={m.type} type="movementType" />
                    <StatusBadge value={m.status} />
                  </HStack>
                  <Text fontSize="xs" color="gray.500">
                    {new Date(m.createdAt).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </HStack>
                <HStack mt={2} spacing={2} color="gray.400" fontSize="sm">
                  {m.fromBar && <Text>{m.fromBar.name}</Text>}
                  {m.fromBar && m.toBar && <ChevronRightIcon />}
                  {m.toBar && <Text>{m.toBar.name}</Text>}
                  {!m.fromBar && m.toBar && <Text color="gray.500">Central → {m.toBar.name}</Text>}
                  {m.fromBar && !m.toBar && <Text color="gray.500">{m.fromBar.name} → Central</Text>}
                </HStack>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {m.lines.length} item{m.lines.length !== 1 ? 's' : ''} · By {m.createdBy.name}
                </Text>
                {m.notes && <Text fontSize="xs" color="gray.500" mt={1} fontStyle="italic">{m.notes}</Text>}
              </Box>
            ))}
          </VStack>
        )}
      </VStack>
    </AppShell>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const redirect = await requireAuth(ctx)
  if (redirect) return redirect
  return { props: {} }
}
