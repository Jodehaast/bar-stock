import {
  Box, Button, Heading, HStack, Text, VStack, Badge, Divider, Table,
  Thead, Tbody, Tr, Th, Td, Textarea, FormControl, FormLabel,
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, NumberInput,
  NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
  useToast,
} from '@chakra-ui/react'
import { ChevronRightIcon } from '@chakra-ui/icons'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import AppShell from '@/components/layout/AppShell'
import StatusBadge from '@/components/common/StatusBadge'
import { requireAuth, canApprove, canMarkReady, canDispatchAndDeliver } from '@/lib/permissions'
import type { GetServerSideProps } from 'next'
import useSWR from 'swr'
import { useState } from 'react'
import { useSession } from 'next-auth/react'

interface Movement {
  id: number; type: string; status: string; notes: string | null
  createdAt: string; approvedAt: string | null; dispatchedAt: string | null; deliveredAt: string | null
  fromBar: { id: number; name: string } | null
  toBar: { id: number; name: string } | null
  createdBy: { name: string }
  approvedBy: { name: string } | null
  lines: {
    id: number; quantityRequested: number; quantityActual: number | null
    product: { id: number; name: string; unit: string; category: string | null }
  }[]
}

export default function MovementDetailPage() {
  const router = useRouter()
  const { eventId, movementId } = router.query
  const { data: movement, mutate } = useSWR<Movement>(
    movementId ? `/api/events/${eventId}/movements/${movementId}` : null
  )
  const { data: session } = useSession()
  const userCanApprove = canApprove(session)
  const userCanMarkReady = canMarkReady(session)
  const userCanDispatchAndDeliver = canDispatchAndDeliver(session)
  const role = (session?.user as any)?.role
  const toast = useToast()

  const [actuals, setActuals] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState<string | null>(null)

  const transition = async (status: string) => {
    setLoading(status)
    const lineUpdates = Object.entries(actuals).map(([id, quantityActual]) => ({
      id: Number(id), quantityActual,
    }))
    const res = await fetch(`/api/events/${eventId}/movements/${movementId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, lines: lineUpdates.length > 0 ? lineUpdates : undefined }),
    })
    setLoading(null)
    if (res.ok) {
      mutate()
      toast({ title: `Movement ${status.toLowerCase().replace('_', ' ')}`, status: 'success', duration: 2000 })
      if (status === 'DELIVERED') router.push(`/events/${eventId}/movements`)
    } else {
      const err = await res.json()
      toast({ title: err.error ?? 'Error', status: 'error', duration: 3000 })
    }
  }

  if (!movement) return <AppShell><Box p={8} color="gray.400">Loading...</Box></AppShell>

  const canCancel = ['ADMIN', 'SECTION_MANAGER', 'STOCK_ROOM_STAFF', 'RUNNER', 'BAR_STAFF'].includes(role)
  const showActions = userCanApprove || userCanMarkReady || userCanDispatchAndDeliver || canCancel

  return (
    <AppShell title="Movement Detail">
      <VStack align="stretch" spacing={6} maxW="640px">
        <Breadcrumb separator={<ChevronRightIcon color="gray.500" />} fontSize="sm" color="gray.400">
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href="/events">Events</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href={`/events/${eventId}`}>Event</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href={`/events/${eventId}/movements`}>Movements</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem isCurrentPage><BreadcrumbLink>#{movement.id}</BreadcrumbLink></BreadcrumbItem>
        </Breadcrumb>

        {/* Header */}
        <Box bg="gray.800" borderRadius="xl" p={5} border="1px" borderColor="gray.700">
          <HStack mb={3} spacing={2}>
            <StatusBadge value={movement.type} type="movementType" size="md" />
            <StatusBadge value={movement.status} size="md" />
          </HStack>
          <HStack color="gray.300" fontSize="sm" spacing={2}>
            {movement.fromBar && <Text>{movement.fromBar.name}</Text>}
            {movement.fromBar && movement.toBar && <ChevronRightIcon />}
            {movement.toBar && <Text>{movement.toBar.name}</Text>}
            {!movement.fromBar && movement.toBar && <Text>Central Store → {movement.toBar.name}</Text>}
            {movement.fromBar && !movement.toBar && <Text>{movement.fromBar.name} → Central Store</Text>}
          </HStack>
          {movement.notes && <Text fontSize="sm" color="gray.400" mt={2} fontStyle="italic">{movement.notes}</Text>}

          <VStack align="start" spacing={1} mt={3} fontSize="xs" color="gray.500">
            <Text>Created by {movement.createdBy.name} · {new Date(movement.createdAt).toLocaleString('en-ZA')}</Text>
            {movement.approvedBy && <Text>Approved by {movement.approvedBy.name} · {movement.approvedAt && new Date(movement.approvedAt).toLocaleString('en-ZA')}</Text>}
            {movement.dispatchedAt && <Text>Dispatched · {new Date(movement.dispatchedAt).toLocaleString('en-ZA')}</Text>}
            {movement.deliveredAt && <Text>Delivered · {new Date(movement.deliveredAt).toLocaleString('en-ZA')}</Text>}
          </VStack>
        </Box>

        {/* Lines */}
        <Box bg="gray.800" borderRadius="xl" border="1px" borderColor="gray.700" overflow="hidden">
          <Table size="sm">
            <Thead>
              <Tr>
                <Th color="gray.400">Product</Th>
                <Th color="gray.400" isNumeric>Requested</Th>
                <Th color="gray.400" isNumeric>Actual</Th>
              </Tr>
            </Thead>
            <Tbody>
              {movement.lines.map((line) => (
                <Tr key={line.id}>
                  <Td>
                    <Text fontWeight="medium">{line.product.name}</Text>
                    <Text fontSize="xs" color="gray.500">{line.product.unit}</Text>
                  </Td>
                  <Td isNumeric color="gray.300">{line.quantityRequested}</Td>
                  <Td isNumeric>
                    {movement.status === 'IN_TRANSIT' && userCanDispatchAndDeliver ? (
                      <NumberInput
                        size="xs" min={0} w="70px"
                        defaultValue={line.quantityActual ?? line.quantityRequested}
                        onChange={(_, val) => setActuals((p) => ({ ...p, [line.id]: isNaN(val) ? 0 : val }))}
                      >
                        <NumberInputField bg="gray.700" borderColor="gray.600" px={2} />
                        <NumberInputStepper>
                          <NumberIncrementStepper borderColor="gray.600" />
                          <NumberDecrementStepper borderColor="gray.600" />
                        </NumberInputStepper>
                      </NumberInput>
                    ) : (
                      <Text color={line.quantityActual != null ? 'gray.100' : 'gray.500'}>
                        {line.quantityActual ?? '—'}
                      </Text>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>

        {/* Actions */}
        {showActions && (
          <HStack wrap="wrap" gap={2}>
            {/* PENDING: Approve + Reject (SECTION_MANAGER / ADMIN) */}
            {movement.status === 'PENDING' && userCanApprove && (
              <>
                <Button colorScheme="green" size="sm" isLoading={loading === 'APPROVED'} onClick={() => transition('APPROVED')}>
                  Approve
                </Button>
                <Button colorScheme="red" variant="outline" size="sm" isLoading={loading === 'REJECTED'} onClick={() => transition('REJECTED')}>
                  Reject
                </Button>
              </>
            )}
            {/* APPROVED: Mark Ready (STOCK_ROOM_STAFF / ADMIN) */}
            {movement.status === 'APPROVED' && userCanMarkReady && (
              <Button colorScheme="blue" size="sm" isLoading={loading === 'READY'} onClick={() => transition('READY')}>
                Mark Ready
              </Button>
            )}
            {/* READY: Mark Collected (RUNNER / ADMIN) */}
            {movement.status === 'READY' && userCanDispatchAndDeliver && (
              <Button colorScheme="orange" size="sm" isLoading={loading === 'IN_TRANSIT'} onClick={() => transition('IN_TRANSIT')}>
                Mark Collected
              </Button>
            )}
            {/* IN_TRANSIT: Mark Delivered (RUNNER / ADMIN) */}
            {movement.status === 'IN_TRANSIT' && userCanDispatchAndDeliver && (
              <Button colorScheme="green" size="sm" isLoading={loading === 'DELIVERED'} onClick={() => transition('DELIVERED')}>
                Mark Delivered
              </Button>
            )}
            {/* Cancel (non-terminal states) */}
            {['PENDING', 'APPROVED', 'READY', 'IN_TRANSIT'].includes(movement.status) && canCancel && (
              <Button colorScheme="red" variant="ghost" size="sm" isLoading={loading === 'CANCELLED'} onClick={() => transition('CANCELLED')}>
                Cancel
              </Button>
            )}
          </HStack>
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
