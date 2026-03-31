import {
  Box, Flex, VStack, HStack, Text, Heading, Badge, Button,
  Input, Textarea, FormControl, FormLabel, NumberInput, NumberInputField,
  Alert, AlertIcon, Divider, Spinner, useToast, Tabs, TabList,
  Tab, TabPanels, TabPanel, Grid,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import useSWR, { mutate } from 'swr'
import { useState } from 'react'

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error('Not found'); return r.json() })

interface Product { id: number; name: string; unit: string; category: string | null; totsPerBottle: number | null }
interface InventoryItem {
  id: number; openingQuantity: number; currentQuantity: number
  openingTots: number; currentTots: number
  product: Product
}
interface Confirmation { productId: number; confirmedQuantity: number; confirmedTots: number; confirmedBy: string | null; confirmedAt: string }
interface BarData {
  id: number; name: string; location: string | null; responsibleCompany: string | null
  barType: string; stockType: string; status: string; accessToken: string
  event: { id: number; name: string; venue: string; status: string }
  inventory: InventoryItem[]
  confirmations: Confirmation[]
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'Waiting for approval', color: 'yellow' },
  APPROVED:   { label: 'Approved — being prepped', color: 'blue' },
  READY:      { label: 'Ready for collection', color: 'cyan' },
  IN_TRANSIT: { label: 'On the way to you', color: 'orange' },
  DELIVERED:  { label: 'Delivered ✓', color: 'green' },
  REJECTED:   { label: 'Rejected', color: 'red' },
  CANCELLED:  { label: 'Cancelled', color: 'gray' },
}

