import {
  Box, Button, FormControl, FormLabel, Heading, HStack,
  Input, Select, VStack, useToast, Breadcrumb, BreadcrumbItem, BreadcrumbLink,
} from '@chakra-ui/react'
import { ChevronRightIcon } from '@chakra-ui/icons'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import AppShell from '@/components/layout/AppShell'
import { requireAuth } from '@/lib/permissions'
import type { GetServerSideProps } from 'next'
import { useForm } from 'react-hook-form'
import useSWR from 'swr'

interface FormData {
  name: string; location: string; responsibleCompany: string; managerId: string; stockType: string; barType: string
}
interface User { id: number; name: string; role: string }

export default function NewBarPage() {
  const router = useRouter()
  const { eventId } = router.query
  const { data: users = [] } = useSWR<User[]>('/api/users')
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>()
  const toast = useToast()

  const managers = users.filter((u) => ['ADMIN', 'SECTION_MANAGER'].includes(u.role))

  const onSubmit = async (data: FormData) => {
    const res = await fetch(`/api/events/${eventId}/bars`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, managerId: data.managerId || null, stockType: data.stockType || 'PAID', barType: data.barType || 'BAR' }),
    })
    if (res.ok) {
      toast({ title: 'Bar added', status: 'success', duration: 2000 })
      router.push(`/events/${eventId}`)
    } else {
      const err = await res.json()
      toast({ title: err.error, status: 'error', duration: 3000 })
    }
  }

  return (
    <AppShell title="Add Bar">
      <VStack align="stretch" spacing={6} maxW="480px">
        <Breadcrumb separator={<ChevronRightIcon color="gray.500" />} fontSize="sm" color="gray.400">
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href="/events">Events</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href={`/events/${eventId}`}>Event</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem isCurrentPage><BreadcrumbLink>Add Bar</BreadcrumbLink></BreadcrumbItem>
        </Breadcrumb>
        <Heading size="md">Add Bar</Heading>
        <Box bg="gray.800" borderRadius="xl" p={6}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Bar Name</FormLabel>
                <Input {...register('name', { required: true })} bg="gray.700" borderColor="gray.600" placeholder="e.g. North Stand Bar" />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Location</FormLabel>
                <Input {...register('location')} bg="gray.700" borderColor="gray.600" placeholder="e.g. Level 2, North Stand" />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Responsible Company</FormLabel>
                <Input {...register('responsibleCompany')} bg="gray.700" borderColor="gray.600" placeholder="e.g. Cape Bar Co." />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Stock Type</FormLabel>
                <Select {...register('stockType')} bg="gray.700" borderColor="gray.600" defaultValue="PAID">
                  <option value="PAID">Paid</option>
                  <option value="COMP">Comp</option>
                  <option value="MIXED">Mixed</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Bar Type</FormLabel>
                <Select {...register('barType')} bg="gray.700" borderColor="gray.600" defaultValue="BAR">
                  <option value="BAR">Bar (serving drinks)</option>
                  <option value="STOCK_ROOM">Stock Room (section store)</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Bar Manager</FormLabel>
                <Select {...register('managerId')} bg="gray.700" borderColor="gray.600">
                  <option value="">— Unassigned —</option>
                  {managers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </Select>
              </FormControl>
              <HStack w="full" justify="flex-end" pt={2}>
                <Button as={NextLink} href={`/events/${eventId}`} variant="ghost">Cancel</Button>
                <Button type="submit" isLoading={isSubmitting}>Add Bar</Button>
              </HStack>
            </VStack>
          </form>
        </Box>
      </VStack>
    </AppShell>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const redirect = await requireAuth(ctx)
  if (redirect) return redirect
  return { props: {} }
}
