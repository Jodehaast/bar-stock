import {
  Box, Button, FormControl, FormLabel, Heading, Input,
  Text, VStack, Alert, AlertIcon, FormErrorMessage,
} from '@chakra-ui/react'
import { signIn, getSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { useRouter } from 'next/router'
import type { GetServerSideProps } from 'next'

interface FormData {
  email: string
  password: string
}

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>()
  const [error, setError] = useState('')
  const router = useRouter()

  const onSubmit = async (data: FormData) => {
    setError('')
    const result = await signIn('credentials', {
      redirect: false,
      email: data.email.toLowerCase(),
      password: data.password,
    })
    if (result?.error) {
      setError('Invalid email or password')
    } else {
      // Get session to determine role
      const session = await getSession()
      const role = (session?.user as any)?.role
      const operationalRoles = ['BAR_STAFF', 'RUNNER', 'STOCK_ROOM_STAFF', 'SECTION_MANAGER']
      if (role && operationalRoles.includes(role)) {
        router.push('/my-work')
      } else {
        router.push('/events')
      }
    }
  }

  return (
    <Box minH="100vh" bg="gray.900" display="flex" alignItems="center" justifyContent="center" px={4}>
      <Box bg="gray.800" p={8} borderRadius="xl" w="full" maxW="400px" shadow="xl">
        <VStack spacing={1} mb={8} align="start">
          <Heading size="lg" color="brand.400">BarStock</Heading>
          <Text color="gray.400" fontSize="sm">DHL Stadium Bar Management</Text>
        </VStack>

        {error && (
          <Alert status="error" mb={4} borderRadius="md" bg="red.900">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <VStack spacing={4}>
            <FormControl isInvalid={!!errors.email}>
              <FormLabel fontSize="sm" color="gray.300">Email</FormLabel>
              <Input
                {...register('email', { required: 'Email is required' })}
                type="email"
                bg="gray.700"
                border="1px"
                borderColor="gray.600"
                _hover={{ borderColor: 'gray.500' }}
                _focus={{ borderColor: 'brand.400', boxShadow: 'none' }}
                placeholder="you@example.com"
              />
              <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.password}>
              <FormLabel fontSize="sm" color="gray.300">Password</FormLabel>
              <Input
                {...register('password', { required: 'Password is required' })}
                type="password"
                bg="gray.700"
                border="1px"
                borderColor="gray.600"
                _hover={{ borderColor: 'gray.500' }}
                _focus={{ borderColor: 'brand.400', boxShadow: 'none' }}
              />
              <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
            </FormControl>

            <Button
              type="submit"
              w="full"
              isLoading={isSubmitting}
              colorScheme="brand"
              mt={2}
            >
              Sign In
            </Button>
          </VStack>
        </form>
      </Box>
    </Box>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getSession(ctx)
  if (session) {
    const role = (session?.user as any)?.role
    const operationalRoles = ['BAR_STAFF', 'RUNNER', 'STOCK_ROOM_STAFF', 'SECTION_MANAGER']
    if (role && operationalRoles.includes(role)) {
      return { redirect: { destination: '/my-work', permanent: false } }
    }
    return { redirect: { destination: '/events', permanent: false } }
  }
  return { props: {} }
}
