import {
  Box, Button, Grid, Heading, HStack, Text, VStack, Badge,
  useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton, FormControl, FormLabel,
  Input, Textarea, useToast,
} from '@chakra-ui/react'
import { AddIcon, CalendarIcon } from '@chakra-ui/icons'
import NextLink from 'next/link'
import AppShell from '@/components/layout/AppShell'
import StatusBadge from '@/components/common/StatusBadge'
import EmptyState from '@/components/common/EmptyState'
import { requireAuth, isAdmin } from '@/lib/permissions'
import type { GetServerSideProps } from 'next'
import useSWR, { mutate } from 'swr'
import { useForm } from 'react-hook-form'
import { useSession } from 'next-auth/react'

interface Event {
  id: number; name: string; date: string; venue: string
  status: string; notes: string | null
  _count: { bars: number }
}

interface FormData { name: string; date: string; venue: string; notes?: string }

export default function EventsPage() {
  const { data: events = [] } = useSWR<Event[]>('/api/events')
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormData>()
  const { data: session } = useSession()
  const toast = useToast()
  const admin = isAdmin(session)

  const onSubmit = async (data: FormData) => {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      mutate('/api/events')
      toast({ title: 'Event created', status: 'success', duration: 2000 })
      reset(); onClose()
    } else {
      const err = await res.json()
      toast({ title: err.error, status: 'error', duration: 3000 })
    }
  }

  return (
    <AppShell title="Events">
      <HStack justify="space-between" mb={6}>
        <Heading size="md">Events</Heading>
        {admin && (
          <Button leftIcon={<AddIcon />} size="sm" onClick={onOpen}>New Event</Button>
        )}
      </HStack>

      {events.length === 0 ? (
        <EmptyState message="No events yet. Create one to get started." />
      ) : (
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={4}>
          {events.map((event) => (
            <Box
              key={event.id}
              as={NextLink}
              href={`/events/${event.id}`}
              bg="gray.800"
              borderRadius="xl"
              p={5}
              border="1px"
              borderColor="gray.700"
              _hover={{ borderColor: 'brand.500', textDecoration: 'none' }}
              transition="border-color 0.15s"
              display="block"
            >
              <VStack align="start" spacing={2}>
                <HStack justify="space-between" w="full">
                  <StatusBadge value={event.status} type="event" />
                  <Text fontSize="xs" color="gray.500">
                    {new Date(event.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </HStack>
                <Text fontWeight="semibold" fontSize="md" color="gray.100">{event.name}</Text>
                <Text fontSize="sm" color="gray.400">{event.venue}</Text>
                <HStack spacing={1} color="gray.500" fontSize="xs">
                  <CalendarIcon />
                  <Text>{event._count.bars} bar{event._count.bars !== 1 ? 's' : ''}</Text>
                </HStack>
              </VStack>
            </Box>
          ))}
        </Grid>
      )}

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="gray.800">
          <ModalHeader>New Event</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleSubmit(onSubmit)}>
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Event Name</FormLabel>
                  <Input {...register('name', { required: true })} bg="gray.700" borderColor="gray.600" placeholder="e.g. DHL Newlands Cup 2026" />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Date</FormLabel>
                  <Input {...register('date', { required: true })} type="date" bg="gray.700" borderColor="gray.600" />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Venue</FormLabel>
                  <Input {...register('venue', { required: true })} bg="gray.700" borderColor="gray.600" placeholder="DHL Stadium, Cape Town" />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Notes</FormLabel>
                  <Textarea {...register('notes')} bg="gray.700" borderColor="gray.600" rows={2} />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter gap={3}>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" isLoading={isSubmitting}>Create Event</Button>
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
