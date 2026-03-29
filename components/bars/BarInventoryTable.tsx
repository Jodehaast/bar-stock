import {
  Table, Thead, Tbody, Tr, Th, Td, Box, Text, Badge,
} from '@chakra-ui/react'

interface InventoryRow {
  id: number
  openingQuantity: number
  currentQuantity: number
  product: { name: string; unit: string; category: string | null }
}

interface Props {
  inventory: InventoryRow[]
}

export default function BarInventoryTable({ inventory }: Props) {
  if (inventory.length === 0) {
    return <Text color="gray.500" fontSize="sm">No stock allocated yet.</Text>
  }

  const byCategory: Record<string, InventoryRow[]> = {}
  for (const row of inventory) {
    const cat = row.product.category ?? 'other'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(row)
  }

  return (
    <>
      {Object.entries(byCategory).map(([cat, rows]) => (
        <Box key={cat} mb={4}>
          <Text fontSize="xs" color="gray.500" textTransform="uppercase" fontWeight="semibold" mb={1}>{cat}</Text>
          <Box bg="gray.800" borderRadius="lg" overflow="hidden">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th color="gray.400">Product</Th>
                  <Th color="gray.400" isNumeric>Opening</Th>
                  <Th color="gray.400" isNumeric>Current</Th>
                  <Th color="gray.400" isNumeric>Variance</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((row) => {
                  const variance = row.currentQuantity - row.openingQuantity
                  return (
                    <Tr key={row.id}>
                      <Td>
                        <Text fontWeight="medium">{row.product.name}</Text>
                        <Text fontSize="xs" color="gray.500">{row.product.unit}</Text>
                      </Td>
                      <Td isNumeric color="gray.300">{row.openingQuantity}</Td>
                      <Td isNumeric fontWeight="semibold">{row.currentQuantity}</Td>
                      <Td isNumeric>
                        <Text color={variance > 0 ? 'green.400' : variance < 0 ? 'red.400' : 'gray.400'}>
                          {variance > 0 ? '+' : ''}{variance}
                        </Text>
                      </Td>
                    </Tr>
                  )
                })}
              </Tbody>
            </Table>
          </Box>
        </Box>
      ))}
    </>
  )
}