export default function BarPublicPage() {
  const router = useRouter()
  const token = router.query.token as string
  const { data: bar, error } = useSWR<BarData>(token ? `/api/b/${token}` : null, fetcher, { refreshInterval: 15000 })
  const { data: movements = [] } = useSWR(
    token ? `/api/b/${token}/movements` : null, fetcher, { refreshInterval: 15000 }
  )

  const [yourName, setYourName] = useState('')
  const [restockQty, setRestockQty] = useState<Record<number, number>>({})
  const [confirmQty, setConfirmQty] = useState<Record<number, number>>({})
  const [confirmTots, setConfirmTots] = useState<Record<number, number>>({})
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmSubmitting, setConfirmSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const toast = useToast()

  if (error) return (
    <Flex minH="100vh" bg="app.bg" align="center" justify="center" p={4}>
      <VStack spacing={3} textAlign="center">
        <Text fontSize="3xl">🔒</Text>
        <Heading size="md" color="app.textPrimary">Bar not found</Heading>
        <Text color="app.textSecondary" fontSize="sm">This link is invalid or has expired.</Text>
      </VStack>
    </Flex>
  )

  if (!bar) return (
    <Flex minH="100vh" bg="app.bg" align="center" justify="center">
      <Spinner color="brand.400" size="xl" thickness="3px" />
    </Flex>
  )

  const isClosed = bar.status === 'CLOSED' || bar.event.status === 'CLOSED'
  const isSetup = bar.event.status === 'SETUP'
  const hasOpeningStock = bar.inventory.some(i => i.openingQuantity > 0)
  const hasConfirmed = bar.confirmations.length > 0
  const products = bar.inventory.map(i => i.product)

  const submitRestock = async () => {
    const lines = Object.entries(restockQty)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantityRequested]) => ({ productId: Number(productId), quantityRequested }))
    if (lines.length === 0) return toast({ title: 'Enter at least one quantity', status: 'warning', duration: 2000 })

    setSubmitting(true)
    const res = await fetch(`/api/b/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'RESTOCK', lines, notes, confirmedBy: yourName }),
    })
    setSubmitting(false)
    if (res.ok) {
      setSubmitted(true)
      setRestockQty({})
      setNotes('')
      mutate(`/api/b/${token}`)
      mutate(`/api/b/${token}/movements`)
    } else {
      const err = await res.json()
      toast({ title: err.error || 'Error submitting request', status: 'error', duration: 3000 })
    }
  }

  const submitConfirmation = async () => {
    const lines = bar.inventory.map(i => ({
      productId: i.product.id,
      confirmedQuantity: confirmQty[i.product.id] ?? confirmedMap[i.product.id]?.confirmedQuantity ?? 0,
      confirmedTots: confirmTots[i.product.id] ?? 0,
    }))

    setConfirmSubmitting(true)
    const res = await fetch(`/api/b/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'CONFIRM_OPENING', lines, confirmedBy: yourName }),
    })
    setConfirmSubmitting(false)
    if (res.ok) {
      setConfirmed(true)
      mutate(`/api/b/${token}`)
      toast({ title: 'Opening stock confirmed!', status: 'success', duration: 3000 })
    } else {
      toast({ title: 'Error saving confirmation', status: 'error', duration: 3000 })
    }
  }

  // Pre-fill confirm quantities from inventory opening amounts
  const initConfirmQty = (productId: number, opening: number) => {
    if (confirmQty[productId] === undefined) {
      setConfirmQty(prev => ({ ...prev, [productId]: opening }))
    }
  }
  bar.inventory.forEach(i => initConfirmQty(i.product.id, i.openingQuantity))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars

  const confirmedMap: Record<number, Confirmation> = {}
  bar.confirmations.forEach(c => { confirmedMap[c.productId] = c })

  return (
    <Box minH="100vh" bg="app.bg">
      {/* Header */}
      <Box
        bg="rgba(13,15,20,0.95)"
        borderBottom="1px solid"
        borderColor="app.border"
        px={4}
        py={4}
        position="sticky"
        top={0}
        zIndex={10}
      >
        <HStack justify="space-between" wrap="wrap" gap={2}>
          <VStack align="start" spacing={0}>
            <HStack spacing={2}>
              <Text fontWeight="800" fontSize="lg" color="brand.400" letterSpacing="-0.02em">BarStock</Text>
              <Text color="app.textMuted" fontSize="sm">·</Text>
              <Text color="app.textSecondary" fontSize="sm">{bar.event.name}</Text>
            </HStack>
            <Heading size="md" color="app.textPrimary" mt={1}>{bar.name}</Heading>
            {bar.location && <Text fontSize="sm" color="app.textSecondary">{bar.location}</Text>}
          </VStack>
          <VStack align="end" spacing={1}>
            <Badge colorScheme={isClosed ? 'red' : isSetup ? 'yellow' : 'green'} fontSize="xs">
              {isClosed ? 'CLOSED' : isSetup ? 'SETUP' : 'LIVE'}
            </Badge>
            {bar.responsibleCompany && (
              <Text fontSize="xs" color="app.textMuted">{bar.responsibleCompany}</Text>
            )}
          </VStack>
        </HStack>
      </Box>

      <Box maxW="600px" mx="auto" px={4} py={6}>
        {/* Your name (shared across tabs) */}
        <Box bg="app.surface" borderRadius="xl" border="1px solid" borderColor="app.border" p={4} mb={4}>
          <FormControl>
            <FormLabel fontSize="sm">Your name <Text as="span" color="app.textMuted">(optional)</Text></FormLabel>
            <Input
              value={yourName}
              onChange={e => setYourName(e.target.value)}
              placeholder="e.g. Thabo"
              size="md"
            />
          </FormControl>
        </Box>

        {isClosed ? (
          <Alert status="info" borderRadius="xl" bg="app.surface" border="1px solid" borderColor="app.border">
            <AlertIcon />
            <Text color="app.textSecondary">This bar is closed. No requests can be submitted.</Text>
          </Alert>
        ) : (
          <Tabs variant="soft-rounded" colorScheme="yellow" isFitted>
            <TabList bg="app.surface" borderRadius="xl" p={1} border="1px solid" borderColor="app.border" mb={4}>
              <Tab fontSize="sm" fontWeight="600" _selected={{ bg: 'brand.400', color: 'gray.900' }}>
                📦 Request Stock
              </Tab>
              <Tab fontSize="sm" fontWeight="600" _selected={{ bg: 'brand.400', color: 'gray.900' }}>
                ✅ Confirm Opening
                {hasConfirmed && <Badge ml={1} colorScheme="green" fontSize="9px">Done</Badge>}
              </Tab>
              <Tab fontSize="sm" fontWeight="600" _selected={{ bg: 'brand.400', color: 'gray.900' }}>
                📋 My Requests
              </Tab>
            </TabList>

            <TabPanels>
              {/* ── REQUEST STOCK ── */}
              <TabPanel p={0}>
                {submitted && (
                  <Alert status="success" borderRadius="xl" mb={4} bg="rgba(34,197,94,0.1)" border="1px solid" borderColor="rgba(34,197,94,0.3)">
                    <AlertIcon color="green.400" />
                    <Text color="green.300" fontWeight="600">Request submitted! Someone will bring it to you.</Text>
                  </Alert>
                )}
                <Box bg="app.surface" borderRadius="xl" border="1px solid" borderColor="app.border" overflow="hidden">
                  <Box px={4} py={3} borderBottom="1px solid" borderColor="app.border">
                    <Text fontWeight="700" color="app.textPrimary">What do you need?</Text>
                    <Text fontSize="xs" color="app.textMuted">Enter quantities and tap Request</Text>
                  </Box>
                  <VStack spacing={0} divider={<Divider borderColor="app.border" />}>
                    {products.map(product => (
                      <HStack key={product.id} px={4} py={3} w="full" justify="space-between">
                        <VStack align="start" spacing={0} flex={1}>
                          <Text fontSize="sm" fontWeight="600" color="app.textPrimary">{product.name}</Text>
                          <Text fontSize="xs" color="app.textMuted">{product.unit}{product.category ? ` · ${product.category}` : ''}</Text>
                        </VStack>
                        <NumberInput
                          min={0} max={999} w="80px" size="sm"
                          value={restockQty[product.id] ?? 0}
                          onChange={(_, v) => setRestockQty(prev => ({ ...prev, [product.id]: isNaN(v) ? 0 : v }))}
                        >
                          <NumberInputField textAlign="center" borderColor="app.border" bg="app.overlay" color="app.textPrimary" />
                        </NumberInput>
                      </HStack>
                    ))}
                  </VStack>
                  <Box px={4} py={3} borderTop="1px solid" borderColor="app.border">
                    <Textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Any notes? (e.g. running very low, urgent)"
                      size="sm"
                      rows={2}
                      mb={3}
                    />
                    <Button
                      w="full"
                      size="lg"
                      bg="brand.400"
                      color="gray.900"
                      fontWeight="700"
                      isLoading={submitting}
                      loadingText="Submitting…"
                      onClick={submitRestock}
                    >
                      📨 Request Stock
                    </Button>
                  </Box>
                </Box>
              </TabPanel>

              {/* ── CONFIRM OPENING STOCK ── */}
              <TabPanel p={0}>
                {!hasOpeningStock ? (
                  <Alert status="info" borderRadius="xl" bg="app.surface" border="1px solid" borderColor="app.border">
                    <AlertIcon />
                    <Text color="app.textSecondary" fontSize="sm">No opening stock has been allocated to this bar yet.</Text>
                  </Alert>
                ) : confirmed || hasConfirmed ? (
                  <Alert status="success" borderRadius="xl" mb={4} bg="rgba(34,197,94,0.1)" border="1px solid" borderColor="rgba(34,197,94,0.3)">
                    <AlertIcon color="green.400" />
                    <VStack align="start" spacing={0}>
                      <Text color="green.300" fontWeight="700">Opening stock confirmed ✓</Text>
                      {bar.confirmations[0]?.confirmedBy && (
                        <Text color="green.400" fontSize="xs">by {bar.confirmations[0].confirmedBy}</Text>
                      )}
                    </VStack>
                  </Alert>
                ) : null}

                <Box bg="app.surface" borderRadius="xl" border="1px solid" borderColor="app.border" overflow="hidden">
                  <Box px={4} py={3} borderBottom="1px solid" borderColor="app.border">
                    <Text fontWeight="700" color="app.textPrimary">Count your opening stock</Text>
                    <Text fontSize="xs" color="app.textMuted">Count what you actually have and enter it below</Text>
                  </Box>
                  <VStack spacing={0} divider={<Divider borderColor="app.border" />}>
                    {bar.inventory.map(item => {
                      const confirmed = confirmedMap[item.product.id]
                      const diff = confirmed
                        ? confirmed.confirmedQuantity - item.openingQuantity
                        : null
                      return (
                        <Box key={item.product.id} px={4} py={3} w="full">
                          <HStack justify="space-between" mb={2}>
                            <VStack align="start" spacing={0}>
                              <Text fontSize="sm" fontWeight="600" color="app.textPrimary">{item.product.name}</Text>
                              <Text fontSize="xs" color="app.textMuted">
                                Allocated: <Text as="span" color="brand.400" fontWeight="700">{item.openingQuantity}</Text> {item.product.unit}
                                {item.openingTots > 0 && ` + ${item.openingTots} tots`}
                              </Text>
                            </VStack>
                            {diff !== null && (
                              <Badge colorScheme={diff === 0 ? 'green' : diff > 0 ? 'blue' : 'red'} fontSize="xs">
                                {diff === 0 ? '✓ Match' : diff > 0 ? `+${diff} extra` : `${diff} short`}
                              </Badge>
                            )}
                          </HStack>
                          <Grid templateColumns={item.product.totsPerBottle ? '1fr 1fr' : '1fr'} gap={2}>
                            <Box>
                              <Text fontSize="xs" color="app.textMuted" mb={1}>Bottles / units you have</Text>
                              <NumberInput
                                min={0} max={9999} size="sm"
                                value={confirmQty[item.product.id] ?? item.openingQuantity}
                                onChange={(_, v) => setConfirmQty(prev => ({ ...prev, [item.product.id]: isNaN(v) ? 0 : v }))}
                              >
                                <NumberInputField borderColor="app.border" bg="app.overlay" color="app.textPrimary" />
                              </NumberInput>
                            </Box>
                            {item.product.totsPerBottle && (
                              <Box>
                                <Text fontSize="xs" color="app.textMuted" mb={1}>Extra tots (open bottle)</Text>
                                <NumberInput
                                  min={0} max={item.product.totsPerBottle - 1} size="sm"
                                  value={confirmTots[item.product.id] ?? 0}
                                  onChange={(_, v) => setConfirmTots(prev => ({ ...prev, [item.product.id]: isNaN(v) ? 0 : v }))}
                                >
                                  <NumberInputField borderColor="app.border" bg="app.overlay" color="app.textPrimary" />
                                </NumberInput>
                              </Box>
                            )}
                          </Grid>
                        </Box>
                      )
                    })}
                  </VStack>
                  <Box px={4} py={3} borderTop="1px solid" borderColor="app.border">
                    <Button
                      w="full"
                      size="lg"
                      bg="green.500"
                      color="white"
                      fontWeight="700"
                      _hover={{ bg: 'green.400' }}
                      isLoading={confirmSubmitting}
                      loadingText="Saving…"
                      onClick={submitConfirmation}
                    >
                      ✅ Confirm My Stock Count
                    </Button>
                  </Box>
                </Box>
              </TabPanel>

              {/* ── MY REQUESTS ── */}
              <TabPanel p={0}>
                <VStack spacing={3} align="stretch">
                  {movements.length === 0 ? (
                    <Box bg="app.surface" borderRadius="xl" border="1px solid" borderColor="app.border" p={6} textAlign="center">
                      <Text color="app.textMuted" fontSize="sm">No requests yet</Text>
                    </Box>
                  ) : movements.map((m: any) => {
                    const statusInfo = STATUS_LABELS[m.status] ?? { label: m.status, color: 'gray' }
                    return (
                      <Box key={m.id} bg="app.surface" borderRadius="xl" border="1px solid" borderColor="app.border" overflow="hidden">
                        <HStack px={4} py={3} justify="space-between" borderBottom="1px solid" borderColor="app.border">
                          <Badge colorScheme={statusInfo.color} fontSize="xs">{statusInfo.label}</Badge>
                          <Text fontSize="xs" color="app.textMuted">
                            {new Date(m.createdAt).toLocaleString('en-ZA', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                          </Text>
                        </HStack>
                        <Box px={4} py={3}>
                          <HStack wrap="wrap" gap={2}>
                            {m.lines?.map((line: any) => (
                              <Badge key={line.id} colorScheme="gray" variant="subtle" px={2} py={1}>
                                {line.quantityRequested} × {line.product?.name}
                              </Badge>
                            ))}
                          </HStack>
                          {m.notes && <Text fontSize="xs" color="app.textMuted" mt={2}>"{m.notes}"</Text>}
                        </Box>
                      </Box>
                    )
                  })}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        )}
      </Box>
    </Box>
  )
}
