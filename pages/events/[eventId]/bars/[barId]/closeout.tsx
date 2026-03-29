import {
  Box, Button, Divider, Heading, HStack, Text, VStack, Select, Textarea,
  FormControl, FormLabel, useToast, Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper,
} from '@chakra-ui/react'
import { ChevronRightIcon } from '@chakra-ui/icons'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import AppShell from '@/components/layout/AppShell'
import { requireAuth } from '@/lib/permissions'
import type { GetServerSideProps } from 'next'
import useSWR from 'swr'
import { useState } from 'react'

interface Bar { id: number; name: string; event: { id: number; name: string } }
interface InventoryRow {
  id: number; currentQuantity: number; currentTots: number
  product: { id: number; name: string; unit: string; category: string | null; totsPerBottle: number | null }
}
interface OtherBar { id: number; name: string }

export default function CloseOutPage() {
  const router = useRouter()
  const { eventId, barId } = router.query
  const { data: bar } = useSWR<Bar>(barId ? `/api/events/${eventId}/bars/${barId}` : null)
  const { data: inventory = [] } = useSWR<InventoryRow[]>(
    barId ? `/api/events/${eventId}/bars/${barId}/inventory` : null
  )
  const { data: allBars = [] } = useSWR<OtherBar[]>(eventId ? `/api/events/${eventId}/bars` : null)

  const [counts, setCounts] = useState<Record<number, number>>({})
  const [tots, setTots] = useState<Record<number, number>>({})
  const [destinations, setDestinations] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const otherBars = allBars.filter((b) => String(b.id) !== String(barId))

  const submit = async () => {
    const lines = inventory
      .filter((row) => (counts[row.product.id] ?? row.currentQuantity) > 0 || (row.product.totsPerBottle && (tots[row.product.id] ?? row.currentTots) > 0))
      .map((row) => ({
        productId: row.product.id,
        quantity: counts[row.product.id] ?? row.currentQuantity,
        tots: row.product.totsPerBottle ? (tots[row.product.id] ?? row.currentTots) : undefined,
      }))

    if (lines.length === 0) {
      toast({ title: 'No stock to close out', status: 'warning', duration: 2000 })
      return
    }

    const toBarId = destinations['all'] ? Number(destinations['all']) : null

    setLoading(true)
    const res = await fetch(`/api/events/${eventId}/movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'CLOSE_OUT',
        fromBarId: Number(barId),
        toBarId,
        notes: notes || `Close out of ${bar?.name}`,
        lines,
      }),
    })
    setLoading(false)

    if (res.ok) {
      await fetch(`/api/events/${eventId}/bars/${barId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED' }),
      })
      toast({ title: 'Bar closed out', status: 'success', duration: 2000 })
      router.push(`/events/${eventId}/bars/${barId}`)
    } else {
      const err = await res.json()
      toast({ title: err.error ?? 'Error', status: 'error', duration: 3000 })
    }
  }

  if (!bar) return <AppShell><Box p={8} color="gray.400">Loading...</Box></AppShell>

  const byCategory: Record<string, InventoryRow[]> = {}
  for (const row of inventory) {
    const cat = row.product.category ?? 'other'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(row)
  }

  return (
    <AppShell title="Bar Close-Out">
      <VStack align="stretch" spacing={6} maxW="600px">
        <Breadcrumb separator={<ChevronRightIcon color="gray.500" />} fontSize="sm" color="gray.400">
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href="/events">Events</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href={`/events/${eventId}`}>{bar.event.name}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href={`/events/${eventId}/bars/${barId}`}>{bar.name}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem isCurrentPage><BreadcrumbLink>Close Out</BreadcrumbLink></BreadcrumbItem>
        </Breadcrumb>
        <Heading size="md">Close Out — {bar.name}</Heading>
        <Text color="gray.400" fontSize="sm">Count remaining stock. Spirits can be counted in bottles + tots.</Text>

        {inventory.length === 0 ? (
          <Text color="gray.500">No inventory to close out.</Text>
        ) : (
          <Box bg="gray.800" borderRadius="xl" border="1px" borderColor="gray.700" overflow="hidden">
            {Object.entries(byCategory).map(([cat, rows], idx) => (
              <Box key={cat}>
                {idx > 0 && <Divider borderColor="gray.700" />}
                <Box px={4} py={2}><Text fontSize="xs" color="gray.400" textTransform="uppercase" fontWeight="semibold">{cat}</Text></Box>
                {rows.map((row) => (
                  <HStack key={row.id} px={4} py={2} justify="space-between" wrap="wrap" gap={2}>
                    <Box flex={1} minW="120px">
                      <Text fontSize="sm" fontWeight="medium">{row.product.name}</Text>
                      <Text fontSize="xs" color="gray.500">
                        Current: {row.currentQuantity} btl{row.product.totsPerBottle ? ` + ${row.currentTots} tots` : ''}
                      </Text>
                    </Box>
                    <HStack spacing={2}>
                      <Box textAlign="center">
                        {row.product.totsPerBottle && <Text fontSize="xs" color="gray.500" mb={1}>btl</Text>}
                        <NumberInput
                          min={0} size="sm" w="80px"
                          defaultValue={row.currentQuantity}
                          onChange={(_, val) => setCounts((p) => ({ ...p, [row.product.id]: isNaN(val) ? 0 : val }))}
                        >
                          <NumberInputField bg="gray.700" borderColor="gray.600" />
                          <NumberInputStepper>
                            <NumberIncrementStepper borderColor="gray.600" />
                            <NumberDecrementStepper borderColor="gray.600" />
                          </NumberInputStepper>
                        </NumberInput>
                      </Box>
                      {row.product.totsPerBottle && (
                        <Box textAlign="center">
                          <Text fontSize="xs" color="gray.500" mb={1}>tots</Text>
                          <NumberInput
                            min={0} max={row.product.totsPerBottle - 1} size="sm" w="80px"
                            defaultValue={row.currentTots}
                            onChange={(_, val) => setTots((p) => ({ ...p, [row.product.id]: isNaN(val) ? 0 : val }))}
                          >
                            <NumberInputField bg="gray.700" borderColor="gray.600" />
                            <NumberInputStepper>
                              <NumberIncrementStepper borderColor="gray.600" />
                              <NumberDecrementStepper borderColor="gray.600" />
                            </NumberInputStepper>
                          </NumberInput>
                        </Box>
                      )}
                    </HStack>
                  </HStack>
                ))}
              </Box>
            ))}

            <Divider borderColor="gray.700" />
            <Box p={4}>
              <FormControl mb={3}>
                <FormLabel fontSize="sm">Send remaining stock to</FormLabel>
                <Select
                  value={destinations['all'] ?? ''}
                  onChange={(e) => setDestinations({ all: e.target.value })}
                  bg="gray.700" borderColor="gray.600"
                >
                  <option value="">Return to Central Store</option>
                  {otherBars.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </FormControl>
              <FormControl mb={4}>
                <FormLabel fontSize="sm">Notes (optional)</FormLabel>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} bg="gray.700" borderColor="gray.600" rows={2} />
              </FormControl>
              <HStack justify="flex-end">
                <Button as={NextLink} href={`/events/${eventId}/bars/${barId}`} variant="ghost">Cancel</Button>
                <Button onClick={submit} isLoading={loading} colorScheme="orange">Close Out Bar</Button>
              </HStack>
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
