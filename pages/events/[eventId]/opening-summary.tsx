import {
  Box, Button, Heading, HStack, Text, VStack, Badge, Table, Thead,
  Tbody, Tr, Th, Td, Flex, Alert, AlertIcon, Input, InputGroup,
  InputLeftElement, Accordion, AccordionItem, AccordionButton,
  AccordionPanel, AccordionIcon,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import useSWR from 'swr'
import AppShell from '@/components/layout/AppShell'
import { requireAuth } from '@/lib/permissions'
import type { GetServerSideProps } from 'next'
import NextLink from 'next/link'
import { ChevronLeftIcon, SearchIcon, WarningIcon, CheckIcon } from '@chakra-ui/icons'
import { useState } from 'react'

interface SummaryLine {
  product: { id: number; name: string; unit: string; totsPerBottle: number | null }
  allocated: number; allocatedTots: number
  confirmed: number | null; confirmedTots: number | null
  variance: number | null; totsVariance: number | null
  ok: boolean
}
interface BarSummary {
  bar: { id: number; name: string; location: string | null; barType: string; accessToken: string }
  confirmedBy: string | null; confirmedAt: string | null
  lines: SummaryLine[]
  hasVariance: boolean; pendingConfirmation: boolean
  totalAllocated: number; totalConfirmed: number
}

export default function OpeningSummaryPage() {
  const router = useRouter()
  const eventId = router.query.eventId
  const { data: summary = [], isLoading } = useSWR<BarSummary[]>(
    eventId ? `/api/events/${eventId}/opening-summary` : null,
    { refreshInterval: 30000 }
  )
  const { data: event } = useSWR(eventId ? `/api/events/${eventId}` : null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'ISSUES' | 'PENDING' | 'OK'>('ALL')

  const filtered = summary.filter(s => {
    const matchSearch = s.bar.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.bar.location ?? '').toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'ALL' ||
      (filter === 'ISSUES' && s.hasVariance) ||
      (filter === 'PENDING' && s.pendingConfirmation) ||
      (filter === 'OK' && !s.hasVariance && !s.pendingConfirmation && s.lines.length > 0)
    return matchSearch && matchFilter
  })

  const issueCount = summary.filter(s => s.hasVariance).length
  const pendingCount = summary.filter(s => s.pendingConfirmation && s.lines.length > 0).length
  const okCount = summary.filter(s => !s.hasVariance && !s.pendingConfirmation && s.lines.length > 0).length

  return (
    <AppShell title="Opening Stock Summary">
      <VStack align="stretch" spacing={6}>
        <HStack justify="space-between" wrap="wrap" gap={3}>
          <VStack align="start" spacing={1}>
            <Button as={NextLink} href={`/events/${eventId}`} leftIcon={<ChevronLeftIcon />} variant="ghost" size="sm">
              Back
            </Button>
            <Heading size="md" color="app.textPrimary">Opening Stock Verification</Heading>
            {event && <Text fontSize="sm" color="app.textSecondary">{event.name}</Text>}
          </VStack>
          <HStack spacing={2}>
            <Button as={NextLink} href={`/events/${eventId}/qrcodes`} size="sm" variant="outline">
              🖨️ QR Codes
            </Button>
          </HStack>
        </HStack>

        {/* Summary tiles */}
        <HStack spacing={3} wrap="wrap">
          {[
            { label: 'Issues', count: issueCount, color: 'red', icon: '⚠️', filter: 'ISSUES' },
            { label: 'Awaiting confirmation', count: pendingCount, color: 'yellow', icon: '⏳', filter: 'PENDING' },
            { label: 'All clear', count: okCount, color: 'green', icon: '✅', filter: 'OK' },
          ].map(tile => (
            <Box
              key={tile.filter}
              flex={1}
              minW="140px"
              bg="app.surface"
              borderRadius="xl"
              border="1px solid"
              borderColor={filter === tile.filter ? `${tile.color}.500` : 'app.border'}
              p={4}
              cursor="pointer"
              onClick={() => setFilter(prev => prev === tile.filter ? 'ALL' : tile.filter as any)}
              transition="border-color 0.15s"
              _hover={{ borderColor: `${tile.color}.400` }}
            >
              <Text fontSize="xl">{tile.icon}</Text>
              <Text fontSize="2xl" fontWeight="800" color="app.textPrimary">{tile.count}</Text>
              <Text fontSize="xs" color="app.textSecondary">{tile.label}</Text>
            </Box>
          ))}
        </HStack>

        {/* Filters */}
        <HStack spacing={3} wrap="wrap">
          <InputGroup maxW="260px" size="sm">
            <InputLeftElement><SearchIcon color="app.textMuted" boxSize={3} /></InputLeftElement>
            <Input placeholder="Search bars…" value={search} onChange={e => setSearch(e.target.value)} />
          </InputGroup>
          {filter !== 'ALL' && (
            <Button size="xs" variant="ghost" onClick={() => setFilter('ALL')}>Clear filter ✕</Button>
          )}
        </HStack>

        {/* Bar accordion */}
        {isLoading && <Text color="app.textMuted" fontSize="sm">Loading…</Text>}
        <Accordion allowMultiple>
          {filtered.map(s => {
            const statusColor = s.hasVariance ? 'red' : s.pendingConfirmation ? 'yellow' : 'green'
            const statusLabel = s.hasVariance ? 'Variance detected' : s.pendingConfirmation ? 'Not confirmed yet' : 'All clear ✓'
            return (
              <AccordionItem
                key={s.bar.id}
                border="1px solid"
                borderColor={s.hasVariance ? 'rgba(239,68,68,0.3)' : 'app.border'}
                borderRadius="xl"
                mb={2}
                overflow="hidden"
              >
                <AccordionButton
                  bg="app.surface"
                  _hover={{ bg: 'app.hover' }}
                  px={4}
                  py={3}
                >
                  <HStack flex={1} justify="space-between" wrap="wrap" gap={2} textAlign="left">
                    <VStack align="start" spacing={0}>
                      <HStack>
                        <Text fontWeight="700" color="app.textPrimary" fontSize="sm">{s.bar.name}</Text>
                        {s.bar.barType === 'STOCK_ROOM' && <Badge colorScheme="purple" fontSize="9px">Stock Room</Badge>}
                      </HStack>
                      {s.bar.location && <Text fontSize="xs" color="app.textMuted">{s.bar.location}</Text>}
                    </VStack>
                    <HStack spacing={2}>
                      {s.confirmedBy && (
                        <Text fontSize="xs" color="app.textMuted">by {s.confirmedBy}</Text>
                      )}
                      <Badge colorScheme={statusColor} fontSize="xs">{statusLabel}</Badge>
                    </HStack>
                  </HStack>
                  <AccordionIcon color="app.textMuted" ml={2} />
                </AccordionButton>
                <AccordionPanel p={0} bg="app.canvas">
                  {s.lines.length === 0 ? (
                    <Text px={4} py={3} fontSize="sm" color="app.textMuted">No opening stock allocated.</Text>
                  ) : (
                    <Table size="sm" variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Product</Th>
                          <Th isNumeric>Allocated</Th>
                          <Th isNumeric>Confirmed</Th>
                          <Th isNumeric>Variance</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {s.lines.map(line => {
                          const varColor = line.variance === null ? 'app.textMuted'
                            : line.variance === 0 ? 'green.400'
                            : line.variance > 0 ? 'blue.400'
                            : 'red.400'
                          return (
                            <Tr key={line.product.id} bg={line.variance !== null && line.variance !== 0 ? 'rgba(239,68,68,0.05)' : 'transparent'}>
                              <Td color="app.textPrimary" fontWeight="500">
                                {line.product.name}
                                {line.product.totsPerBottle && (
                                  <Text as="span" fontSize="10px" color="app.textMuted"> (tots)</Text>
                                )}
                              </Td>
                              <Td isNumeric color="app.textSecondary">
                                {line.allocated}
                                {line.allocatedTots > 0 && <Text as="span" fontSize="10px"> +{line.allocatedTots}t</Text>}
                              </Td>
                              <Td isNumeric color="app.textSecondary">
                                {line.confirmed !== null ? (
                                  <>
                                    {line.confirmed}
                                    {(line.confirmedTots ?? 0) > 0 && <Text as="span" fontSize="10px"> +{line.confirmedTots}t</Text>}
                                  </>
                                ) : (
                                  <Text color="app.textMuted" fontStyle="italic">—</Text>
                                )}
                              </Td>
                              <Td isNumeric>
                                <Text color={varColor} fontWeight="700" fontSize="sm">
                                  {line.variance === null ? '—'
                                    : line.variance === 0 ? '✓'
                                    : line.variance > 0 ? `+${line.variance}`
                                    : line.variance}
                                </Text>
                              </Td>
                            </Tr>
                          )
                        })}
                      </Tbody>
                    </Table>
                  )}
                </AccordionPanel>
              </AccordionItem>
            )
          })}
        </Accordion>

        {filtered.length === 0 && !isLoading && (
          <Alert status="info" borderRadius="xl" bg="app.surface" border="1px solid" borderColor="app.border">
            <AlertIcon />
            <Text color="app.textSecondary" fontSize="sm">No bars match your filter.</Text>
          </Alert>
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
