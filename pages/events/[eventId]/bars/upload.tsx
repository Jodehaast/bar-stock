import {
  Box, Button, Heading, HStack, Text, VStack, useToast,
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, Table, Thead, Tbody,
  Tr, Th, Td, Badge, Alert, AlertIcon, Divider, Tag,
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

interface Event { id: number; name: string }

interface ParsedBar {
  name: string
  location: string
  level: string
  foyer: string
  responsibleCompany: string
  stockType: string
  barType: string
}

export default function BarsUploadPage() {
  const router = useRouter()
  const { eventId } = router.query
  const { data: event } = useSWR<Event>(eventId ? `/api/events/${eventId}` : null)
  const [parsed, setParsed] = useState<ParsedBar[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped: any[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const downloadTemplate = () => {
    const headers = ['Name', 'Location', 'Level', 'Foyer', 'Responsible Company', 'Stock Type', 'Bar Type']
    const examples = [
      ['5100W', 'Level 5 - West', 'Level 5', 'A', '', 'PAID', 'BAR'],
      ['5101W', 'Level 5 - West', 'Level 5', 'A', 'Tops Bar Co', 'COMP', 'BAR'],
      ['Section A Store', 'Level 5 - West', 'Level 5', 'A', '', 'PAID', 'STOCK_ROOM'],
    ]
    const ws = XLSX.utils.aoa_to_sheet([headers, ...examples])
    // Set column widths
    ws['!cols'] = [20, 22, 12, 8, 22, 14, 14].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Bars')
    XLSX.writeFile(wb, 'bars-template.xlsx')
  }

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (r) => processRows(r.data as any[]),
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        processRows(XLSX.utils.sheet_to_json(ws) as any[])
      }
      reader.readAsArrayBuffer(file)
    } else {
      toast({ title: 'Please upload a .csv or .xlsx file', status: 'error', duration: 3000 })
    }
  }

  const processRows = (rows: any[]) => {
    const errs: string[] = []
    const results: ParsedBar[] = []
    rows.forEach((row, i) => {
      const name = String(row['Name'] ?? row['name'] ?? row['Suite Number'] ?? row['suite number'] ?? '').trim()
      if (!name) { errs.push(`Row ${i + 2}: missing Name`); return }
      results.push({
        name,
        location: String(row['Location'] ?? row['Primary Location'] ?? row['location'] ?? '').trim(),
        level: String(row['Level'] ?? row['level'] ?? '').trim(),
        foyer: String(row['Foyer'] ?? row['foyer'] ?? '').trim(),
        responsibleCompany: String(row['Responsible Company'] ?? row['responsible company'] ?? '').trim(),
        stockType: String(row['Stock Type'] ?? row['stock type'] ?? 'PAID').trim().toUpperCase() || 'PAID',
        barType: String(row['Bar Type'] ?? row['bar type'] ?? 'BAR').trim().toUpperCase() || 'BAR',
      })
    })
    setParsed(results)
    setErrors(errs)
    setResult(null)
  }

  const submit = async () => {
    if (parsed.length === 0) return
    setLoading(true)
    const res = await fetch(`/api/events/${eventId}/bars/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bars: parsed }),
    })
    setLoading(false)
    if (res.ok) {
      const data = await res.json()
      setResult(data)
      toast({ title: `${data.created} bars created`, status: 'success', duration: 3000 })
    } else {
      const err = await res.json()
      toast({ title: err.error ?? 'Error', status: 'error', duration: 3000 })
    }
  }

  const stockTypeColor = (t: string) => t === 'COMP' ? 'purple' : t === 'MIXED' ? 'yellow' : 'green'
  const barTypeColor = (t: string) => t === 'STOCK_ROOM' ? 'orange' : 'blue'

  return (
    <AppShell title="Upload Bars">
      <VStack align="stretch" spacing={6} maxW="900px">
        <Breadcrumb separator={<ChevronRightIcon color="gray.500" />} fontSize="sm" color="gray.400">
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href="/events">Events</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem><BreadcrumbLink as={NextLink} href={`/events/${eventId}`}>{event?.name}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbItem isCurrentPage><BreadcrumbLink>Upload Bars</BreadcrumbLink></BreadcrumbItem>
        </Breadcrumb>

        <Heading size="md">Bulk Upload Bars</Heading>
        <Text color="gray.400" fontSize="sm">
          Upload a spreadsheet with all your bars in one go — suites, stock rooms, whatever the layout. Download the template, fill it in, upload it back.
        </Text>

        <Box bg="gray.800" borderRadius="xl" p={4} border="1px" borderColor="gray.700">
          <Text fontSize="sm" fontWeight="semibold" mb={2}>Template columns:</Text>
          <HStack wrap="wrap" gap={2}>
            {['Name *', 'Location', 'Level', 'Foyer', 'Responsible Company', 'Stock Type (PAID/COMP/MIXED)', 'Bar Type (BAR/STOCK_ROOM)'].map(col => (
              <Tag key={col} size="sm" colorScheme={col.includes('*') ? 'red' : 'gray'}>{col}</Tag>
            ))}
          </HStack>
          <Text fontSize="xs" color="gray.500" mt={2}>
            Tip: For DHL Stadium suites, use Suite Number as Name and fill Level + Foyer columns for easy filtering later.
          </Text>
        </Box>

        <HStack>
          <Button leftIcon={<DownloadIcon />} variant="outline" size="sm" onClick={downloadTemplate}>
            Download Template (.xlsx)
          </Button>
          <Button size="sm" colorScheme="brand" onClick={() => fileRef.current?.click()}>
            Upload File (.csv or .xlsx)
          </Button>
          <input
            ref={fileRef} type="file" accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = '' }}
          />
        </HStack>

        {errors.length > 0 && (
          <Alert status="warning" borderRadius="lg">
            <AlertIcon />
            <VStack align="start" spacing={0}>
              <Text fontWeight="semibold" fontSize="sm">{errors.length} row(s) skipped:</Text>
              {errors.map((e, i) => <Text key={i} fontSize="xs">{e}</Text>)}
            </VStack>
          </Alert>
        )}

        {result && (
          <Alert status="success" borderRadius="lg">
            <AlertIcon />
            <Text fontSize="sm">
              <strong>{result.created} bars created.</strong>
              {result.skipped.length > 0 && ` ${result.skipped.length} skipped (already exist or invalid).`}
            </Text>
          </Alert>
        )}

        {parsed.length > 0 && !result && (
          <>
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.400">
                <strong>{parsed.length}</strong> bars ready · {parsed.filter(b => b.barType === 'STOCK_ROOM').length} stock rooms · {parsed.filter(b => b.barType === 'BAR').length} bars
              </Text>
              <Button variant="ghost" size="sm" onClick={() => { setParsed([]); setErrors([]) }}>Clear</Button>
            </HStack>

            <Box bg="gray.800" borderRadius="xl" border="1px" borderColor="gray.700" overflow="hidden">
              <Box overflowX="auto">
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th color="gray.400">#</Th>
                      <Th color="gray.400">Name</Th>
                      <Th color="gray.400">Location</Th>
                      <Th color="gray.400">Level</Th>
                      <Th color="gray.400">Foyer</Th>
                      <Th color="gray.400">Company</Th>
                      <Th color="gray.400">Stock Type</Th>
                      <Th color="gray.400">Bar Type</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {parsed.map((bar, i) => (
                      <Tr key={i}>
                        <Td color="gray.500" fontSize="xs">{i + 1}</Td>
                        <Td fontWeight="medium">{bar.name}</Td>
                        <Td color="gray.400" fontSize="xs">{bar.location || '—'}</Td>
                        <Td color="gray.400" fontSize="xs">{bar.level || '—'}</Td>
                        <Td color="gray.400" fontSize="xs">{bar.foyer || '—'}</Td>
                        <Td color="gray.400" fontSize="xs">{bar.responsibleCompany || '—'}</Td>
                        <Td><Badge colorScheme={stockTypeColor(bar.stockType)} fontSize="xs">{bar.stockType}</Badge></Td>
                        <Td><Badge colorScheme={barTypeColor(bar.barType)} fontSize="xs">{bar.barType === 'STOCK_ROOM' ? 'Stock Room' : 'Bar'}</Badge></Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Box>

            <HStack justify="flex-end">
              <Button colorScheme="green" isLoading={loading} onClick={submit} size="md">
                Create {parsed.length} Bars
              </Button>
            </HStack>
          </>
        )}

        {result && (
          <HStack justify="flex-end">
            <Button as={NextLink} href={`/events/${eventId}`} colorScheme="brand">
              Back to Event
            </Button>
          </HStack>
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
