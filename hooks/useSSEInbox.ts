import { useEffect, useRef, useState } from 'react'

/**
 * Connects to the SSE inbox stream and returns live movement data.
 * Falls back to empty array while connecting; the parent can also
 * keep a SWR call as a safety net for initial hydration.
 */
export function useSSEInbox<T = unknown[]>() {
  const [data, setData] = useState<T | null>(null)
  const [connected, setConnected] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const connect = () => {
      const es = new EventSource('/api/sse/inbox')
      esRef.current = es

      es.onopen = () => setConnected(true)

      es.onmessage = (e) => {
        try {
          setData(JSON.parse(e.data) as T)
        } catch { /* ignore parse errors */ }
      }

      es.onerror = () => {
        setConnected(false)
        es.close()
        // Reconnect after 5 seconds
        setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      esRef.current?.close()
    }
  }, [])

  return { data, connected }
}
