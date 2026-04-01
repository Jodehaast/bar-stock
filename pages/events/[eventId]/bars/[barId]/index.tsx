import {
  Box, Button, Heading, HStack, Text, VStack, Divider,
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, Badge,
  Table, Thead, Tbody, Tr, Th, Td, Progress,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { ChevronRightIcon, ExternalLinkIcon } from '@chakra-ui/icons'
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
  responsibleCompany: string | null; accessToken: string
  manager: { id: number; name: string } | null
  event: { id: number; name: string; status: string }
}

interface InventoryRow {
  id: number; openingQuantity: number; currentQuantity: number
  openingTots: number; currentTots: number
  product: { name: string; unit: string; category: string | null; totsPerBottle: number | null }
}

interface ConsumptionProduct {
  productId: number; productName: string; unit: string; category: string | null
  opening: number; restocksReceived: number; transfersIn: number; transfersOut: number; closeOuts: number
  totalIn: number; systemOnHand: number; closingCount: number | null; consumed: number | null
}

interface ConsumptionData {
  barId: number; barName: string; hasClosingCount: boolean; closingCountedBy: string | null
  products: ConsumptionProduct[]
}

export default function BarDashboard() {
  const router = useRouter()
  const { eventId, barId } = router.query
  const { data: bar } = useSWR<Bar>(barId ? `/api/events/${eventId}/bars/${barId}` : null)
  const { data: inventory = [] } = useSWR<InventoryRow[]>(
    barId ? `/api/events/${eventId}/bars/${barId}/inventory` : null,
    { refreshInterval: 30000 }
  )
  const { data: consumption } = useSWR<ConsumptionData>(
    barId ? `/api/events/${eventId}/bars/${barId}/consumption` : null,
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
              {bar.accessToken && (
                <Button
                  as="a"
                  href={`/b/${bar.accessToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="sm"
                  variant="outline"
                  colorScheme="yellow"
                  rightIcon={<ExternalLinkIcon />}
                >
                  Bar QR Page
                </Button>
              )}
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

        {/* Consumption panel */}
        {consumption && consumption.products.length > 0 && (
          <Box>
            <HStack justify="space-between" mb={3}>
              <HStack>
                <Heading size="sm" color="gray.300">Consumption Tracker</Heading>
                {consumption.hasClosingCount ? (
                  <Badge colorScheme="orange" fontSize="xs">
                    Closing count submitted{consumption.closingCountedBy ? ` by ${consumption.closingCountedBy}` : ''}
                  </Badge>
                ) : (
                  <Badge colorScheme="gray" fontSize="xs">Awaiting closing count</Badge>
                )}
              </HStack>
              <Button
                as="a"
                href={`/b/${bar.accessToken}#closing`}
                target="_blank"
                rel="noopener noreferrer"
                size="xs"
                variant="ghost"
                color="gray.400"
                rightIcon={<ExternalLinkIcon />}
              >
                Open bar page to submit count
              </Button>
            </HStack>
            <Box bg="gray.800" borderRadius="xl" overflow="hidden" border="1px" borderColor="gray.700">
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th color="gray.400">Product</Th>
                    <Th color="gray.400" isNumeric>Opening</Th>
                    <Th color="gray.400" isNumeric>Restocked</Th>
                    <Th color="gray.400" isNumeric>Total In</Th>
                    <Th color="gray.400" isNumeric>On Hand</Th>
                    <Th color="gray.400" isNumeric>Closing Count</Th>
                    <Th color="gray.400" isNumeric>Used</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {consumption.products.map(row => {
                    const usagePct = row.totalIn > 0 && row.consumed !== null
                      ? Math.min(100, Math.round((row.consumed / row.totalIn) * 100))
                      : null
                    return (
                      <Tr key={row.productId}>
                        <Td>
                          <Text fontWeight="medium" fontSize="sm">{row.productName}</Text>
                          {row.category && <Text fontSize="xs" color="gray.500">{row.category}</Text>}
                        </Td>
                        <Td isNumeric color="gray.400">{row.opening}</Td>
                        <Td isNumeric color={row.restocksReceived > 0 ? 'cyan.300' : 'gray.600'}>
                          {row.restocksReceived > 0 ? `+${row.restocksReceived}` : '—'}
                        </Td>
                        <Td isNumeric fontWeight="semibold">{row.totalIn}</Td>
                        <Td isNumeric>{row.systemOnHand}</Td>
                        <Td isNumeric>
                          {row.closingCount !== null
                            ? <Text fontWeight="semibold">{row.closingCount}</Text>
                            : <Text color="gray.600">—</Text>}
                        </Td>
                        <Td isNumeric>
                          {row.consumed !== null ? (
                            <VStack align="end" spacing={1}>
                              <Text
                                fontWeight="bold"
                                color={row.consumed < 0 ? 'blue.300' : row.consumed === 0 ? 'gray.400' : 'orange.300'}
                              >
                                {row.consumed < 0 ? `+${Math.abs(row.consumed)} surplus` : `${row.consumed} ${row.unit}s`}
                              </Text>
                              {usagePct !== null && usagePct > 0 && (
                                <Progress value={usagePct} size="xs" colorScheme="orange" w="60px" borderRadius="full" />
                              )}
                            </VStack>
                          ) : (
                            <Text color="gray.600" fontSize="xs">pending count</Text>
                          )}
                        </Td>
                      </Tr>
                    )
                  })}
                </Tbody>
              </Table>
            </Box>
          </Box>
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
