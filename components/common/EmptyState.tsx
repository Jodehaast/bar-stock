import { VStack, Text, Icon } from '@chakra-ui/react'
import { WarningTwoIcon } from '@chakra-ui/icons'

interface Props {
  message?: string
}

export default function EmptyState({ message = 'Nothing here yet.' }: Props) {
  return (
    <VStack py={12} spacing={3} color="gray.500">
      <Icon as={WarningTwoIcon} boxSize={8} />
      <Text>{message}</Text>
    </VStack>
  )
}
