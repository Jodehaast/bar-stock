import {
  Box, Button, Divider, Heading, HStack, Text, VStack, useToast,
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, Textarea, FormControl, FormLabel,
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
interface Product { id: number; name: string; unit: string; category: string | null; isActive: boolean }

export default function RestockPage() {
  const router = useRouter()
  const { eventId, barId } = router.query
  const { data: bar } = useSWR<Bar>(barId ? `/api/events/${eventId}/bars/${barId}` : null)
  const { data: products = [] } = useSWR<Product[]>('/api/products')
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
      body: JSON.stringify({ type: 'RESTOCK', toBarId: Number(barId), notes, lines }),
    })
    setLoading(false)
    if (res.ok) {
      toast({ title: 'Restock request submitted', status: 'success', duration: 2000 })
      router.push(`/events/${eventId}/bars/${barId}`)
    } else {
      const err = await res.json()
      toast({ title: err.error ?? 'Error', status: 'error', duration: 3000 })
    }
  }

  if (!bar) return <AppShell><Box p={8} color="gray.400">Loading...</Box></AppShell>

  return (
    <AppShell title="Request Restock">
      <VStack align="stretch" spacing={6} maxW="560px">
        <Breadcrumb separator={<ChevronRightIcon color="gray.500" />} fontSize="sm" color="gray.400">
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href="/events">Events</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href={`/events/${eventId}`}>{bar.event.name}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href={`/events/${eventId}/bars/${barId}`}>{bar.name}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem isCurrentPage><BreadcrumbLink>Restock</BreadcrumbLink></BreadcrumbItem>
        </Breadcrumb>
        <Heading size="md">Request Restock — {bar.name}</Heading>

        <Box bg="gray.800" borderRadius="xl" border="1px" borderColor="gray.700" overflow="hidden">
          {Object.entries(byCategory).map(([cat, prods], idx) => (
            <Box key={cat}>
              {idx > 0 && <Divider borderColor="gray.700" />}
              <Box px={4} py={2}><Text fontSize="xs" color="gray.400" textTransform="uppercase" fontWeight="semibold">{cat}</Text></Box>
              {prods.map((product) => (
                <HStack key={product.id} px={4} py={2} justify="space-between">
                  <Box>
                    <Text fontWeight="medium">{product.name}</Text>
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
          <Box p={4} borderTop="1px" borderColor="gray.700">
            <FormControl mb={3}>
              <FormLabel fontSize="sm">Notes (optional)</FormLabel>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                bg="gray.700" borderColor="gray.600" rows={2}
                placeholder="e.g. running low on Castle Lager"
              />
            </FormControl>
            <HStack justify="flex-end">
              <Button as={NextLink} href={`/events/${eventId}/bars/${barId}`} variant="ghost">Cancel</Button>
              <Button onClick={submit} isLoading={loading} colorScheme="cyan">Submit Request</Button>
            </HStack>
          </Box>
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
