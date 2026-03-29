import {
  Box, Button, Heading, HStack, Text, VStack, Table, Thead, Tbody, Tr, Th, Td,
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, Divider,
} from '@chakra-ui/react'
import { ChevronRightIcon } from '@chakra-ui/icons'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import AppShell from '@/components/layout/AppShell'
import StatusBadge from '@/components/common/StatusBadge'
import EmptyState from '@/components/common/EmptyState'
import { requireAuth } from '@/lib/permissions'
import type { GetServerSideProps } from 'next'
import useSWR from 'swr'

interface ProductRow {
  productId: number; productName: string; unit: string; category: string | null
  opening: number; received: number; transferredIn: number; transferredOut: number
  closeOut: number; current: number
}

interface BarResult {
  bar: { id: number; name: string; location: string | null; status: string }
  products: ProductRow[]
}

interface Event { id: number; name: string; venue: string; date: string }

export default function ReconciliationPage() {
  const router = useRouter()
  const { eventId } = router.query
  const { data: event } = useSWR<Event>(eventId ? `/api/events/${eventId}` : null)
  const { data: results = [] } = useSWR<BarResult[]>(
    eventId ? `/api/events/${eventId}/reconciliation` : null
  )

  const printPage = () => window.print()

  return (
    <AppShell title="Reconciliation">
      <VStack align="stretch" spacing={6}>
        <Breadcrumb separator={<ChevronRightIcon color="gray.500" />} fontSize="sm" color="gray.400">
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href="/events">Events</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href={`/events/${eventId}`}>{event?.name}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem isCurrentPage><BreadcrumbLink>Reconciliation</BreadcrumbLink></BreadcrumbItem>
        </Breadcrumb>

        <HStack justify="space-between">
          <VStack align="start" spacing={0}>
            <Heading size="md">Reconciliation Report</Heading>
            {event && (
              <Text fontSize="sm" color="gray.400">
                {event.name} · {new Date(event.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            )}
          </VStack>
          <Button size="sm" variant="outline" onClick={printPage}>Print / Export</Button>
        </HStack>

        {results.length === 0 ? (
          <EmptyState message="No stock data yet." />
        ) : (
          results.map(({ bar, products }) => (
            <Box key={bar.id}>
              <HStack mb={3}>
                <Heading size="sm">{bar.name}</Heading>
                <StatusBadge value={bar.status} type="bar" />
                {bar.location && <Text fontSize="xs" color="gray.500">{bar.location}</Text>}
              </HStack>
              {products.length === 0 ? (
                <Text fontSize="sm" color="gray.500" mb={4}>No stock movements.</Text>
              ) : (
                <Box bg="gray.800" borderRadius="lg" overflow="hidden" mb={6} border="1px" borderColor="gray.700">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th color="gray.400">Product</Th>
                        <Th color="gray.400" isNumeric>Opening</Th>
                        <Th color="gray.400" isNumeric>Received</Th>
                        <Th color="gray.400" isNumeric>Transferred In</Th>
                        <Th color="gray.400" isNumeric>Transferred Out</Th>
                        <Th color="gray.400" isNumeric>Close Out</Th>
                        <Th color="gray.400" isNumeric>Current</Th>
                        <Th color="gray.400" isNumeric>Variance</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {products.map((row) => {
                        const expected = row.opening + row.received + row.transferredIn - row.transferredOut - row.closeOut
                        const variance = row.current - expected
                        return (
                          <Tr key={row.productId}>
                            <Td>
                              <Text fontWeight="medium">{row.productName}</Text>
                              <Text fontSize="xs" color="gray.500">{row.unit}</Text>
                            </Td>
                            <Td isNumeric>{row.opening}</Td>
                            <Td isNumeric>{row.received || '—'}</Td>
                            <Td isNumeric>{row.transferredIn || '—'}</Td>
                            <Td isNumeric>{row.transferredOut || '—'}</Td>
                            <Td isNumeric>{row.closeOut || '—'}</Td>
                            <Td isNumeric fontWeight="semibold">{row.current}</Td>
                            <Td isNumeric>
                              <Text color={variance === 0 ? 'gray.400' : variance > 0 ? 'green.400' : 'red.400'}>
                                {variance > 0 ? '+' : ''}{variance}
                              </Text>
                            </Td>
                          </Tr>
                        )
                      })}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </Box>
          ))
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
