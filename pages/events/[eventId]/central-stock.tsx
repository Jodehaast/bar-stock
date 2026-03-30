import {
  Box, Button, Heading, HStack, Text, VStack, Table, Thead, Tbody, Tr, Th, Td,
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, Progress,
} from '@chakra-ui/react'
import { ChevronRightIcon } from '@chakra-ui/icons'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import AppShell from '@/components/layout/AppShell'
import { requireAuth } from '@/lib/permissions'
import type { GetServerSideProps } from 'next'
import useSWR from 'swr'

interface Event { id: number; name: string }
interface StockRow {
  id: number; productId: number; productName: string; unit: string
  category: string | null; quantity: number; allocated: number; remaining: number
}

export default function CentralStockPage() {
  const router = useRouter()
  const { eventId } = router.query
  const { data: event } = useSWR<Event>(eventId ? `/api/events/${eventId}` : null)
  const { data: stock = [] } = useSWR<StockRow[]>(
    eventId ? `/api/events/${eventId}/central-stock` : null,
    { refreshInterval: 30000 }
  )

  const byCategory: Record<string, StockRow[]> = {}
  for (const row of stock) {
    const cat = row.category ?? 'other'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(row)
  }

  return (
    <AppShell title="Central Store">
      <VStack align="stretch" spacing={6}>
        <Breadcrumb separator={<ChevronRightIcon color="gray.500" />} fontSize="sm" color="gray.400">
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href="/events">Events</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href={`/events/${eventId}`}>{event?.name}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem isCurrentPage><BreadcrumbLink>Central Store</BreadcrumbLink></BreadcrumbItem>
        </Breadcrumb>

        <HStack justify="space-between">
          <Heading size="md">Central Store</Heading>
          <Button as={NextLink} href={`/events/${eventId}/stock-upload`} size="sm" variant="outline">
            Update Stock
          </Button>
        </HStack>

        {stock.length === 0 ? (
          <Box textAlign="center" py={12}>
            <Text color="gray.500" mb={4}>No stock uploaded yet.</Text>
            <Button as={NextLink} href={`/events/${eventId}/stock-upload`} colorScheme="brand">
              Upload Opening Stock
            </Button>
          </Box>
        ) : (
          Object.entries(byCategory).map(([cat, rows]) => (
            <Box key={cat}>
              <Text fontSize="xs" color="gray.500" textTransform="uppercase" fontWeight="semibold" mb={2}>{cat}</Text>
              <Box bg="gray.800" borderRadius="lg" overflow="hidden" border="1px" borderColor="gray.700">
                <Table size="sm">
                  <Thead><Tr>
                    <Th color="gray.400">Product</Th>
                    <Th color="gray.400" isNumeric>Total</Th>
                    <Th color="gray.400" isNumeric>Allocated</Th>
                    <Th color="gray.400" isNumeric>Remaining</Th>
                    <Th color="gray.400" w="120px">Distributed</Th>
                  </Tr></Thead>
                  <Tbody>
                    {rows.map((row) => {
                      const pct = row.quantity > 0 ? Math.round((row.allocated / row.quantity) * 100) : 0
                      const isLow = row.remaining <= 0
                      return (
                        <Tr key={row.productId}>
                          <Td>
                            <Text fontWeight="medium">{row.productName}</Text>
                            <Text fontSize="xs" color="gray.500">{row.unit}</Text>
                          </Td>
                          <Td isNumeric>{row.quantity}</Td>
                          <Td isNumeric>{row.allocated}</Td>
                          <Td isNumeric>
                            <Text color={isLow ? 'red.400' : row.remaining < row.quantity * 0.2 ? 'orange.400' : 'green.400'} fontWeight="semibold">
                              {row.remaining}
                            </Text>
                          </Td>
                          <Td>
                            <Progress
                              value={pct}
                              size="sm"
                              colorScheme={pct >= 100 ? 'red' : pct > 80 ? 'orange' : 'green'}
                              borderRadius="full"
                            />
                            <Text fontSize="xs" color="gray.500" mt={1}>{pct}%</Text>
                          </Td>
                        </Tr>
                      )
                    })}
                  </Tbody>
                </Table>
              </Box>
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
