import {
  Box, Button, Heading, HStack, Table, Thead, Tbody, Tr, Th, Td,
  Badge, Switch, useToast, useDisclosure, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  FormControl, FormLabel, Input, Select, VStack,
} from '@chakra-ui/react'
import { AddIcon } from '@chakra-ui/icons'
import AppShell from '@/components/layout/AppShell'
import { requireAuth } from '@/lib/permissions'
import type { GetServerSideProps } from 'next'
import useSWR, { mutate } from 'swr'
import { useForm } from 'react-hook-form'
import { useState } from 'react'

interface Product {
  id: number; name: string; unit: string; category: string | null; isActive: boolean
}

interface FormData {
  name: string; unit: string; category: string
}

export default function ProductsPage() {
  const { data: products = [] } = useSWR<Product[]>('/api/products')
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormData>()
  const toast = useToast()

  const onSubmit = async (data: FormData) => {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      mutate('/api/products')
      toast({ title: 'Product added', status: 'success', duration: 2000 })
      reset(); onClose()
    } else {
      const err = await res.json()
      toast({ title: err.error, status: 'error', duration: 3000 })
    }
  }

  const toggleActive = async (product: Product) => {
    await fetch(`/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !product.isActive }),
    })
    mutate('/api/products')
  }

  const byCategory: Record<string, Product[]> = {}
  for (const p of products) {
    const cat = p.category ?? 'other'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(p)
  }

  return (
    <AppShell title="Products">
      <HStack justify="space-between" mb={6}>
        <Heading size="md">Product Catalogue</Heading>
        <Button leftIcon={<AddIcon />} size="sm" onClick={onOpen}>Add Product</Button>
      </HStack>

      {Object.entries(byCategory).map(([cat, items]) => (
        <Box key={cat} mb={6}>
          <Heading size="xs" color="gray.400" textTransform="uppercase" mb={2}>{cat}</Heading>
          <Box bg="gray.800" borderRadius="lg" overflow="hidden">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th color="gray.400">Name</Th>
                  <Th color="gray.400">Unit</Th>
                  <Th color="gray.400">Active</Th>
                </Tr>
              </Thead>
              <Tbody>
                {items.map((p) => (
                  <Tr key={p.id} opacity={p.isActive ? 1 : 0.5}>
                    <Td>{p.name}</Td>
                    <Td><Badge variant="subtle" colorScheme="gray">{p.unit}</Badge></Td>
                    <Td>
                      <Switch
                        isChecked={p.isActive}
                        colorScheme="brand"
                        onChange={() => toggleActive(p)}
                        size="sm"
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Box>
      ))}

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="gray.800">
          <ModalHeader>Add Product</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleSubmit(onSubmit)}>
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Name</FormLabel>
                  <Input {...register('name', { required: true })} bg="gray.700" borderColor="gray.600" />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Unit</FormLabel>
                  <Select {...register('unit', { required: true })} bg="gray.700" borderColor="gray.600">
                    <option value="bottle">Bottle</option>
                    <option value="can">Can</option>
                    <option value="keg">Keg</option>
                    <option value="case">Case</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Category</FormLabel>
                  <Select {...register('category')} bg="gray.700" borderColor="gray.600">
                    <option value="beer">Beer</option>
                    <option value="cider">Cider</option>
                    <option value="wine">Wine</option>
                    <option value="spirit">Spirit</option>
                    <option value="soft drink">Soft Drink</option>
                    <option value="other">Other</option>
                  </Select>
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter gap={3}>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" isLoading={isSubmitting}>Add</Button>
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
