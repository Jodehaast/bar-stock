import {
  Box, Button, FormControl, FormLabel, Heading, Input, InputGroup,
  InputRightElement, IconButton, Text, VStack, Alert, AlertIcon,
  FormErrorMessage, Flex,
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

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>()
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      const session = await getSession()
      const role = (session?.user as any)?.role
      const operationalRoles = ['BAR_STAFF', 'RUNNER', 'STOCK_ROOM_STAFF', 'SECTION_MANAGER']
      router.push(role && operationalRoles.includes(role) ? '/my-work' : '/events')
    }
  }

  return (
    <Flex
      minH="100vh"
      bg="app.bg"
      align="center"
      justify="center"
      px={4}
      position="relative"
    >
      {/* Subtle radial glow behind the card */}
      <Box
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        w="600px"
        h="600px"
        bgGradient="radial(rgba(255,193,7,0.06) 0%, transparent 70%)"
        pointerEvents="none"
      />

      <Box
        w="full"
        maxW="420px"
        bg="app.overlay"
        borderRadius="2xl"
        p={{ base: 8, md: 10 }}
        boxShadow="0 0 0 1px #252a38, 0 0 60px rgba(255,193,7,0.07), 0 24px 48px rgba(0,0,0,0.4)"
        position="relative"
      >
        {/* Wordmark */}
        <VStack spacing={1} mb={8} align="start">
          <Text fontWeight="800" fontSize="2xl" color="brand.400" letterSpacing="-0.03em" lineHeight={1}>
            BarStock
          </Text>
          <Text color="app.textMuted" fontSize="xs" fontWeight="500" textTransform="uppercase" letterSpacing="0.06em">
            DHL Stadium · Event Bar Management
          </Text>
        </VStack>

        <Heading size="md" color="app.textPrimary" fontWeight="700" mb={1}>
          Sign in
        </Heading>
        <Text fontSize="sm" color="app.textSecondary" mb={6}>
          Enter your credentials to access the dashboard
        </Text>

        {error && (
          <Alert status="error" mb={5} borderRadius="lg" bg="rgba(239,68,68,0.12)" border="1px solid" borderColor="rgba(239,68,68,0.3)" color="red.300">
            <AlertIcon color="red.400" />
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <VStack spacing={4}>
            <FormControl isInvalid={!!errors.email}>
              <FormLabel>Email address</FormLabel>
              <Input
                {...register('email', { required: 'Email is required' })}
                type="email"
                placeholder="you@example.com"
                size="lg"
              />
              <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.password}>
              <FormLabel>Password</FormLabel>
              <InputGroup size="lg">
                <Input
                  {...register('password', { required: 'Password is required' })}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  pr="48px"
                />
                <InputRightElement>
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    icon={<EyeIcon open={showPassword} />}
                    variant="ghost"
                    size="sm"
                    color="app.textMuted"
                    _hover={{ color: 'app.textSecondary', bg: 'transparent' }}
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  />
                </InputRightElement>
              </InputGroup>
              <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
            </FormControl>

            <Button
              type="submit"
              w="full"
              size="lg"
              isLoading={isSubmitting}
              loadingText="Signing in…"
              mt={2}
              bg="brand.400"
              color="gray.900"
              fontWeight="700"
              fontSize="sm"
              _hover={{ bg: 'brand.500' }}
              _active={{ bg: 'brand.600' }}
            >
              Sign In
            </Button>
          </VStack>
        </form>
      </Box>
    </Flex>
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
