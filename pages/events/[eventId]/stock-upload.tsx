import {
  Box, Button, Heading, HStack, Text, VStack, useToast,
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, Table, Thead, Tbody,
  Tr, Th, Td, Alert, AlertIcon,
} from '@chakra-ui/react'
import { ChevronRightIcon, DownloadIcon } from '@chakra-ui/icons'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import AppShell from '@/components/layout/AppShell'
import { requireAuth } from '@/lib/permissions'
import type { GetServerSideProps } from 'next'
import useSWR from 'swr'
import { useRef, useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

interface Event { id: number; name: string; venue: string }
interface Product { id: number; name: string; unit: string; category: string | null; isActive: boolean }
interface ParsedRow { productId: number; productName: string; unit: string; category: string | null; quantity: number }

export default function StockUploadPage() {
  const router = useRouter()
  const { eventId } = router.query
  const { data: event } = useSWR<Event>(eventId ? `/api/events/${eventId}` : null)
  const { data: products = [] } = useSWR<Product[]>('/api/products')
  const [parsed, setParsed] = useState<ParsedRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  // Build product lookup map (lowercase name → product)
  const productMap = new Map(products.map((p) => [p.name.toLowerCase().trim(), p]))

  const downloadTemplate = () => {
    const rows = [['Product Name', 'Quantity'], ...products.filter(p => p.isActive).map(p => [p.name, '0'])]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Stock')
    XLSX.writeFile(wb, 'stock-template.xlsx')
  }

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => processRows(result.data as any[]),
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws) as any[]
        processRows(rows)
      }
      reader.readAsArrayBuffer(file)
    } else {
      toast({ title: 'Please upload a .csv or .xlsx file', status: 'error', duration: 3000 })
    }
  }

  const processRows = (rows: any[]) => {
    const errs: string[] = []
    const results: ParsedRow[] = []
    rows.forEach((row, i) => {
      const name = String(row['Product Name'] ?? row['product name'] ?? row['name'] ?? '').trim()
      const qty = Number(row['Quantity'] ?? row['quantity'] ?? row['qty'] ?? 0)
      if (!name) { errs.push(`Row ${i + 2}: missing product name`); return }
      if (isNaN(qty) || qty < 0) { errs.push(`Row ${i + 2}: invalid quantity for "${name}"`); return }
      const product = productMap.get(name.toLowerCase())
      if (!product) { errs.push(`Row ${i + 2}: unknown product "${name}" — check spelling`); return }
      results.push({ productId: product.id, productName: product.name, unit: product.unit, category: product.category, quantity: qty })
    })
    setParsed(results)
    setErrors(errs)
  }

  const submit = async () => {
    if (parsed.length === 0) return
    setLoading(true)
    const res = await fetch(`/api/events/${eventId}/central-stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: parsed.map(r => ({ productId: r.productId, quantity: r.quantity })) }),
    })
    setLoading(false)
    if (res.ok) {
      toast({ title: `${parsed.length} products saved to central store`, status: 'success', duration: 2000 })
      router.push(`/events/${eventId}/central-stock`)
    } else {
      const err = await res.json()
      toast({ title: err.error ?? 'Error saving', status: 'error', duration: 3000 })
    }
  }

  const byCategory: Record<string, ParsedRow[]> = {}
  for (const row of parsed) {
    const cat = row.category ?? 'other'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(row)
  }

  return (
    <AppShell title="Upload Opening Stock">
      <VStack align="stretch" spacing={6} maxW="700px">
        <Breadcrumb separator={<ChevronRightIcon color="gray.500" />} fontSize="sm" color="gray.400">
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href="/events">Events</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href={`/events/${eventId}`}>{event?.name}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem isCurrentPage><BreadcrumbLink>Upload Opening Stock</BreadcrumbLink></BreadcrumbItem>
        </Breadcrumb>

        <Heading size="md">Upload Opening Stock</Heading>
        <Text color="gray.400" fontSize="sm">
          Upload your total stock count for this event before it&apos;s distributed to bars. Download the template, fill in quantities, then upload it back.
        </Text>

        <HStack>
          <Button leftIcon={<DownloadIcon />} variant="outline" size="sm" onClick={downloadTemplate}>
            Download Template (.xlsx)
          </Button>
          <Button size="sm" onClick={() => fileRef.current?.click()} colorScheme="brand">
            Upload File (.csv or .xlsx)
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
          />
        </HStack>

        {errors.length > 0 && (
          <Alert status="warning" borderRadius="lg">
            <AlertIcon />
            <VStack align="start" spacing={0}>
              <Text fontWeight="semibold" fontSize="sm">{errors.length} row(s) could not be matched:</Text>
              {errors.map((e, i) => <Text key={i} fontSize="xs">{e}</Text>)}
            </VStack>
          </Alert>
        )}

        {parsed.length > 0 && (
          <>
            <Text fontSize="sm" color="gray.400">{parsed.length} products ready to import:</Text>
            {Object.entries(byCategory).map(([cat, rows]) => (
              <Box key={cat}>
                <Text fontSize="xs" color="gray.500" textTransform="uppercase" fontWeight="semibold" mb={2}>{cat}</Text>
                <Box bg="gray.800" borderRadius="lg" overflow="hidden" border="1px" borderColor="gray.700">
                  <Table size="sm">
                    <Thead><Tr>
                      <Th color="gray.400">Product</Th>
                      <Th color="gray.400" isNumeric>Quantity</Th>
                    </Tr></Thead>
                    <Tbody>
                      {rows.map((row) => (
                        <Tr key={row.productId}>
                          <Td>
                            <Text fontWeight="medium">{row.productName}</Text>
                            <Text fontSize="xs" color="gray.500">{row.unit}</Text>
                          </Td>
                          <Td isNumeric fontWeight="semibold">{row.quantity}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </Box>
            ))}
            <HStack justify="flex-end" pt={2}>
              <Button variant="ghost" onClick={() => { setParsed([]); setErrors([]) }}>Clear</Button>
              <Button colorScheme="green" isLoading={loading} onClick={submit}>
                Save to Central Store
              </Button>
            </HStack>
          </>
        )}
      </VStack>
    </AppShell>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const redirect = await requireAuth(ctx)
  if (redirect) return redirect
  return { props: {} }
}
