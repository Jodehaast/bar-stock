import {
  Table, Thead, Tbody, Tr, Th, Td, Box, Text,
} from '@chakra-ui/react'

interface InventoryRow {
  id: number
  openingQuantity: number
  currentQuantity: number
  openingTots: number
  currentTots: number
  product: { name: string; unit: string; category: string | null; totsPerBottle: number | null }
}

interface Props {
  inventory: InventoryRow[]
}

function formatQty(bottles: number, tots: number, totsPerBottle: number | null) {
  if (!totsPerBottle) return String(bottles)
  if (tots === 0) return `${bottles} btl`
  return `${bottles} btl + ${tots} tots`
}

function toTotalTots(bottles: number, tots: number, totsPerBottle: number) {
  return bottles * totsPerBottle + tots
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
                  const tpb = row.product.totsPerBottle
                  const openingDisplay = formatQty(row.openingQuantity, row.openingTots, tpb)
                  const currentDisplay = formatQty(row.currentQuantity, row.currentTots, tpb)
                  let varianceDisplay: string
                  let varianceColor: string
                  if (tpb) {
                    const openTotal = toTotalTots(row.openingQuantity, row.openingTots, tpb)
                    const curTotal = toTotalTots(row.currentQuantity, row.currentTots, tpb)
                    const v = curTotal - openTotal
                    varianceDisplay = `${v > 0 ? '+' : ''}${v} tots`
                    varianceColor = v > 0 ? 'green.400' : v < 0 ? 'red.400' : 'gray.400'
                  } else {
                    const v = row.currentQuantity - row.openingQuantity
                    varianceDisplay = `${v > 0 ? '+' : ''}${v}`
                    varianceColor = v > 0 ? 'green.400' : v < 0 ? 'red.400' : 'gray.400'
                  }
                  return (
                    <Tr key={row.id}>
                      <Td>
                        <Text fontWeight="medium">{row.product.name}</Text>
                        <Text fontSize="xs" color="gray.500">
                          {row.product.unit}{tpb ? ` · ${tpb} tots/btl` : ''}
                        </Text>
                      </Td>
                      <Td isNumeric color="gray.300">{openingDisplay}</Td>
                      <Td isNumeric fontWeight="semibold">{currentDisplay}</Td>
                      <Td isNumeric>
                        <Text color={varianceColor}>{varianceDisplay}</Text>
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
