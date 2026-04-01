import {
  Box, Button, Heading, HStack, Text, VStack, Badge, Spinner, Center,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, useDisclosure, NumberInput, NumberInputField,
  NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
  Textarea, FormControl, FormLabel, useToast, Divider, Select,
} from '@chakra-ui/react'
import { signOut, useSession } from 'next-auth/react'
import { requireAuth } from '@/lib/permissions'
import type { GetServerSideProps } from 'next'
import useSWR, { mutate } from 'swr'
import { useState } from 'react'
import { useSSEInbox } from '@/hooks/useSSEInbox'
import AdminPreviewBanner from '@/components/common/AdminPreviewBanner'

interface Movement {
  id: number; status: string; type: string; notes: string | null; createdAt: string; eventId: number
  toBar: { id: number; name: string } | null
  lines: { id: number; quantityRequested: number; product: { name: string } }[]
}
interface Product { id: number; name: string; unit: string; category: string | null; isActive: boolean }
interface Bar { id: number; name: string; eventId: number; event: { id: number; name: string; status: string } }

const STATUS_TEXT: Record<string, { label: string; color: string; emoji: string }> = {
  PENDING:    { label: 'Waiting for approval',  color: 'yellow', emoji: '⏳' },
  APPROVED:   { label: 'Approved — being prepped', color: 'blue',   emoji: '📦' },
  READY:      { label: 'Ready — runner collecting', color: 'cyan',  emoji: '🚀' },
  IN_TRANSIT: { label: 'On the way to you!',    color: 'orange', emoji: '🚚' },
  DELIVERED:  { label: 'Delivered ✓',           color: 'green',  emoji: '✅' },
  REJECTED:   { label: 'Rejected',              color: 'red',    emoji: '❌' },
  CANCELLED:  { label: 'Cancelled',             color: 'gray',   emoji: '🚫' },
}

