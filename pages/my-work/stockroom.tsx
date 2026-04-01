import {
  Box, Button, Heading, HStack, Text, VStack, Badge, Spinner, Center,
  NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure, useToast,
} from '@chakra-ui/react'
import { signOut, useSession } from 'next-auth/react'
import AdminPreviewBanner from '@/components/common/AdminPreviewBanner'
import { requireAuth } from '@/lib/permissions'
import type { GetServerSideProps } from 'next'
import useSWR, { mutate } from 'swr'
import { useState } from 'react'

interface Line {
  id: number
  quantityRequested: number
  product: { name: string; unit: string }
}

interface Movement {
  id: number; status: string; notes: string | null; createdAt: string; eventId: number
  toBar: { id: number; name: string; location: string | null } | null
  createdBy: { name: string }
  lines: Line[]
}

export default function StockRoomScreen() {
  const { data: session } = useSession()
  const name = (session?.user as any)?.name ?? 'Stock Room'
  const { data: movements = [], isLoading } = useSWR<Movement[]>('/api/inbox?role=STOCK_ROOM_STAFF', { refreshInterval: 8000 })

  // actuals[movementId][lineId] = qty stock room can actually send
  const [actuals, setActuals] = useState<Record<number, Record<number, number>>>({})
  const [acting, setActing] = useState<number | null>(null)
  const [pendingMovement, setPendingMovement] = useState<Movement | null>(null)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()

  const getActual = (mId: number, lineId: number, requested: number) =>
    actuals[mId]?.[lineId] ?? requested

  const setActual = (mId: number, lineId: number, val: number) =>
    setActuals(prev => ({ ...prev, [mId]: { ...(prev[mId] ?? {}), [lineId]: val } }))

  const getShortfalls = (m: Movement) =>
    m.lines.filter(l => getActual(m.id, l.id, l.quantityRequested) < l.quantityRequested)

  const handleMarkReady = (m: Movement) => {
    const shortfalls = getShortfalls(m)
    if (shortfalls.length > 0) {
      setPendingMovement(m)
      onOpen()
    } else {
      confirmReady(m, false)
    }
  }

  const confirmReady = async (m: Movement, createFollowUp: boolean) => {
    onClose()
    setActing(m.id)
    const lineUpdates = m.lines.map(l => ({
      id: l.id,
      quantityActual: getActual(m.id, l.id, l.quantityRequested),
    }))
    const res = await fetch(`/api/events/${m.eventId}/movements/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'READY', lines: lineUpdates, createFollowUp }),
    })
    setActing(null)
    setPendingMovement(null)
    if (res.ok) {
      toast({
        title: createFollowUp
          ? '📦 Ready — follow-up request created for shortfall'
          : '📦 Marked as ready for collection',
        status: 'success', duration: 3000,
      })
      mutate('/api/inbox?role=STOCK_ROOM_STAFF')
    } else {
      const err = await res.json()
      toast({ title: err.error ?? 'Error', status: 'error', duration: 3000 })
    }
  }

  const shortfallLines = pendingMovement ? getShortfalls(pendingMovement) : []

  return (
    <Box minH="100vh" bg="gray.900" color="white" pb="80px">
      <AdminPreviewBanner roleLabel="Stock Room Staff" color="blue" />

      <Box bg="gray.800" px={4} py={4} borderBottom="1px" borderColor="gray.700">
        <HStack justify="space-between">
          <VStack align="start" spacing={0}>
            <Text fontSize="xs" color="gray.400">Logged in as</Text>
            <Heading size="md">🗄️ {name}</Heading>
          </VStack>
          <Button size="sm" variant="ghost" color="gray.400" onClick={() => signOut({ callbackUrl: '/login' })}>
            Sign out
          </Button>
        </HStack>
      </Box>

      {isLoading && <Center py={16}><Spinner size="xl" color="blue.400" /></Center>}

      <VStack align="stretch" spacing={4} px={4} pt={6}>
        <HStack>
          <Text fontSize="lg" fontWeight="bold">PREP QUEUE</Text>
          {movements.length > 0 && (
            <Badge colorScheme="blue" borderRadius="full" px={3} fontSize="md">{movements.length}</Badge>
          )}
        </HStack>

        {movements.length === 0 && !isLoading && (
          <Box bg="gray.800" borderRadius="2xl" p={8} textAlign="center">
            <Text fontSize="3xl" mb={2}>✅</Text>
            <Text color="gray.400" fontSize="lg">Queue is clear</Text>
            <Text color="gray.500" fontSize="sm">Nothing to prep right now</Text>
          </Box>
        )}

        {movements.map(m => {
          const timeAgo = Math.round((Date.now() - new Date(m.createdAt).getTime()) / 60000)
          const shortfalls = getShortfalls(m)
          const hasShortfall = shortfalls.length > 0
          const allZero = m.lines.every(l => getActual(m.id, l.id, l.quantityRequested) === 0)

          return (
            <Box key={m.id} bg="gray.800" borderRadius="2xl" overflow="hidden" border="2px"
              borderColor={hasShortfall ? 'orange.500' : 'blue.500'}>

              {/* Card header */}
              <Box bg={hasShortfall ? 'orange.700' : 'blue.600'} px={4} py={2}>
                <HStack justify="space-between">
                  <Text fontWeight="bold">FOR: {m.toBar?.name ?? 'Unknown Bar'}</Text>
                  <HStack spacing={2}>
                    {hasShortfall && (
                      <Badge colorScheme="red" fontSize="xs">⚠ Shortfall</Badge>
                    )}
                    <Text fontSize="xs" opacity={0.8}>{timeAgo}m ago</Text>
                  </HStack>
                </HStack>
                {m.toBar?.location && <Text fontSize="xs" opacity={0.9}>{m.toBar.location}</Text>}
              </Box>

              <Box px={4} py={3}>
                <Text fontSize="xs" color="gray.400" mb={3}>
                  Requested by {m.createdBy.name} — enter how many you can actually send:
                </Text>

                <VStack align="start" spacing={3} mb={4}>
                  {m.lines.map(line => {
                    const actual = getActual(m.id, line.id, line.quantityRequested)
                    const isShort = actual < line.quantityRequested
                    const isEmpty = actual === 0

                    return (
                      <Box
                        key={line.id} w="full" p={3} bg={isEmpty ? 'red.900' : isShort ? 'orange.900' : 'gray.700'}
                        borderRadius="xl" border="2px"
                        borderColor={isEmpty ? 'red.500' : isShort ? 'orange.500' : 'gray.600'}
                      >
                        <HStack justify="space-between" align="center">
                          <VStack align="start" spacing={0} flex={1}>
                            <Text fontSize="lg" fontWeight="semibold"
                              color={isEmpty ? 'red.300' : isShort ? 'orange.300' : 'white'}>
                              {line.product.name}
                            </Text>
                            <HStack spacing={2}>
                              <Text fontSize="xs" color="gray.400">
                                Requested: <Text as="span" fontWeight="bold" color="white">{line.quantityRequested}</Text>
                              </Text>
                              {isShort && (
                                <Badge colorScheme={isEmpty ? 'red' : 'orange'} fontSize="xs">
                                  {isEmpty ? 'Out of stock' : `${line.quantityRequested - actual} short`}
                                </Badge>
                              )}
                            </HStack>
                          </VStack>
                          <VStack align="end" spacing={1}>
                            <Text fontSize="xs" color="gray.400">Sending</Text>
                            <NumberInput
                              size="md" min={0} max={line.quantityRequested} w="90px"
                              value={actual}
                              onChange={(_, v) => setActual(m.id, line.id, isNaN(v) ? 0 : v)}
                            >
                              <NumberInputField
                                textAlign="center" fontWeight="black" fontSize="xl"
                                bg={isEmpty ? 'red.800' : isShort ? 'orange.800' : 'gray.600'}
                                borderColor={isEmpty ? 'red.500' : isShort ? 'orange.500' : 'gray.500'}
                                color={isEmpty ? 'red.200' : isShort ? 'orange.200' : 'white'}
                                px={2}
                              />
                              <NumberInputStepper>
                                <NumberIncrementStepper borderColor="gray.600" />
                                <NumberDecrementStepper borderColor="gray.600" />
                              </NumberInputStepper>
                            </NumberInput>
                          </VStack>
                        </HStack>
                      </Box>
                    )
                  })}
                </VStack>

                {m.notes && <Text fontSize="sm" color="yellow.300" mb={3}>📝 {m.notes}</Text>}

                <Button
                  w="full" size="lg"
                  colorScheme={allZero ? 'red' : hasShortfall ? 'orange' : 'blue'}
                  borderRadius="xl" fontSize="md" fontWeight="black" h="56px"
                  isLoading={acting === m.id}
                  isDisabled={allZero}
                  onClick={() => handleMarkReady(m)}
                >
                  {allZero
                    ? '✗ Nothing to send — out of stock'
                    : hasShortfall
                    ? `⚠ Send Partial (${shortfalls.length} item${shortfalls.length !== 1 ? 's' : ''} short)`
                    : '📦 STOCK IS READY FOR COLLECTION'}
                </Button>
              </Box>
            </Box>
          )
        })}
      </VStack>

      {/* Shortfall confirmation modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
        <ModalOverlay bg="rgba(0,0,0,0.7)" backdropFilter="blur(4px)" />
        <ModalContent bg="gray.800" border="1px" borderColor="orange.500" color="white" mx={4}>
          <ModalHeader borderBottom="1px" borderColor="gray.700">
            <HStack>
              <Text>⚠️</Text>
              <Text>Partial Stock — Shortfall</Text>
            </HStack>
          </ModalHeader>
          <ModalBody py={4}>
            <Text fontSize="sm" color="gray.300" mb={4}>
              You can't fully fulfil this order. These items will be short:
            </Text>
            <VStack align="stretch" spacing={2} mb={4}>
              {shortfallLines.map(line => {
                const actual = getActual(pendingMovement!.id, line.id, line.quantityRequested)
                const shortfall = line.quantityRequested - actual
                return (
                  <HStack key={line.id} bg="gray.700" borderRadius="lg" px={3} py={2} justify="space-between">
                    <Text fontWeight="semibold">{line.product.name}</Text>
                    <HStack spacing={3}>
                      <Text fontSize="sm" color="gray.400">
                        Sending <Text as="span" color="orange.300" fontWeight="bold">{actual}</Text> of {line.quantityRequested}
                      </Text>
                      <Badge colorScheme="red" fontSize="xs">{shortfall} short</Badge>
                    </HStack>
                  </HStack>
                )
              })}
            </VStack>
            <Text fontSize="sm" color="gray.400">
              Do you want to automatically create a new <Text as="span" color="yellow.300" fontWeight="bold">follow-up request</Text> for the missing items so the bar still gets them when stock becomes available?
            </Text>
          </ModalBody>
          <ModalFooter borderTop="1px" borderColor="gray.700" gap={2} flexDir="column">
            <Button
              w="full" colorScheme="orange" fontWeight="black" h="52px"
              onClick={() => confirmReady(pendingMovement!, true)}
            >
              📦 Send partial + create follow-up request
            </Button>
            <Button
              w="full" variant="outline" colorScheme="gray" fontWeight="bold"
              onClick={() => confirmReady(pendingMovement!, false)}
            >
              Send partial only — no follow-up
            </Button>
            <Button w="full" variant="ghost" size="sm" color="gray.500" onClick={onClose}>
              Cancel — go back and adjust
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
