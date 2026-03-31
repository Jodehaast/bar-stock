import { Box, Flex, useDisclosure, IconButton, HStack, Text, Badge } from '@chakra-ui/react'
import { useSession } from 'next-auth/react'
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
    <Flex minH="100vh" bg="app.bg">
      {/* Desktop sidebar */}
      <Box display={{ base: 'none', lg: 'block' }} flexShrink={0}>
        <Sidebar />
      </Box>

      {/* Mobile nav drawer */}
      <MobileNav isOpen={isOpen} onClose={onClose} />

      {/* Main content column */}
      <Flex flex={1} direction="column" overflow="hidden" minW={0}>
        {/* Glassmorphism topbar */}
        <HStack
          h="56px"
          px={4}
          bg="rgba(13,15,20,0.85)"
          backdropFilter="blur(12px)"
          borderBottom="1px solid"
          borderColor="app.borderStrong"
          justify="space-between"
          position="sticky"
          top={0}
          zIndex={10}
          flexShrink={0}
        >
          <HStack spacing={3}>
            <IconButton
              display={{ base: 'flex', lg: 'none' }}
              aria-label="Open menu"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              }
              variant="ghost"
              size="sm"
              onClick={onOpen}
              color="app.textSecondary"
            />
            {/* BarStock wordmark on mobile (where sidebar is hidden) */}
            <Text
              display={{ base: 'block', lg: 'none' }}
              fontWeight="800"
              fontSize="md"
              color="brand.400"
              letterSpacing="-0.02em"
            >
              BarStock
            </Text>
            {title && (
              <Text
                display={{ base: 'none', lg: 'block' }}
                fontWeight="600"
                fontSize="sm"
                color="app.textPrimary"
              >
                {title}
              </Text>
            )}
          </HStack>

          {user && (
            <HStack spacing={2}>
              <Badge
                display={{ base: 'none', sm: 'flex' }}
                colorScheme="yellow"
                variant="subtle"
                fontSize="xs"
                px={2}
                py={0.5}
              >
                {user.role?.replace(/_/g, ' ')}
              </Badge>
              <Text fontSize="sm" color="app.textSecondary" display={{ base: 'none', md: 'block' }}>
                {user.name}
              </Text>
            </HStack>
          )}
        </HStack>

        {/* Page content */}
        <Box flex={1} bg="app.canvas" p={{ base: 4, md: 6, lg: 8 }} overflowY="auto">
          {children}
        </Box>
      </Flex>
    </Flex>
  )
}
