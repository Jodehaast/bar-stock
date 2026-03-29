import {
  Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerBody,
} from '@chakra-ui/react'
import Sidebar from './Sidebar'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function MobileNav({ isOpen, onClose }: Props) {
  return (
    <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="xs">
      <DrawerOverlay />
      <DrawerContent bg="gray.800" maxW="220px">
        <DrawerCloseButton color="gray.400" />
        <DrawerBody p={0}>
          <Sidebar />
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  )
}
