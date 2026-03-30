import { Box, Button, Heading, HStack, Text, VStack, Badge, Spinner, Center } from '@chakra-ui/react'
import { signOut, useSession } from 'next-auth/react'
import { requireAuth } from '@/lib/permissions'
import type { GetServerSideProps } from 'next'
import useSWR, { mutate } from 'swr'
import { useState } from 'react'

interface Movement {
  id: number; status: string; notes: string | null; createdAt: string; eventId: number
  toBar: { id: number; name: string; location: string | null } | null
  createdBy: { name: string }
  lines: { id: number; quantityRequested: number; product: { name: string; unit: string } }[]
}

export default function StockRoomScreen() {
  const { data: session } = useSession()
  const name = (session?.user as any)?.name ?? 'Stock Room'
  const { data: movements = [], isLoading } = useSWR<Movement[]>('/api/inbox?role=STOCK_ROOM_STAFF', { refreshInterval: 10000 })
  const [acting, setActing] = useState<number | null>(null)
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const markReady = async (m: Movement) => {
    setActing(m.id)
    await fetch(`/api/events/${m.eventId}/movements/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'READY' }),
    })
    setActing(null)
    mutate('/api/inbox?role=STOCK_ROOM_STAFF')
  }

  const toggleCheck = (key: string) => setChecked(p => ({ ...p, [key]: !p[key] }))

  return (
    <Box minH="100vh" bg="gray.900" color="white" pb="80px">
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
          const allChecked = m.lines.every(l => checked[`${m.id}-${l.id}`])
          const timeAgo = Math.round((Date.now() - new Date(m.createdAt).getTime()) / 60000)
          return (
            <Box key={m.id} bg="gray.800" borderRadius="2xl" overflow="hidden" border="2px" borderColor="blue.500">
              <Box bg="blue.600" px={4} py={2}>
                <HStack justify="space-between">
                  <Text fontWeight="bold">FOR: {m.toBar?.name ?? 'Unknown Bar'}</Text>
                  <Text fontSize="xs" opacity={0.8}>{timeAgo}m ago</Text>
                </HStack>
                {m.toBar?.location && <Text fontSize="xs" opacity={0.9}>{m.toBar.location}</Text>}
              </Box>
              <Box px={4} py={3}>
                <Text fontSize="xs" color="gray.400" mb={3}>Requested by {m.createdBy.name} · Tap each item when packed:</Text>
                <VStack align="start" spacing={3} mb={4}>
                  {m.lines.map(line => {
                    const key = `${m.id}-${line.id}`
                    const done = checked[key]
                    return (
                      <HStack
                        key={line.id} w="full" p={3} bg={done ? 'green.900' : 'gray.700'}
                        borderRadius="xl" cursor="pointer" onClick={() => toggleCheck(key)}
                        border="2px" borderColor={done ? 'green.500' : 'gray.600'}
                      >
                        <Text fontSize="2xl">{done ? '✅' : '⬜'}</Text>
                        <Text fontSize="xl" fontWeight="black" color={done ? 'green.300' : 'white'} minW="40px">
                          {line.quantityRequested}×
                        </Text>
                        <Text fontSize="lg" fontWeight="semibold" textDecoration={done ? 'line-through' : 'none'}
                          color={done ? 'gray.400' : 'white'}>
                          {line.product.name}
                        </Text>
                      </HStack>
                    )
                  })}
                </VStack>
                {m.notes && <Text fontSize="sm" color="yellow.300" mb={3}>📝 {m.notes}</Text>}
                <Button
                  w="full" size="lg" colorScheme={allChecked ? 'blue' : 'gray'}
                  borderRadius="xl" fontSize="md" fontWeight="black" h="56px"
                  isLoading={acting === m.id}
                  onClick={() => markReady(m)}
                >
                  {allChecked ? '📦 STOCK IS READY FOR COLLECTION' : 'MARK AS READY'}
                </Button>
              </Box>
            </Box>
          )
        })}
      </VStack>
    </Box>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const redirect = await requireAuth(ctx)
  if (redirect) return redirect
  return { props: {} }
}
