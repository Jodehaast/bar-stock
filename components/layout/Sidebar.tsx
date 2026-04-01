import { Box, Flex, Text, Link, HStack, Icon, VStack, Avatar, IconButton, Tooltip } from '@chakra-ui/react'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { useSession, signOut } from 'next-auth/react'
import { CalendarIcon, BellIcon, SettingsIcon, StarIcon, CheckIcon, ViewIcon } from '@chakra-ui/icons'

export interface NavItem {
  label: string
  href: string
  icon: any
  roles?: string[]
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'My Work',  href: '/my-work',       icon: CheckIcon,    roles: ['BAR_STAFF', 'RUNNER', 'STOCK_ROOM_STAFF', 'SECTION_MANAGER'] },
  { label: 'Inbox',    href: '/inbox',          icon: BellIcon },
  { label: 'Events',   href: '/events',         icon: CalendarIcon },
  { label: 'Products', href: '/admin/products', icon: StarIcon,     roles: ['ADMIN'] },
  { label: 'Users',    href: '/admin/users',    icon: SettingsIcon, roles: ['ADMIN'] },
  { label: 'Preview',  href: '/admin/preview',  icon: BellIcon,     roles: ['ADMIN'] },
]

const ROLE_LABELS: Record<string, string> = {
  ADMIN:            'Admin',
  SECTION_MANAGER:  'Section Manager',
  STOCK_ROOM_STAFF: 'Stock Room',
  RUNNER:           'Runner',
  BAR_STAFF:        'Bar Staff',
  VIEWER:           'Viewer',
}

function NavLink({ item, role }: { item: NavItem; role: string }) {
  const router = useRouter()
  if (item.roles && !item.roles.includes(role)) return null
  const active = router.pathname === item.href || router.pathname.startsWith(item.href + '/')

  return (
    <Link
      as={NextLink}
      href={item.href}
      display="block"
      mx={2}
      px={3}
      py="10px"
      borderRadius="lg"
      textDecoration="none"
      transition="all 0.15s ease"
      fontWeight="500"
      fontSize="sm"
      borderLeft="3px solid"
      {...(active ? {
        bgGradient: 'linear(to-r, rgba(255,193,7,0.14), rgba(255,193,7,0.03))',
        color: 'brand.400',
        borderLeftColor: 'brand.400',
        pl: 'calc(0.75rem - 3px)',
      } : {
        color: 'app.textSecondary',
        borderLeftColor: 'transparent',
        _hover: { bg: 'app.sidebarHover', color: 'app.textPrimary', textDecoration: 'none' },
      })}
    >
      <HStack spacing={3}>
        <Icon as={item.icon} boxSize={4} flexShrink={0} />
        <Text>{item.label}</Text>
      </HStack>
    </Link>
  )
}

export default function Sidebar() {
  const { data: session } = useSession()
  const user = session?.user as any
  const role = user?.role ?? 'VIEWER'

  return (
    <Flex
      direction="column"
      w="240px"
      h="100vh"
      bg="app.sidebar"
      borderRight="1px solid"
      borderColor="app.border"
      position="sticky"
      top={0}
      flexShrink={0}
    >
      {/* Logo zone */}
      <Flex align="center" h="56px" px={5} borderBottom="1px solid" borderColor="app.border" flexShrink={0}>
        <Box>
          <Text fontWeight="800" fontSize="lg" color="brand.400" letterSpacing="-0.02em" lineHeight={1}>
            BarStock
          </Text>
          <Text fontSize="10px" color="app.textMuted" fontWeight="500" letterSpacing="0.06em" textTransform="uppercase" mt="2px">
            DHL Stadium
          </Text>
        </Box>
      </Flex>

      {/* Nav zone */}
      <Box flex={1} overflowY="auto" py={3}>
        <VStack spacing="2px" align="stretch">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} role={role} />
          ))}
        </VStack>
      </Box>

      {/* User zone */}
      {user && (
        <Flex
          align="center"
          px={3}
          py={3}
          gap={2}
          borderTop="1px solid"
          borderColor="app.border"
          flexShrink={0}
        >
          <Avatar size="sm" name={user.name} bg="brand.400" color="gray.900" fontWeight="700" flexShrink={0} />
          <Box flex={1} minW={0}>
            <Text fontSize="sm" fontWeight="600" color="app.textPrimary" isTruncated lineHeight={1.4}>
              {user.name}
            </Text>
            <Text fontSize="xs" color="app.textMuted" lineHeight={1.4}>
              {ROLE_LABELS[role] ?? role}
            </Text>
          </Box>
          <Tooltip label="Sign out" placement="top" hasArrow={false}>
            <IconButton
              aria-label="Sign out"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              }
              size="xs"
              variant="ghost"
              color="app.textMuted"
              _hover={{ color: 'app.textSecondary', bg: 'app.hover' }}
              onClick={() => signOut({ callbackUrl: '/login' })}
              flexShrink={0}
            />
          </Tooltip>
        </Flex>
      )}
    </Flex>
  )
}
