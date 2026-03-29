import {
  VStack, Box, Text, Link, HStack, Icon, Divider,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import {
  CalendarIcon, ViewIcon, SettingsIcon, StarIcon, ArrowForwardIcon,
} from '@chakra-ui/icons'

interface NavItem {
  label: string
  href: string
  icon: any
  roles?: string[]
}

const NAV: NavItem[] = [
  { label: 'Events', href: '/events', icon: CalendarIcon },
  { label: 'Products', href: '/admin/products', icon: StarIcon, roles: ['ADMIN'] },
  { label: 'Users', href: '/admin/users', icon: SettingsIcon, roles: ['ADMIN'] },
]

function NavLink({ item, role }: { item: NavItem; role: string }) {
  const router = useRouter()
  const active = router.pathname.startsWith(item.href)
  if (item.roles && !item.roles.includes(role)) return null

  return (
    <Link
      as={NextLink}
      href={item.href}
      w="full"
      px={3} py={2}
      borderRadius="md"
      bg={active ? 'brand.500' : 'transparent'}
      color={active ? 'gray.900' : 'gray.300'}
      fontWeight={active ? 'semibold' : 'normal'}
      _hover={{ bg: active ? 'brand.400' : 'gray.700', textDecoration: 'none' }}
      fontSize="sm"
    >
      <HStack spacing={3}>
        <Icon as={item.icon} />
        <Text>{item.label}</Text>
      </HStack>
    </Link>
  )
}

export default function Sidebar() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role ?? 'VIEWER'

  return (
    <Box
      h="100vh"
      bg="gray.800"
      borderRight="1px"
      borderColor="gray.700"
      py={4}
      px={3}
      position="sticky"
      top={0}
      overflowY="auto"
    >
      <Box mb={6} px={2}>
        <Text fontWeight="bold" fontSize="lg" color="brand.400">
          BarStock
        </Text>
        <Text fontSize="xs" color="gray.500">DHL Stadium</Text>
      </Box>
      <Divider borderColor="gray.700" mb={4} />
      <VStack spacing={1} align="stretch">
        {NAV.map((item) => (
          <NavLink key={item.href} item={item} role={role} />
        ))}
      </VStack>
    </Box>
  )
}
