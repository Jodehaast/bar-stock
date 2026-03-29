import {
  Box, Flex, useDisclosure, IconButton, HStack, Text, Avatar, Menu,
  MenuButton, MenuList, MenuItem, Divider,
} from '@chakra-ui/react'
import { HamburgerIcon } from '@chakra-ui/icons'
import { useSession, signOut } from 'next-auth/react'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'

interface Props {
  children: React.ReactNode
  title?: string
}

export default function AppShell({ children, title }: Props) {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { data: session } = useSession()
  const user = session?.user as any

  return (
    <Flex minH="100vh" bg="gray.900">
      {/* Desktop sidebar */}
      <Box display={{ base: 'none', md: 'block' }} w="220px" flexShrink={0}>
        <Sidebar />
      </Box>

      {/* Mobile nav drawer */}
      <MobileNav isOpen={isOpen} onClose={onClose} />

      {/* Main content */}
      <Flex flex={1} direction="column" overflow="hidden">
        {/* Topbar */}
        <HStack
          px={4} py={3} bg="gray.800" borderBottom="1px" borderColor="gray.700"
          justify="space-between" position="sticky" top={0} zIndex={10}
        >
          <HStack>
            <IconButton
              display={{ base: 'flex', md: 'none' }}
              aria-label="Open menu"
              icon={<HamburgerIcon />}
              variant="ghost"
              onClick={onOpen}
              size="sm"
            />
            {title && (
              <Text fontWeight="semibold" fontSize="md" color="gray.100">
                {title}
              </Text>
            )}
          </HStack>
          {user && (
            <Menu>
              <MenuButton>
                <HStack spacing={2} cursor="pointer">
                  <Avatar size="xs" name={user.name} bg="brand.500" color="gray.900" />
                  <Text fontSize="sm" color="gray.300" display={{ base: 'none', sm: 'block' }}>
                    {user.name}
                  </Text>
                </HStack>
              </MenuButton>
              <MenuList bg="gray.800" borderColor="gray.700">
                <MenuItem bg="gray.800" isDisabled>
                  <Text fontSize="xs" color="gray.400">{user.email}</Text>
                </MenuItem>
                <Divider borderColor="gray.700" />
                <MenuItem bg="gray.800" onClick={() => signOut({ callbackUrl: '/login' })}>
                  Sign out
                </MenuItem>
              </MenuList>
            </Menu>
          )}
        </HStack>

        {/* Page content */}
        <Box flex={1} p={{ base: 4, md: 6 }} overflowY="auto">
          {children}
        </Box>
      </Flex>
    </Flex>
  )
}
