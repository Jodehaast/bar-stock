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

interface Bar { id: number; name: string }
interface Product { id: number; name: string; unit: string; category: string | null; isActive: boolean }
interface Event { id: number; name: string }

export default function TransferPage() {
  const router = useRouter()
  const { eventId } = router.query
  const { data: event } = useSWR<Event>(eventId ? `/api/events/${eventId}` : null)
  const { data: bars = [] } = useSWR<Bar[]>(eventId ? `/api/events/${eventId}/bars` : null)
  const { data: products = [] } = useSWR<Product[]>('/api/products')

  const [fromBarId, setFromBarId] = useState('')
  const [toBarId, setToBarId] = useState('')
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const activeProducts = products.filter((p) => p.isActive)
  const byCategory: Record<string, Product[]> = {}
  for (const p of activeProducts) {
    const cat = p.category ?? 'other'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(p)
  }

  const submit = async () => {
    if (!fromBarId || !toBarId) {
      toast({ title: 'Select both bars', status: 'warning', duration: 2000 })
      return
    }
    if (fromBarId === toBarId) {
      toast({ title: 'From and To bars must be different', status: 'warning', duration: 2000 })
      return
    }
    const lines = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([productId, qty]) => ({ productId: Number(productId), quantity: qty }))
    if (lines.length === 0) {
      toast({ title: 'Enter at least one quantity', status: 'warning', duration: 2000 })
      return
    }
    setLoading(true)
    const res = await fetch(`/api/events/${eventId}/movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'TRANSFER', fromBarId: Number(fromBarId), toBarId: Number(toBarId), notes, lines }),
    })
    setLoading(false)
    if (res.ok) {
      toast({ title: 'Transfer created', status: 'success', duration: 2000 })
      router.push(`/events/${eventId}/movements`)
    } else {
      const err = await res.json()
      toast({ title: err.error ?? 'Error', status: 'error', duration: 3000 })
    }
  }

  return (
    <AppShell title="Transfer Stock">
      <VStack align="stretch" spacing={6} maxW="560px">
        <Breadcrumb separator={<ChevronRightIcon color="gray.500" />} fontSize="sm" color="gray.400">
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href="/events">Events</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href={`/events/${eventId}`}>{event?.name}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem isCurrentPage><BreadcrumbLink>Transfer Stock</BreadcrumbLink></BreadcrumbItem>
        </Breadcrumb>
        <Heading size="md">Transfer Stock Between Bars</Heading>

        <Box bg="gray.800" borderRadius="xl" p={5} border="1px" borderColor="gray.700">
          <HStack spacing={4} mb={4}>
            <FormControl>
              <FormLabel fontSize="sm">From Bar</FormLabel>
              <Select value={fromBarId} onChange={(e) => setFromBarId(e.target.value)} bg="gray.700" borderColor="gray.600">
                <option value="">Select bar</option>
                {bars.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">To Bar</FormLabel>
              <Select value={toBarId} onChange={(e) => setToBarId(e.target.value)} bg="gray.700" borderColor="gray.600">
                <option value="">Select bar</option>
                {bars.filter((b) => String(b.id) !== fromBarId).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
            </FormControl>
          </HStack>
          <Divider borderColor="gray.700" mb={4} />

          {Object.entries(byCategory).map(([cat, prods]) => (
            <Box key={cat} mb={3}>
              <Text fontSize="xs" color="gray.400" textTransform="uppercase" fontWeight="semibold" mb={2}>{cat}</Text>
              {prods.map((product) => (
                <HStack key={product.id} mb={2} justify="space-between">
                  <Box>
                    <Text fontSize="sm" fontWeight="medium">{product.name}</Text>
                    <Text fontSize="xs" color="gray.500">{product.unit}</Text>
                  </Box>
                  <NumberInput
                    min={0} size="sm" w="100px"
                    value={quantities[product.id] ?? 0}
                    onChange={(_, val) => setQuantities((p) => ({ ...p, [product.id]: isNaN(val) ? 0 : val }))}
                  >
                    <NumberInputField bg="gray.700" borderColor="gray.600" />
                    <NumberInputStepper>
                      <NumberIncrementStepper borderColor="gray.600" />
                      <NumberDecrementStepper borderColor="gray.600" />
                    </NumberInputStepper>
                  </NumberInput>
                </HStack>
              ))}
            </Box>
          ))}

          <Divider borderColor="gray.700" my={4} />
          <FormControl mb={4}>
            <FormLabel fontSize="sm">Notes (optional)</FormLabel>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} bg="gray.700" borderColor="gray.600" rows={2} />
          </FormControl>
          <HStack justify="flex-end">
            <Button as={NextLink} href={`/events/${eventId}`} variant="ghost">Cancel</Button>
            <Button onClick={submit} isLoading={loading}>Create Transfer</Button>
          </HStack>
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
