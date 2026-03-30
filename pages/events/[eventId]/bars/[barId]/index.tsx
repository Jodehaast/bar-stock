import {
  Box, Button, Heading, HStack, Text, VStack, Divider,
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, Badge,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { ChevronRightIcon } from '@chakra-ui/icons'
import { useRouter } from 'next/router'
import AppShell from '@/components/layout/AppShell'
import StatusBadge from '@/components/common/StatusBadge'
import BarInventoryTable from '@/components/bars/BarInventoryTable'
import { requireAuth, canRequestRestock, isAdmin, canApproveMovements } from '@/lib/permissions'
import type { GetServerSideProps } from 'next'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'

interface Bar {
  id: number; name: string; location: string | null; status: string; stockType: string
  responsibleCompany: string | null
  manager: { id: number; name: string } | null
  event: { id: number; name: string; status: string }
}

interface InventoryRow {
  id: number; openingQuantity: number; currentQuantity: number
  openingTots: number; currentTots: number
  product: { name: string; unit: string; category: string | null; totsPerBottle: number | null }
}

export default function BarDashboard() {
  const router = useRouter()
  const { eventId, barId } = router.query
  const { data: bar } = useSWR<Bar>(barId ? `/api/events/${eventId}/bars/${barId}` : null)
  const { data: inventory = [] } = useSWR<InventoryRow[]>(
    barId ? `/api/events/${eventId}/bars/${barId}/inventory` : null,
    { refreshInterval: 30000 }
  )
  const { data: session } = useSession()
  const canRestock = canRequestRestock(session)
  const canApprove = canApproveMovements(session)
  const admin = isAdmin(session)
  const isEventActive = bar?.event.status === 'ACTIVE'

  if (!bar) return <AppShell><Box p={8} color="gray.400">Loading...</Box></AppShell>

  return (
    <AppShell title={bar.name}>
      <VStack align="stretch" spacing={6}>
        <Breadcrumb separator={<ChevronRightIcon color="gray.500" />} fontSize="sm" color="gray.400">
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href="/events">Events</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href={`/events/${eventId}`}>{bar.event.name}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem isCurrentPage><BreadcrumbLink>{bar.name}</BreadcrumbLink></BreadcrumbItem>
        </Breadcrumb>

        {/* Bar header */}
        <Box bg="gray.800" borderRadius="xl" p={5} border="1px" borderColor="gray.700">
          <HStack justify="space-between" wrap="wrap" gap={3}>
            <VStack align="start" spacing={1}>
              <HStack>
                <StatusBadge value={bar.status} type="bar" />
                <StatusBadge value={bar.stockType} type="stockType" />
                {bar.location && <Text fontSize="sm" color="gray.400">{bar.location}</Text>}
              </HStack>
              <Heading size="lg">{bar.name}</Heading>
              {bar.responsibleCompany && (
                <Text color="gray.400" fontSize="sm">{bar.responsibleCompany}</Text>
              )}
              {bar.manager && (
                <Text color="gray.500" fontSize="xs">Manager: {bar.manager.name}</Text>
              )}
            </VStack>
            <VStack align="end" spacing={2}>
              {canRestock && isEventActive && (
                <Button as={NextLink} href={`/events/${eventId}/bars/${barId}/restock`} size="sm" colorScheme="cyan">
                  Request Restock
                </Button>
              )}
              {(admin || canApprove) && isEventActive && (
                <Button as={NextLink} href={`/events/${eventId}/bars/${barId}/closeout`} size="sm" variant="outline" colorScheme="orange">
                  Close Out Bar
                </Button>
              )}
            </VStack>
          </HStack>
        </Box>

        {/* Inventory */}
        <Box>
          <HStack justify="space-between" mb={3}>
            <Heading size="sm" color="gray.300">Current Inventory</Heading>
            {canApprove && (
              <Button
                as={NextLink}
                href={`/events/${eventId}/movements?barId=${barId}`}
                size="xs"
                variant="ghost"
                color="gray.400"
              >
                View movements →
              </Button>
            )}
          </HStack>
          <BarInventoryTable inventory={inventory} />
        </Box>
      </VStack>
    </AppShell>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const redirect = await requireAuth(ctx)
  if (redirect) return redirect
  return { props: {} }
}
