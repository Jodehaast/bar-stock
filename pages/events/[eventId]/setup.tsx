import {
  Box, Button, Divider, Heading, HStack, Input, Select, Text,
  VStack, useToast, Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  Table, Thead, Tbody, Tr, Th, Td, NumberInput, NumberInputField,
  NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
  Tabs, TabList, Tab, TabPanels, TabPanel,
} from '@chakra-ui/react'
import { ChevronRightIcon } from '@chakra-ui/icons'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import AppShell from '@/components/layout/AppShell'
import { requireAuth } from '@/lib/permissions'
import type { GetServerSideProps } from 'next'
import useSWR from 'swr'
import { useState } from 'react'
import { useSession } from 'next-auth/react'

interface Bar { id: number; name: string; location: string | null }
interface Product { id: number; name: string; unit: string; category: string | null; isActive: boolean }
interface Event { id: number; name: string }

export default function SetupPage() {
  const router = useRouter()
  const { eventId } = router.query
  const { data: event } = useSWR<Event>(eventId ? `/api/events/${eventId}` : null)
  const { data: bars = [] } = useSWR<Bar[]>(eventId ? `/api/events/${eventId}/bars` : null)
  const { data: products = [] } = useSWR<Product[]>('/api/products')
  const { data: session } = useSession()
  const toast = useToast()

  // Per-bar quantities: { [barId]: { [productId]: qty } }
  const [quantities, setQuantities] = useState<Record<number, Record<number, number>>>({})
  const [loading, setLoading] = useState<number | null>(null)

  const activeProducts = products.filter((p) => p.isActive)

  const setQty = (barId: number, productId: number, qty: number) => {
    setQuantities((prev) => ({
      ...prev,
      [barId]: { ...(prev[barId] ?? {}), [productId]: qty },
    }))
  }

  const allocate = async (barId: number) => {
    const barQtys = quantities[barId] ?? {}
    const lines = Object.entries(barQtys)
      .filter(([, qty]) => qty > 0)
      .map(([productId, qty]) => ({ productId: Number(productId), quantity: qty }))

    if (lines.length === 0) {
      toast({ title: 'Enter at least one quantity', status: 'warning', duration: 2000 })
      return
    }

    setLoading(barId)
    const res = await fetch(`/api/events/${eventId}/movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'INITIAL_ALLOCATION',
        toBarId: barId,
        notes: 'Opening stock allocation',
        lines,
      }),
    })
    setLoading(null)

    if (res.ok) {
      toast({ title: `Stock allocated to bar`, status: 'success', duration: 2000 })
      setQuantities((prev) => ({ ...prev, [barId]: {} }))
    } else {
      const err = await res.json()
      toast({ title: err.error ?? 'Error', status: 'error', duration: 3000 })
    }
  }

  if (!event || bars.length === 0) {
    return (
      <AppShell title="Stock Setup">
        <Box p={8} color="gray.400">
          {!event ? 'Loading...' : 'No bars in this event yet. Add bars first.'}
        </Box>
      </AppShell>
    )
  }

  const byCategory: Record<string, Product[]> = {}
  for (const p of activeProducts) {
    const cat = p.category ?? 'other'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(p)
  }

  return (
    <AppShell title="Initial Stock Allocation">
      <VStack align="stretch" spacing={6}>
        <Breadcrumb separator={<ChevronRightIcon color="gray.500" />} fontSize="sm" color="gray.400">
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href="/events">Events</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href={`/events/${eventId}`}>{event.name}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem isCurrentPage><BreadcrumbLink>Stock Setup</BreadcrumbLink></BreadcrumbItem>
        </Breadcrumb>
        <Heading size="md">Initial Stock Allocation</Heading>
        <Text color="gray.400" fontSize="sm">Enter the opening stock quantities for each bar. Leave blank to skip a product.</Text>

        <Tabs variant="soft-rounded" colorScheme="brand">
          <TabList flexWrap="wrap" gap={1}>
            {bars.map((bar) => <Tab key={bar.id} fontSize="sm">{bar.name}</Tab>)}
          </TabList>
          <TabPanels>
            {bars.map((bar) => (
              <TabPanel key={bar.id} px={0}>
                <Box bg="gray.800" borderRadius="xl" overflow="hidden" border="1px" borderColor="gray.700">
                  {Object.entries(byCategory).map(([cat, prods], idx) => (
                    <Box key={cat}>
                      {idx > 0 && <Divider borderColor="gray.700" />}
                      <Box px={4} py={2} bg="gray.750">
                        <Text fontSize="xs" color="gray.400" textTransform="uppercase" fontWeight="semibold">{cat}</Text>
                      </Box>
                      <Table size="sm">
                        <Tbody>
                          {prods.map((product) => (
                            <Tr key={product.id}>
                              <Td>
                                <Text fontWeight="medium">{product.name}</Text>
                                <Text fontSize="xs" color="gray.500">{product.unit}</Text>
                              </Td>
                              <Td w="120px">
                                <NumberInput
                                  min={0}
                                  value={quantities[bar.id]?.[product.id] ?? 0}
                                  onChange={(_, val) => setQty(bar.id, product.id, isNaN(val) ? 0 : val)}
                                  size="sm"
                                >
                                  <NumberInputField bg="gray.700" borderColor="gray.600" />
                                  <NumberInputStepper>
                                    <NumberIncrementStepper borderColor="gray.600" />
                                    <NumberDecrementStepper borderColor="gray.600" />
                                  </NumberInputStepper>
                                </NumberInput>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  ))}
                  <Box p={4} borderTop="1px" borderColor="gray.700">
                    <Button
                      onClick={() => allocate(bar.id)}
                      isLoading={loading === bar.id}
                      size="sm"
                    >
                      Allocate Stock to {bar.name}
                    </Button>
                  </Box>
                </Box>
              </TabPanel>
            ))}
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
