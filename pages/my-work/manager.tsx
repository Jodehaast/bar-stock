import { Box, Button, Heading, HStack, Text, VStack, Badge, Spinner, Center } from '@chakra-ui/react'
import { signOut, useSession } from 'next-auth/react'
import AdminPreviewBanner from '@/components/common/AdminPreviewBanner'
import { requireAuth } from '@/lib/permissions'
import type { GetServerSideProps } from 'next'
import useSWR, { mutate } from 'swr'
import { useState } from 'react'

interface Movement {
  id: number; status: string; notes: string | null; createdAt: string; eventId: number
  fromBar: { id: number; name: string; location: string | null } | null
  toBar: { id: number; name: string; location: string | null } | null
  createdBy: { name: string }
  lines: { id: number; quantityRequested: number; product: { name: string; unit: string } }[]
}

export default function ManagerScreen() {
  const { data: session } = useSession()
  const name = (session?.user as any)?.name ?? 'Manager'
  const { data: movements = [], isLoading } = useSWR<Movement[]>('/api/inbox?role=SECTION_MANAGER', { refreshInterval: 10000 })
  const [acting, setActing] = useState<{ id: number; action: string } | null>(null)

  const act = async (m: Movement, status: string) => {
    setActing({ id: m.id, action: status })
    await fetch(`/api/events/${m.eventId}/movements/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setActing(null)
    mutate('/api/inbox?role=SECTION_MANAGER')
  }

  return (
    <Box minH="100vh" bg="gray.900" color="white" pb="80px">
      <AdminPreviewBanner roleLabel="Section Manager" color="yellow" />
      <Box bg="gray.800" px={4} py={4} borderBottom="1px" borderColor="gray.700">
        <HStack justify="space-between">
          <VStack align="start" spacing={0}>
            <Text fontSize="xs" color="gray.400">Logged in as</Text>
            <Heading size="md">👔 {name}</Heading>
          </VStack>
          <Button size="sm" variant="ghost" color="gray.400" onClick={() => signOut({ callbackUrl: '/login' })}>
            Sign out
          </Button>
        </HStack>
      </Box>

      {isLoading && <Center py={16}><Spinner size="xl" color="yellow.400" /></Center>}

      <VStack align="stretch" spacing={4} px={4} pt={6}>
        <HStack>
          <Text fontSize="lg" fontWeight="bold">PENDING APPROVAL</Text>
          {movements.length > 0 && (
            <Badge colorScheme="yellow" borderRadius="full" px={3} fontSize="md">{movements.length}</Badge>
          )}
        </HStack>

        {movements.length === 0 && !isLoading && (
          <Box bg="gray.800" borderRadius="2xl" p={8} textAlign="center">
            <Text fontSize="3xl" mb={2}>✅</Text>
            <Text color="gray.400" fontSize="lg">All clear</Text>
            <Text color="gray.500" fontSize="sm">No requests waiting for approval</Text>
          </Box>
        )}

        {movements.map(m => {
          const timeAgo = Math.round((Date.now() - new Date(m.createdAt).getTime()) / 60000)
          const isActing = acting?.id === m.id
          return (
            <Box key={m.id} bg="gray.800" borderRadius="2xl" overflow="hidden" border="2px" borderColor="yellow.500">
              <Box bg="yellow.600" px={4} py={2}>
                <HStack justify="space-between">
                  <Text fontWeight="bold" color="gray.900">
                    {m.toBar?.name ?? m.fromBar?.name ?? 'Unknown Bar'}
                  </Text>
                  <Text fontSize="xs" color="gray.800">{timeAgo}m ago</Text>
                </HStack>
                {(m.toBar?.location ?? m.fromBar?.location) && (
                  <Text fontSize="xs" color="gray.800">{m.toBar?.location ?? m.fromBar?.location}</Text>
                )}
              </Box>
              <Box px={4} py={3}>
                <Text fontSize="xs" color="gray.400" mb={3}>Requested by {m.createdBy.name}</Text>
                <VStack align="start" spacing={1} mb={3}>
                  {m.lines.map(line => (
                    <HStack key={line.id}>
                      <Text fontSize="xl" fontWeight="black" color="yellow.300" minW="40px">
                        {line.quantityRequested}×
                      </Text>
                      <Text fontSize="lg" fontWeight="semibold">{line.product.name}</Text>
                    </HStack>
                  ))}
                </VStack>
                {m.notes && <Text fontSize="sm" color="yellow.300" mb={3}>📝 {m.notes}</Text>}
                <HStack spacing={3}>
                  <Button
                    flex={1} size="lg" colorScheme="red" variant="outline"
                    borderRadius="xl" fontWeight="black" h="56px"
                    isLoading={isActing && acting?.action === 'REJECTED'}
                    onClick={() => act(m, 'REJECTED')}
                  >
                    ✗ REJECT
                  </Button>
                  <Button
                    flex={2} size="lg" colorScheme="green"
                    borderRadius="xl" fontWeight="black" h="56px"
                    isLoading={isActing && acting?.action === 'APPROVED'}
                    onClick={() => act(m, 'APPROVED')}
                  >
                    ✓ APPROVE
                  </Button>
                </HStack>
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
