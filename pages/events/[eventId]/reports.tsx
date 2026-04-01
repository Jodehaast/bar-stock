import {
  Box, Heading, HStack, Text, VStack, Tabs, TabList, Tab, TabPanels, TabPanel,
  Table, Thead, Tbody, Tr, Th, Td, Progress, Badge, Breadcrumb,
  BreadcrumbItem, BreadcrumbLink, Button,
} from '@chakra-ui/react'
import { ChevronRightIcon } from '@chakra-ui/icons'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import AppShell from '@/components/layout/AppShell'
import { requireAuth } from '@/lib/permissions'
import type { GetServerSideProps } from 'next'
import useSWR from 'swr'

interface ConsumptionRow {
  productId: number; name: string; unit: string; category: string | null
  totalOpening: number; totalCurrent: number; consumed: number
}

interface BarUsageRow {
  barId: number; barName: string; barType: string; stockType: string
  totalOpening: number; totalCurrent: number; consumed: number; consumptionPct: number; skus: number
  breakdown: { productName: string; unit: string; opening: number; current: number; consumed: number }[]
}

export default function ReportsPage() {
  const router = useRouter()
  const { eventId } = router.query

  const { data: consumption = [], isLoading: loadingC } = useSWR<ConsumptionRow[]>(
    eventId ? `/api/events/${eventId}/reports/consumption` : null
  )
  const { data: barUsage = [], isLoading: loadingB } = useSWR<BarUsageRow[]>(
    eventId ? `/api/events/${eventId}/reports/bar-usage` : null
  )

  const downloadCsv = (rows: ConsumptionRow[]) => {
    const header = 'Product,Category,Unit,Opening,Current,Consumed'
    const lines = rows.map(r => `"${r.name}","${r.category ?? ''}","${r.unit}",${r.totalOpening},${r.totalCurrent},${r.consumed}`)
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `consumption-report-event-${eventId}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppShell title="Reports">
      <VStack align="stretch" spacing={6}>
        <Breadcrumb separator={<ChevronRightIcon color="gray.500" />} fontSize="sm" color="gray.400">
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href="/events">Events</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href={`/events/${eventId}`}>Event</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem isCurrentPage><BreadcrumbLink>Reports</BreadcrumbLink></BreadcrumbItem>
        </Breadcrumb>
        <Heading size="md">Reports</Heading>

        <Tabs variant="enclosed" colorScheme="brand">
          <TabList>
            <Tab>Product Consumption</Tab>
            <Tab>Bar Usage</Tab>
          </TabList>

          <TabPanels>
            {/* ── PRODUCT CONSUMPTION ── */}
            <TabPanel px={0}>
              <HStack justify="space-between" mb={4}>
                <Text color="gray.400" fontSize="sm">
                  Total units consumed across all bars, sorted by most consumed.
                </Text>
                <Button size="sm" variant="outline" onClick={() => downloadCsv(consumption)}>
                  ⬇ CSV
                </Button>
              </HStack>
              {loadingC ? (
                <Text color="gray.400">Loading...</Text>
              ) : consumption.length === 0 ? (
                <Text color="gray.500">No inventory data yet.</Text>
              ) : (
                <Box overflowX="auto">
                  <Table size="sm" variant="simple">
                    <Thead>
                      <Tr>
                        <Th color="gray.400">Product</Th>
                        <Th color="gray.400">Category</Th>
                        <Th color="gray.400" isNumeric>Opening</Th>
                        <Th color="gray.400" isNumeric>Remaining</Th>
                        <Th color="gray.400" isNumeric>Consumed</Th>
                        <Th color="gray.400">Usage</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {consumption.map((row) => {
                        const pct = row.totalOpening > 0 ? Math.round((row.consumed / row.totalOpening) * 100) : 0
                        return (
                          <Tr key={row.productId}>
                            <Td fontWeight="semibold">{row.name}</Td>
                            <Td><Badge fontSize="xs" colorScheme="gray">{row.category ?? '—'}</Badge></Td>
                            <Td isNumeric color="gray.300">{row.totalOpening} {row.unit}s</Td>
                            <Td isNumeric color={pct >= 80 ? 'red.300' : 'gray.300'}>{row.totalCurrent} {row.unit}s</Td>
                            <Td isNumeric fontWeight="bold">{row.consumed} {row.unit}s</Td>
                            <Td w="140px">
                              <HStack spacing={2}>
                                <Progress value={pct} size="sm" colorScheme={pct >= 80 ? 'red' : pct >= 50 ? 'orange' : 'green'} flex={1} borderRadius="full" />
                                <Text fontSize="xs" w="32px">{pct}%</Text>
                              </HStack>
                            </Td>
                          </Tr>
                        )
                      })}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </TabPanel>

            {/* ── BAR USAGE ── */}
            <TabPanel px={0}>
              <Text color="gray.400" fontSize="sm" mb={4}>
                Total consumption per bar. Click a bar to see product-level breakdown.
              </Text>
              {loadingB ? (
                <Text color="gray.400">Loading...</Text>
              ) : barUsage.length === 0 ? (
                <Text color="gray.500">No inventory data yet.</Text>
              ) : (
                <VStack align="stretch" spacing={4}>
                  {barUsage.map((bar) => (
                    <Box key={bar.barId} bg="gray.800" borderRadius="xl" overflow="hidden" border="1px" borderColor="gray.700">
                      <HStack px={4} py={3} justify="space-between" bg="gray.750" wrap="wrap" gap={2}>
                        <VStack align="start" spacing={0}>
                          <HStack>
                            <Text fontWeight="bold">{bar.barName}</Text>
                            <Badge fontSize="xs" colorScheme="gray">{bar.barType}</Badge>
                            <Badge fontSize="xs" colorScheme={bar.stockType === 'COMP' ? 'purple' : 'green'}>{bar.stockType}</Badge>
                          </HStack>
                          <Text fontSize="xs" color="gray.400">{bar.skus} products</Text>
                        </VStack>
                        <VStack align="end" spacing={0}>
                          <Text fontWeight="bold" fontSize="lg">{bar.consumed} consumed</Text>
                          <HStack spacing={2}>
                            <Progress value={bar.consumptionPct} size="xs" colorScheme={bar.consumptionPct >= 80 ? 'red' : 'orange'} w="80px" borderRadius="full" />
                            <Text fontSize="xs" color="gray.400">{bar.consumptionPct}% of {bar.totalOpening}</Text>
                          </HStack>
                        </VStack>
                      </HStack>
                      {bar.breakdown.length > 0 && (
                        <Box px={4} py={3}>
                          <Table size="xs" variant="unstyled">
                            <Tbody>
                              {bar.breakdown.filter(b => b.consumed > 0).map((b, i) => (
                                <Tr key={i}>
                                  <Td py={1} color="gray.300" fontSize="sm">{b.productName}</Td>
                                  <Td py={1} isNumeric fontSize="sm">{b.opening} → {b.current}</Td>
                                  <Td py={1} isNumeric fontWeight="bold" fontSize="sm" color="orange.300">−{b.consumed} {b.unit}s</Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        </Box>
                      )}
                    </Box>
                  ))}
                </VStack>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </AppShell>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const redirect = await requireAuth(ctx)
  if (redirect) return redirect
  return { props: {} }
}
