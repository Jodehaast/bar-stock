import { Drawer, DrawerOverlay, DrawerContent, DrawerBody } from '@chakra-ui/react'
import Sidebar from './Sidebar'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function MobileNav({ isOpen, onClose }: Props) {
  return (
    <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="xs">
      <DrawerOverlay bg="rgba(0,0,0,0.65)" backdropFilter="blur(4px)" />
      <DrawerContent bg="app.sidebar" maxW="240px" boxShadow="none" borderRight="1px solid" borderColor="app.border">
        <DrawerBody p={0} onClick={onClose}>
          <Sidebar />
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  )
}
