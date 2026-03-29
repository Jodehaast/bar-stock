import type { AppProps } from 'next/app'
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import { SessionProvider } from 'next-auth/react'
import { SWRConfig } from 'swr'
import theme from '@/theme'

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error('Request failed')
  return r.json()
})

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <SessionProvider session={session}>
        <ChakraProvider theme={theme}>
          <SWRConfig value={{ fetcher, revalidateOnFocus: false }}>
            <Component {...pageProps} />
          </SWRConfig>
        </ChakraProvider>
      </SessionProvider>
    </>
  )
}
