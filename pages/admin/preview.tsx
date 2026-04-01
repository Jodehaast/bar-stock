import {
  Box, Button, Grid, Heading, HStack, Text, VStack,
  Badge, Divider, Breadcrumb, BreadcrumbItem, BreadcrumbLink,
} from '@chakra-ui/react'
import { ChevronRightIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import NextLink from 'next/link'
import AppShell from '@/components/layout/AppShell'
import { requireRole } from '@/lib/permissions'
import type { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface RoleCard {
  role: string
  label: string
  emoji: string
  color: string
  href: string
  description: string
  canDo: string[]
  cannotDo: string[]
  dataNote: string
}

const ROLE_CARDS: RoleCard[] = [
  {
    role: 'BAR_STAFF',
    label: 'Bar Staff',
    emoji: '🍺',
    color: 'purple',
    href: '/my-work/bar',
    description: 'Works at a bar or suite. Submits restock requests and tracks their status in real-time.',
    canDo: [
      'Submit restock requests for their bar',
      'Track status of their own requests (PENDING → DELIVERED)',
      'View their own request history',
    ],
    cannotDo: [
      'See other bars\' requests',
      'Approve or action any requests',
      'Access the admin event dashboard',
    ],
    dataNote: 'Inbox shows requests created by the logged-in bar staff user only.',
  },
  {
    role: 'SECTION_MANAGER',
    label: 'Section Manager',
    emoji: '👔',
    color: 'yellow',
    href: '/my-work/manager',
    description: 'Approves or rejects incoming restock requests from their section\'s bars.',
    canDo: [
      'See all PENDING requests across active events',
      'Approve → sends to stock room prep queue',
      'Reject → notifies bar staff',
      'Access event dashboard & movements list',
    ],
    cannotDo: [
      'Mark stock as READY or IN_TRANSIT',
      'Create new movements',
      'Access admin-only pages',
    ],
    dataNote: 'Inbox shows all PENDING movements across active events.',
  },
  {
    role: 'STOCK_ROOM_STAFF',
    label: 'Stock Room Staff',
    emoji: '🗄️',
    color: 'blue',
    href: '/my-work/stockroom',
    description: 'Preps approved orders in the stock room. Ticks off each item and marks the order READY for collection.',
    canDo: [
      'See all APPROVED requests (prep queue)',
      'Tick off individual items as they are packed',
      'Mark order as READY for runner to collect',
    ],
    cannotDo: [
      'Approve or reject requests',
      'Deliver stock themselves',
      'Access admin pages',
    ],
    dataNote: 'Inbox shows all APPROVED movements across active events.',
  },
  {
    role: 'RUNNER',
    label: 'Runner',
    emoji: '🏃',
    color: 'orange',
    href: '/my-work/runner',
    description: 'Collects prepped stock from the stock room and delivers it to the correct bar or suite.',
    canDo: [
      'See all READY orders → mark as IN_TRANSIT (collected)',
      'See all IN_TRANSIT orders → mark as DELIVERED',
      'View delivery location for each order',
    ],
    cannotDo: [
      'Approve or prep stock',
      'Create movements',
      'Access admin pages',
    ],
    dataNote: 'Inbox shows READY and IN_TRANSIT movements across active events.',
  },
]

export default function AdminPreviewHub() {
  return (
    <AppShell title="Role Preview">
      <VStack align="stretch" spacing={6}>
        <Breadcrumb separator={<ChevronRightIcon color="gray.500" />} fontSize="sm" color="gray.400">
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href="/events">Events</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem isCurrentPage><BreadcrumbLink>Role Preview</BreadcrumbLink></BreadcrumbItem>
        </Breadcrumb>

        <Box>
          <Heading size="md" mb={1}>Role Preview Hub</Heading>
          <Text color="gray.400" fontSize="sm">
            Preview exactly what each team member sees on their device. The banner on each screen confirms you are in admin preview mode.
          </Text>
        </Box>

        <Divider borderColor="gray.700" />

        <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={5}>
          {ROLE_CARDS.map((card) => (
            <Box
              key={card.role}
              bg="gray.800"
              borderRadius="xl"
              overflow="hidden"
              border="1px"
              borderColor="gray.700"
            >
              {/* Card header */}
              <Box bg={`${card.color}.900`} borderBottom="1px" borderColor={`${card.color}.700`} px={5} py={4}>
                <HStack justify="space-between" align="start">
                  <HStack spacing={3}>
                    <Text fontSize="2xl">{card.emoji}</Text>
                    <VStack align="start" spacing={0}>
                      <Heading size="sm" color={`${card.color}.200`}>{card.label}</Heading>
                      <Badge colorScheme={card.color} fontSize="xs" variant="subtle">{card.role}</Badge>
                    </VStack>
                  </HStack>
                  <Button
                    as={NextLink}
                    href={card.href}
                    size="sm"
                    colorScheme={card.color}
                    rightIcon={<ExternalLinkIcon />}
                    flexShrink={0}
                  >
                    Preview
                  </Button>
                </HStack>
                <Text fontSize="sm" color={`${card.color}.300`} mt={3}>{card.description}</Text>
              </Box>

              {/* Card body */}
              <Box px={5} py={4}>
                <VStack align="stretch" spacing={4}>
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" color="green.400" textTransform="uppercase" mb={2}>
                      ✓ Can do
                    </Text>
                    <VStack align="start" spacing={1}>
                      {card.canDo.map((item, i) => (
                        <Text key={i} fontSize="sm" color="gray.300">• {item}</Text>
                      ))}
                    </VStack>
                  </Box>
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" color="red.400" textTransform="uppercase" mb={2}>
                      ✗ Cannot do
                    </Text>
                    <VStack align="start" spacing={1}>
                      {card.cannotDo.map((item, i) => (
                        <Text key={i} fontSize="sm" color="gray.500">• {item}</Text>
                      ))}
                    </VStack>
                  </Box>
                  <Box bg="gray.750" borderRadius="lg" px={3} py={2} borderLeft="3px solid" borderColor="gray.500">
                    <Text fontSize="xs" color="gray.400">
                      <Text as="span" fontWeight="bold" color="gray.300">Note: </Text>
                      {card.dataNote}
                    </Text>
                  </Box>
                </VStack>
              </Box>
            </Box>
          ))}
        </Grid>

        <Divider borderColor="gray.700" />

        {/* QR page note */}
        <Box bg="gray.800" borderRadius="xl" p={5} border="1px" borderColor="gray.700">
          <HStack justify="space-between" align="start" wrap="wrap" gap={4}>
            <VStack align="start" spacing={1}>
              <HStack>
                <Text fontSize="xl">📱</Text>
                <Heading size="sm">QR Bar Screen (public — no login)</Heading>
              </HStack>
              <Text fontSize="sm" color="gray.400">
                Each bar/suite has a unique QR code. Scanning it opens a public screen where bar staff can confirm opening stock or submit a restock without logging in.
                To preview it, go to QR Codes on any event page and click a bar's QR link.
              </Text>
            </VStack>
            <Button
              as={NextLink}
              href="/events"
              size="sm"
              variant="outline"
              rightIcon={<ExternalLinkIcon />}
              flexShrink={0}
            >
              Go to Events → QR Codes
            </Button>
          </HStack>
        </Box>
      </VStack>
    </AppShell>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions)
  if (!session) return { redirect: { destination: '/login', permanent: false } }
  const role = (session.user as any)?.role
  if (role !== 'ADMIN') return { redirect: { destination: '/events', permanent: false } }
  return { props: {} }
}
