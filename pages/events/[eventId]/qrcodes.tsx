import {
  Box, Button, Flex, Grid, Heading, HStack, Text, VStack, Badge, Input,
  InputGroup, InputLeftElement,
} from '@chakra-ui/react'
import { QRCodeSVG } from 'qrcode.react'
import { useRouter } from 'next/router'
import useSWR from 'swr'
import AppShell from '@/components/layout/AppShell'
import { requireAuth } from '@/lib/permissions'
import type { GetServerSideProps } from 'next'
import { useState } from 'react'
import NextLink from 'next/link'
import { ChevronLeftIcon, SearchIcon } from '@chakra-ui/icons'

interface Bar {
  id: number; name: string; location: string | null; responsibleCompany: string | null
  barType: string; status: string; accessToken: string
}
interface Event { id: number; name: string; venue: string; bars: Bar[] }

export default function QRCodesPage() {
  const router = useRouter()
  const eventId = router.query.eventId
  const { data: event } = useSWR<Event>(eventId ? `/api/events/${eventId}` : null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'BAR' | 'STOCK_ROOM'>('ALL')

  if (!event) return <AppShell title="QR Codes"><Box p={8} color="app.textMuted">Loading…</Box></AppShell>

  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/b/` : '/b/'

  const filtered = event.bars.filter(bar => {
    const matchesSearch = bar.name.toLowerCase().includes(search.toLowerCase()) ||
      (bar.location ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (bar.responsibleCompany ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'ALL' || bar.barType === filter
    return matchesSearch && matchesFilter
  })

  return (
    <AppShell title="QR Codes">
      {/* Screen controls — hidden when printing */}
      <Box className="no-print">
        <HStack mb={4} spacing={3} wrap="wrap">
          <Button
            as={NextLink}
            href={`/events/${eventId}`}
            leftIcon={<ChevronLeftIcon />}
            variant="ghost"
            size="sm"
          >
            Back to Event
          </Button>
          <Button
            onClick={() => window.print()}
            bg="brand.400"
            color="gray.900"
            fontWeight="700"
            size="sm"
            _hover={{ bg: 'brand.500' }}
          >
            🖨️ Print All QR Codes
          </Button>
        </HStack>

        <HStack mb={4} spacing={3} wrap="wrap">
          <InputGroup maxW="280px" size="sm">
            <InputLeftElement><SearchIcon color="app.textMuted" boxSize={3} /></InputLeftElement>
            <Input
              placeholder="Search bars…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </InputGroup>
          {['ALL', 'BAR', 'STOCK_ROOM'].map(f => (
            <Button
              key={f}
              size="xs"
              variant={filter === f ? 'solid' : 'outline'}
              onClick={() => setFilter(f as any)}
            >
              {f === 'ALL' ? 'All' : f === 'BAR' ? 'Bars only' : 'Stock Rooms only'}
            </Button>
          ))}
          <Text fontSize="xs" color="app.textMuted">{filtered.length} of {event.bars.length} shown</Text>
        </HStack>
      </Box>

      {/* Print header — only visible when printing */}
      <Box className="print-only" mb={6} display="none">
        <Text fontWeight="800" fontSize="xl" color="black">{event.name}</Text>
        <Text fontSize="sm" color="gray.600">{event.venue} · Bar QR Codes</Text>
      </Box>

      {/* QR Grid */}
      <Grid
        templateColumns={{ base: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(5, 1fr)' }}
        gap={4}
        className="qr-grid"
      >
        {filtered.map(bar => (
          <Box
            key={bar.id}
            bg="white"
            borderRadius="xl"
            border="1px solid"
            borderColor="gray.200"
            p={3}
            textAlign="center"
            className="qr-card"
          >
            <Flex justify="center" mb={2}>
              <QRCodeSVG
                value={`${baseUrl}${bar.accessToken}`}
                size={120}
                bgColor="#ffffff"
                fgColor="#0d0f14"
                level="M"
                includeMargin={false}
              />
            </Flex>
            <Text fontWeight="800" fontSize="sm" color="gray.900" isTruncated>{bar.name}</Text>
            {bar.location && (
              <Text fontSize="10px" color="gray.500" isTruncated>{bar.location}</Text>
            )}
            {bar.responsibleCompany && (
              <Text fontSize="10px" color="gray.400" isTruncated>{bar.responsibleCompany}</Text>
            )}
            <Badge
              mt={1}
              colorScheme={bar.barType === 'STOCK_ROOM' ? 'purple' : 'blue'}
              fontSize="9px"
            >
              {bar.barType === 'STOCK_ROOM' ? 'Stock Room' : 'Bar'}
            </Badge>
          </Box>
        ))}
      </Grid>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          .qr-grid {
            display: grid !important;
            grid-template-columns: repeat(5, 1fr) !important;
            gap: 12px !important;
            page-break-inside: auto;
          }
          .qr-card {
            break-inside: avoid;
            page-break-inside: avoid;
            border: 1px solid #e2e8f0 !important;
            border-radius: 8px !important;
            padding: 10px !important;
          }
        }
        .print-only { display: none; }
      `}</style>
    </AppShell>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const redirect = await requireAuth(ctx)
  if (redirect) return redirect
  return { props: {} }
}
