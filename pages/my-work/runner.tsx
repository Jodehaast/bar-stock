import { Box, Button, Heading, HStack, Text, VStack, Badge, Divider, Spinner, Center } from '@chakra-ui/react'
import { signOut, useSession } from 'next-auth/react'
import AdminPreviewBanner from '@/components/common/AdminPreviewBanner'
import { requireAuth } from '@/lib/permissions'
import type { GetServerSideProps } from 'next'
import useSWR, { mutate } from 'swr'
import { useState } from 'react'

interface Movement {
  id: number
  status: string
  type: string
  notes: string | null
  createdAt: string
  eventId: number
  fromBar: { id: number; name: string; location: string | null } | null
  toBar: { id: number; name: string; location: string | null } | null
  lines: { id: number; quantityRequested: number; quantityActual: number | null; product: { name: string; unit: string } }[]
}

export default function RunnerScreen() {
  const { data: session } = useSession()
  const name = (session?.user as any)?.name ?? 'Runner'
  const { data: movements = [], isLoading } = useSWR<Movement[]>('/api/inbox?role=RUNNER', { refreshInterval: 10000 })
  const [acting, setActing] = useState<number | null>(null)

  const toCollect = movements.filter(m => m.status === 'READY')
  const toDeliver = movements.filter(m => m.status === 'IN_TRANSIT')

  const act = async (m: Movement, status: string) => {
    setActing(m.id)
    await fetch(`/api/events/${m.eventId}/movements/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setActing(null)
    mutate('/api/inbox?role=RUNNER')
  }

  return (
    <Box minH="100vh" bg="gray.900" color="white" pb="80px">
      <AdminPreviewBanner roleLabel="Runner" color="orange" />
      {/* Header */}
      <Box bg="gray.800" px={4} py={4} borderBottom="1px" borderColor="gray.700">
        <HStack justify="space-between">
          <VStack align="start" spacing={0}>
            <Text fontSize="xs" color="gray.400">Logged in as</Text>
            <Heading size="md">🏃 {name}</Heading>
          </VStack>
          <Button size="sm" variant="ghost" color="gray.400" onClick={() => signOut({ callbackUrl: '/login' })}>
            Sign out
          </Button>
        </HStack>
      </Box>

      {isLoading && <Center py={16}><Spinner size="xl" color="orange.400" /></Center>}

      <VStack align="stretch" spacing={6} px={4} pt={6}>

        {/* COLLECT SECTION */}
        <Box>
          <HStack mb={3}>
            <Text fontSize="lg" fontWeight="bold">📦 COLLECT</Text>
            {toCollect.length > 0 && (
              <Badge colorScheme="orange" borderRadius="full" px={3} fontSize="md">{toCollect.length}</Badge>
            )}
          </HStack>

          {toCollect.length === 0 ? (
            <Box bg="gray.800" borderRadius="2xl" p={5} textAlign="center">
              <Text color="gray.500" fontSize="lg">Nothing to collect right now</Text>
            </Box>
          ) : (
            <VStack spacing={3}>
              {toCollect.map(m => (
                <Box key={m.id} bg="gray.800" borderRadius="2xl" overflow="hidden" w="full"
                  border="2px" borderColor="orange.500">
                  <Box bg="orange.500" px={4} py={2}>
                    <Text fontWeight="bold" fontSize="sm">
                      COLLECT FROM: {m.fromBar?.name ?? 'Central Store'}
                    </Text>
                    {m.fromBar?.location && (
                      <Text fontSize="xs" opacity={0.9}>{m.fromBar.location}</Text>
                    )}
                  </Box>
                  <Box px={4} py={3}>
                    <Text fontSize="xs" color="gray.400" mb={2}>
                      DELIVER TO: <Text as="span" fontWeight="bold" color="white">{m.toBar?.name ?? '—'}</Text>
                      {m.toBar?.location && <Text as="span" color="gray.400"> · {m.toBar.location}</Text>}
                    </Text>
                    <VStack align="start" spacing={1} mb={4}>
                      {m.lines.map(line => (
                        <HStack key={line.id}>
                          <Text fontSize="xl" fontWeight="black" color="orange.300" minW="40px">
                            {line.quantityRequested}×
                          </Text>
                          <Text fontSize="lg" fontWeight="semibold">{line.product.name}</Text>
                        </HStack>
                      ))}
                    </VStack>
                    {m.notes && (
                      <Text fontSize="sm" color="yellow.300" mb={3}>📝 {m.notes}</Text>
                    )}
                    <Button
                      w="full" size="lg" colorScheme="orange" borderRadius="xl"
                      fontSize="md" fontWeight="black" h="56px"
                      isLoading={acting === m.id}
                      onClick={() => act(m, 'IN_TRANSIT')}
                    >
                      ✅ I&apos;VE COLLECTED IT
                    </Button>
                  </Box>
                </Box>
              ))}
            </VStack>
          )}
        </Box>

        <Divider borderColor="gray.700" />

        {/* DELIVER SECTION */}
        <Box>
          <HStack mb={3}>
            <Text fontSize="lg" fontWeight="bold">🚚 DELIVER</Text>
            {toDeliver.length > 0 && (
              <Badge colorScheme="green" borderRadius="full" px={3} fontSize="md">{toDeliver.length}</Badge>
            )}
          </HStack>

          {toDeliver.length === 0 ? (
            <Box bg="gray.800" borderRadius="2xl" p={5} textAlign="center">
              <Text color="gray.500" fontSize="lg">Nothing to deliver right now</Text>
            </Box>
          ) : (
            <VStack spacing={3}>
              {toDeliver.map(m => (
                <Box key={m.id} bg="gray.800" borderRadius="2xl" overflow="hidden" w="full"
                  border="2px" borderColor="green.500">
                  <Box bg="green.600" px={4} py={2}>
                    <Text fontWeight="bold" fontSize="sm">
                      DELIVER TO: {m.toBar?.name ?? '—'}
                    </Text>
                    {m.toBar?.location && (
                      <Text fontSize="xs" opacity={0.9}>{m.toBar.location}</Text>
                    )}
                  </Box>
                  <Box px={4} py={3}>
                    <VStack align="start" spacing={1} mb={4}>
                      {m.lines.map(line => (
                        <HStack key={line.id}>
                          <Text fontSize="xl" fontWeight="black" color="green.300" minW="40px">
                            {line.quantityRequested}×
                          </Text>
                          <Text fontSize="lg" fontWeight="semibold">{line.product.name}</Text>
                        </HStack>
                      ))}
                    </VStack>
                    {m.notes && (
                      <Text fontSize="sm" color="yellow.300" mb={3}>📝 {m.notes}</Text>
                    )}
                    <Button
                      w="full" size="lg" colorScheme="green" borderRadius="xl"
                      fontSize="md" fontWeight="black" h="56px"
                      isLoading={acting === m.id}
                      onClick={() => act(m, 'DELIVERED')}
                    >
                      ✅ DELIVERED
                    </Button>
                  </Box>
                </Box>
              ))}
            </VStack>
          )}
        </Box>

      </VStack>
    </Box>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const redirect = await requireAuth(ctx)
  if (redirect) return redirect
  return { props: {} }
}
