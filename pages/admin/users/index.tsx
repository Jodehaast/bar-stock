import {
  Box, Button, Heading, HStack, Table, Thead, Tbody, Tr, Th, Td,
  useToast, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton, FormControl, FormLabel,
  Input, Select, VStack, IconButton,
} from '@chakra-ui/react'
import { AddIcon, DeleteIcon } from '@chakra-ui/icons'
import AppShell from '@/components/layout/AppShell'
import StatusBadge from '@/components/common/StatusBadge'
import { requireAuth } from '@/lib/permissions'
import type { GetServerSideProps } from 'next'
import useSWR, { mutate } from 'swr'
import { useForm } from 'react-hook-form'
import { useSession } from 'next-auth/react'

interface User {
  id: number; email: string; name: string; role: string; createdAt: string
}

interface FormData {
  email: string; password: string; name: string; role: string
}

export default function UsersPage() {
  const { data: users = [] } = useSWR<User[]>('/api/users')
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormData>()
  const { data: session } = useSession()
  const currentUserId = (session?.user as any)?.id
  const toast = useToast()

  const onSubmit = async (data: FormData) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      mutate('/api/users')
      toast({ title: 'User created', status: 'success', duration: 2000 })
      reset(); onClose()
    } else {
      const err = await res.json()
      toast({ title: err.error, status: 'error', duration: 3000 })
    }
  }

  const deleteUser = async (id: number) => {
    if (!confirm('Delete this user?')) return
    await fetch(`/api/users/${id}`, { method: 'DELETE' })
    mutate('/api/users')
    toast({ title: 'User deleted', status: 'info', duration: 2000 })
  }

  return (
    <AppShell title="Users">
      <HStack justify="space-between" mb={6}>
        <Heading size="md">Users</Heading>
        <Button leftIcon={<AddIcon />} size="sm" onClick={onOpen}>Add User</Button>
      </HStack>

      <Box bg="gray.800" borderRadius="lg" overflow="hidden">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th color="gray.400">Name</Th>
              <Th color="gray.400">Email</Th>
              <Th color="gray.400">Role</Th>
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            {users.map((u) => (
              <Tr key={u.id}>
                <Td fontWeight="medium">{u.name}</Td>
                <Td color="gray.400" fontSize="sm">{u.email}</Td>
                <Td><StatusBadge value={u.role} type="role" /></Td>
                <Td textAlign="right">
                  {String(u.id) !== String(currentUserId) && (
                    <IconButton
                      aria-label="Delete"
                      icon={<DeleteIcon />}
                      size="xs"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => deleteUser(u.id)}
                    />
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="gray.800">
          <ModalHeader>Add User</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleSubmit(onSubmit)}>
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Name</FormLabel>
                  <Input {...register('name', { required: true })} bg="gray.700" borderColor="gray.600" />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Email</FormLabel>
                  <Input {...register('email', { required: true })} type="email" bg="gray.700" borderColor="gray.600" />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Password</FormLabel>
                  <Input {...register('password', { required: true })} type="password" bg="gray.700" borderColor="gray.600" />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Role</FormLabel>
                  <Select {...register('role', { required: true })} bg="gray.700" borderColor="gray.600">
                    <option value="ADMIN">Admin</option>
                    <option value="BAR_MANAGER">Bar Manager</option>
                    <option value="RUNNER">Runner</option>
                    <option value="VIEWER">Viewer</option>
                  </Select>
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter gap={3}>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" isLoading={isSubmitting}>Create</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </AppShell>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const redirect = await requireAuth(ctx)
  if (redirect) return redirect
  return { props: {} }
}
