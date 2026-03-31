import {
  Box, Button, Grid, Heading, HStack, Text, VStack, Badge,
  Select, useToast, Divider, Breadcrumb, BreadcrumbItem, BreadcrumbLink,
} from '@chakra-ui/react'
import { AddIcon, ChevronRightIcon } from '@chakra-ui/icons'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import AppShell from '@/components/layout/AppShell'
import StatusBadge from '@/components/common/StatusBadge'
import EmptyState from '@/components/common/EmptyState'
import { requireAuth, isAdmin, canApproveMovements } from '@/lib/permissions'
import type { GetServerSideProps } from 'next'
import useSWR, { mutate } from 'swr'
import { useSession } from 'next-auth/react'

interface Bar {
  id: number; name: string; location: string | null; status: string; stockType: string; barType: string
  responsibleCompany: string | null
  manager: { name: string } | null
  _count: { inventory: number }
}

interface Event {
  id: number; name: string; date: string; venue: string; status: string
  bars: Bar[]
}

export default function EventDashboard() {
  const router = useRouter()
  const eventId = router.query.eventId
  const { data: event } = useSWR<Event>(eventId ? `/api/events/${eventId}` : null)
  const { data: session } = useSession()
  const toast = useToast()
  const admin = isAdmin(session)
  const canApprove = canApproveMovements(session)

  const updateStatus = async (status: string) => {
    if (!confirm(`Set event status to ${status}?`)) return
    await fetch(`/api/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    mutate(`/api/events/${eventId}`)
    mutate('/api/events')
    toast({ title: `Event status updated to ${status}`, status: 'success', duration: 2000 })
  }

  if (!event) return <AppShell><Box p={8} color="gray.400">Loading...</Box></AppShell>

  const statusOptions = ['SETUP', 'ACTIVE', 'CLOSED'].filter((s) => s !== event.status)
  const stockRooms = event.bars.filter(b => b.barType === 'STOCK_ROOM')
  const regularBars = event.bars.filter(b => b.barType !== 'STOCK_ROOM')

  return (
    <AppShell title={event.name}>
      <VStack align="stretch" spacing={6}>
        <Breadcrumb separator={<ChevronRightIcon color="gray.500" />} fontSize="sm" color="gray.400">
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href="/events">Events</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem isCurrentPage><BreadcrumbLink>{event.name}</BreadcrumbLink></BreadcrumbItem>
        </Breadcrumb>

        {/* Event header */}
        <Box bg="gray.800" borderRadius="xl" p={5} border="1px" borderColor="gray.700">
          <HStack justify="space-between" wrap="wrap" gap={3}>
            <VStack align="start" spacing={1}>
              <HStack>
                <StatusBadge value={event.status} type="event" size="md" />
                <Text fontSize="sm" color="gray.400">{event.venue}</Text>
                <Text fontSize="sm" color="gray.500">·</Text>
                <Text fontSize="sm" color="gray.400">
                  {new Date(event.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </HStack>
              <Heading size="lg">{event.name}</Heading>
            </VStack>
            {admin && statusOptions.length > 0 && (
              <HStack>
                {statusOptions.map((s) => (
                  <Button key={s} size="sm" variant="outline" onClick={() => updateStatus(s)}
                    colorScheme={s === 'CLOSED' ? 'red' : s === 'ACTIVE' ? 'green' : 'gray'}>
                    Set {s.charAt(0) + s.slice(1).toLowerCase()}
                  </Button>
                ))}
              </HStack>
            )}
          </HStack>
        </Box>

        {/* Quick actions */}
        <HStack wrap="wrap" gap={2}>
          {admin && (
            <Button as={NextLink} href={`/events/${eventId}/bars/new`} size="sm" leftIcon={<AddIcon />} variant="outline">
              Add Bar
            </Button>
          )}
          {admin && (
            <Button as={NextLink} href={`/events/${eventId}/qrcodes`} size="sm" variant="outline">
              🖨️ QR Codes
            </Button>
          )}
          {admin && (
            <Button as={NextLink} href={`/events/${eventId}/opening-summary`} size="sm" variant="outline">
              📊 Opening Stock Check
            </Button>
          )}
          {(admin || canApprove) && event.status !== 'SETUP' && (
            <Button as={NextLink} href={`/events/${eventId}/setup`} size="sm" variant="outline">
              Allocate Stock
            </Button>
          )}
          {canApprove && (
            <Button as={NextLink} href={`/events/${eventId}/movements`} size="sm" variant="outline">
              View Movements
            </Button>
          )}
          {canApprove && event.status === 'ACTIVE' && (
            <Button as={NextLink} href={`/events/${eventId}/transfer/new`} size="sm" variant="outline">
              Transfer Stock
            </Button>
          )}
          <Button as={NextLink} href={`/events/${eventId}/reconciliation`} size="sm" variant="outline">
            Reconciliation
          </Button>
          <Button as={NextLink} href={`/events/${eventId}/central-stock`} size="sm" variant="outline">
            Central Store
          </Button>
          {admin && (
            <Button as={NextLink} href={`/events/${eventId}/stock-upload`} size="sm" variant="outline">
              Upload Stock
            </Button>
          )}
          {admin && (
            <Button as={NextLink} href={`/events/${eventId}/bars/upload`} size="sm" variant="outline">
              Upload Bars
            </Button>
          )}
        </HStack>

        {/* Stock Rooms section */}
        {stockRooms.length > 0 && (
          <>
            <Heading size="xs" color="gray.300">Stock Rooms ({stockRooms.length})</Heading>
            <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={4}>
              {stockRooms.map((bar) => (
                <Box
                  key={bar.id}
                  as={NextLink}
                  href={`/events/${eventId}/bars/${bar.id}`}
                  bg="gray.800"
                  borderRadius="xl"
                  p={4}
                  border="1px"
                  borderColor="gray.700"
                  _hover={{ borderColor: 'brand.500', textDecoration: 'none' }}
                  transition="border-color 0.15s"
                  display="block"
                >
                  <VStack align="start" spacing={2}>
                    <HStack justify="space-between" w="full">
                      <HStack spacing={1}>
                        <StatusBadge value={bar.status} type="bar" />
                        <StatusBadge value={bar.stockType} type="stockType" />
                        <StatusBadge value={bar.barType} type="barType" />
                      </HStack>
                      {bar._count.inventory > 0 && (
                        <Text fontSize="xs" color="gray.500">{bar._count.inventory} SKUs</Text>
                      )}
                    </HStack>
                    <Text fontWeight="semibold">{bar.name}</Text>
                    {bar.location && <Text fontSize="sm" color="gray.400">{bar.location}</Text>}
                    {bar.responsibleCompany && (
                      <Text fontSize="xs" color="gray.500">{bar.responsibleCompany}</Text>
                    )}
                    {bar.manager && (
                      <Text fontSize="xs" color="gray.500">Manager: {bar.manager.name}</Text>
                    )}
                  </VStack>
                </Box>
              ))}
            </Grid>
          </>
        )}

        {/* Bars grid */}
        <Heading size="xs" color="gray.300">Bars ({regularBars.length})</Heading>
        {event.bars.length === 0 ? (
          <EmptyState message="No bars added yet." />
        ) : regularBars.length === 0 ? (
          <EmptyState message="No bars added yet." />
        ) : (
          <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={4}>
            {regularBars.map((bar) => (
              <Box
                key={bar.id}
                as={NextLink}
                href={`/events/${eventId}/bars/${bar.id}`}
                bg="gray.800"
                borderRadius="xl"
                p={4}
                border="1px"
                borderColor="gray.700"
                _hover={{ borderColor: 'brand.500', textDecoration: 'none' }}
                transition="border-color 0.15s"
                display="block"
              >
                <VStack align="start" spacing={2}>
                  <HStack justify="space-between" w="full">
                    <HStack spacing={1}>
                      <StatusBadge value={bar.status} type="bar" />
                      <StatusBadge value={bar.stockType} type="stockType" />
                      <StatusBadge value={bar.barType} type="barType" />
                    </HStack>
                    {bar._count.inventory > 0 && (
                      <Text fontSize="xs" color="gray.500">{bar._count.inventory} SKUs</Text>
                    )}
                  </HStack>
                  <Text fontWeight="semibold">{bar.name}</Text>
                  {bar.location && <Text fontSize="sm" color="gray.400">{bar.location}</Text>}
                  {bar.responsibleCompany && (
                    <Text fontSize="xs" color="gray.500">{bar.responsibleCompany}</Text>
                  )}
                  {bar.manager && (
                    <Text fontSize="xs" color="gray.500">Manager: {bar.manager.name}</Text>
                  )}
                </VStack>
              </Box>
            ))}
          </Grid>
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
