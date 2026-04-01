import { Box, HStack, Text, Button } from '@chakra-ui/react'
import NextLink from 'next/link'
import { useSession } from 'next-auth/react'

interface Props {
  /** The role whose screen is being previewed, e.g. "Bar Staff" */
  roleLabel: string
  /** Accent colour that matches the screen's colour scheme */
  color?: string
}

/**
 * Shown at the top of each my-work screen when the logged-in user is an ADMIN.
 * Lets them know they are in a preview and offers a quick route back to the hub.
 */
export default function AdminPreviewBanner({ roleLabel, color = 'yellow' }: Props) {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role

  if (role !== 'ADMIN') return null

  return (
    <Box
      position="sticky"
      top={0}
      zIndex={100}
      bg={`${color}.700`}
      borderBottom="2px"
      borderColor={`${color}.500`}
      px={4}
      py={2}
    >
      <HStack justify="space-between" wrap="wrap" gap={2}>
        <HStack spacing={2}>
          <Text fontSize="sm" fontWeight="bold" color={`${color}.100`}>
            👁 ADMIN PREVIEW
          </Text>
          <Text fontSize="sm" color={`${color}.200`}>
            — you are viewing the <Text as="span" fontWeight="bold">{roleLabel}</Text> screen
          </Text>
        </HStack>
        <Button
          as={NextLink}
          href="/admin/preview"
          size="xs"
          variant="outline"
          colorScheme={color}
          color={`${color}.100`}
          borderColor={`${color}.400`}
          _hover={{ bg: `${color}.600` }}
        >
          ← Back to Preview Hub
        </Button>
      </HStack>
    </Box>
  )
}