export default function BarStaffScreen() {
  const { data: session } = useSession()
  const name = (session?.user as any)?.name ?? 'Bar Staff'
  // SSE for real-time updates; SWR as fallback for initial load
  const { data: sseMovements, connected } = useSSEInbox<Movement[]>()
  const { data: swrMovements = [], isLoading } = useSWR<Movement[]>('/api/inbox?role=BAR_STAFF', { refreshInterval: connected ? 60000 : 10000 })
  const movements = sseMovements ?? swrMovements
  const { data: products = [] } = useSWR<Product[]>('/api/products')
  const { data: bars = [] } = useSWR<Bar[]>('/api/my-bars')
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [notes, setNotes] = useState('')
  const [selectedBarId, setSelectedBarId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  const activeBars = bars.filter(b => b.event.status === 'ACTIVE')
  const selectedBar = activeBars.find(b => String(b.id) === selectedBarId)

  const activeProducts = products.filter(p => p.isActive)
  const byCategory: Record<string, Product[]> = {}
  for (const p of activeProducts) {
    const cat = p.category ?? 'other'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(p)
  }

  const submitRequest = async () => {
    if (!selectedBar) { toast({ title: 'Select your bar first', status: 'warning' }); return }
    const lines = Object.entries(quantities).filter(([, q]) => q > 0).map(([id, q]) => ({ productId: Number(id), quantity: q }))
    if (lines.length === 0) { toast({ title: 'Add at least one item', status: 'warning' }); return }
    setSubmitting(true)
    const res = await fetch(`/api/events/${selectedBar.eventId}/movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'RESTOCK', toBarId: selectedBar.id, notes, lines }),
    })
    setSubmitting(false)
    if (res.ok) {
      toast({ title: '✅ Request sent!', status: 'success', duration: 2000 })
      setQuantities({}); setNotes(''); onClose()
      mutate('/api/inbox?role=BAR_STAFF')
    } else {
      toast({ title: 'Error sending request', status: 'error' })
    }
  }

  const active = movements.filter(m => !['DELIVERED','REJECTED','CANCELLED'].includes(m.status))
  const done = movements.filter(m => ['DELIVERED','REJECTED','CANCELLED'].includes(m.status))

  return (
    <Box minH="100vh" bg="gray.900" color="white" pb="80px">
      <AdminPreviewBanner roleLabel="Bar Staff" color="purple" />
      <Box bg="gray.800" px={4} py={4} borderBottom="1px" borderColor="gray.700">
        <HStack justify="space-between">
          <VStack align="start" spacing={0}>
            <Text fontSize="xs" color="gray.400">Logged in as</Text>
            <Heading size="md">🍺 {name}</Heading>
          </VStack>
          <Button size="sm" variant="ghost" color="gray.400" onClick={() => signOut({ callbackUrl: '/login' })}>
            Sign out
          </Button>
        </HStack>
      </Box>

      <VStack align="stretch" spacing={5} px={4} pt={6}>
        {/* BIG REQUEST BUTTON */}
        <Button
          size="lg" colorScheme="brand" borderRadius="2xl"
          h="72px" fontSize="xl" fontWeight="black"
          onClick={onOpen}
        >
          + REQUEST STOCK
        </Button>

        {/* ACTIVE REQUESTS */}
        {active.length > 0 && (
          <Box>
            <Text fontWeight="bold" fontSize="lg" mb={3}>YOUR ACTIVE REQUESTS</Text>
            <VStack spacing={3}>
              {active.map(m => {
                const s = STATUS_TEXT[m.status] ?? { label: m.status, color: 'gray', emoji: '•' }
                return (
                  <Box key={m.id} bg="gray.800" borderRadius="2xl" overflow="hidden" w="full"
                    border="2px" borderColor={`${s.color}.500`}>
                    <Box bg={`${s.color}.600`} px={4} py={2}>
                      <Text fontWeight="bold" fontSize="sm">{s.emoji} {s.label.toUpperCase()}</Text>
                    </Box>
                    <Box px={4} py={3}>
                      <VStack align="start" spacing={1}>
                        {m.lines.map(l => (
                          <Text key={l.id} fontSize="lg">
                            <Text as="span" fontWeight="black" color={`${s.color}.300`}>{l.quantityRequested}× </Text>
                            {l.product.name}
                          </Text>
                        ))}
                      </VStack>
                      {m.notes && <Text fontSize="xs" color="gray.400" mt={2}>📝 {m.notes}</Text>}
                    </Box>
                  </Box>
                )
              })}
            </VStack>
          </Box>
        )}

        {isLoading && <Center py={8}><Spinner color="brand.400" /></Center>}

        {/* DONE */}
        {done.length > 0 && (
          <Box>
            <Text fontWeight="bold" fontSize="sm" color="gray.500" mb={3}>EARLIER TODAY</Text>
            <VStack spacing={2}>
              {done.slice(0, 5).map(m => {
                const s = STATUS_TEXT[m.status] ?? { label: m.status, color: 'gray', emoji: '•' }
                return (
                  <Box key={m.id} bg="gray.800" borderRadius="xl" px={4} py={3} w="full" opacity={0.6}>
                    <HStack justify="space-between">
                      <Text fontSize="sm">{s.emoji} {m.lines.map(l => `${l.quantityRequested}× ${l.product.name}`).join(', ')}</Text>
                      <Badge colorScheme={s.color} fontSize="xs">{s.label}</Badge>
                    </HStack>
                  </Box>
                )
              })}
            </VStack>
          </Box>
        )}
      </VStack>

      {/* REQUEST MODAL */}
      <Modal isOpen={isOpen} onClose={onClose} size="full">
        <ModalOverlay />
        <ModalContent bg="gray.900" color="white" m={0} borderRadius={0}>
          <ModalHeader borderBottom="1px" borderColor="gray.700">
            Request Stock
            <ModalCloseButton />
          </ModalHeader>
          <ModalBody overflowY="auto" pb={6}>
            <VStack align="stretch" spacing={5} pt={2}>
              {activeBars.length > 1 && (
                <FormControl>
                  <FormLabel fontSize="sm" color="gray.400">YOUR BAR</FormLabel>
                  <Select
                    value={selectedBarId}
                    onChange={e => setSelectedBarId(e.target.value)}
                    bg="gray.800" borderColor="gray.600" size="lg" borderRadius="xl"
                  >
                    <option value="">Select your bar...</option>
                    {activeBars.map(b => <option key={b.id} value={b.id}>{b.name} — {b.event.name}</option>)}
                  </Select>
                </FormControl>
              )}

              {Object.entries(byCategory).map(([cat, prods]) => (
                <Box key={cat}>
                  <Text fontSize="xs" color="gray.400" textTransform="uppercase" fontWeight="bold" mb={2}>{cat}</Text>
                  <VStack spacing={2}>
                    {prods.map(p => (
                      <HStack key={p.id} bg="gray.800" borderRadius="xl" px={4} py={3} w="full" justify="space-between">
                        <Text fontWeight="semibold">{p.name}</Text>
                        <NumberInput
                          min={0} size="md" w="110px" value={quantities[p.id] ?? 0}
                          onChange={(_, v) => setQuantities(prev => ({ ...prev, [p.id]: isNaN(v) ? 0 : v }))}
                        >
                          <NumberInputField bg="gray.700" borderColor="gray.600" textAlign="center" fontSize="lg" fontWeight="bold" />
                          <NumberInputStepper>
                            <NumberIncrementStepper borderColor="gray.600" />
                            <NumberDecrementStepper borderColor="gray.600" />
                          </NumberInputStepper>
                        </NumberInput>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              ))}

              <FormControl>
                <FormLabel fontSize="sm" color="gray.400">NOTE (optional)</FormLabel>
                <Textarea
                  value={notes} onChange={e => setNotes(e.target.value)}
                  bg="gray.800" borderColor="gray.600" borderRadius="xl"
                  placeholder="e.g. very low on Castle, urgent"
                  rows={2}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter borderTop="1px" borderColor="gray.700">
            <Button
              w="full" size="lg" colorScheme="brand" borderRadius="xl"
              h="60px" fontSize="lg" fontWeight="black"
              isLoading={submitting} onClick={submitRequest}
            >
              SEND REQUEST
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const redirect = await requireAuth(ctx)
  if (redirect) return redirect
  return { props: {} }
}
