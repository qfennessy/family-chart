/**
 * Performance Benchmarks for Handler Functions
 *
 * These benchmarks measure the performance of layout helper functions,
 * particularly the sorting functions that have O(n) lookups in comparators.
 *
 * Key bottlenecks being measured:
 * 1. sortChildrenWithSpouses - calls otherParent() inside sort comparator
 * 2. otherParent - O(n) lookup using data.find() inside comparator
 * 3. calculateDelay - recalculates max depth on every call
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { sortChildrenWithSpouses } from '../../src/layout/handlers'
import calculateTree from '../../src/layout/calculate-tree'
import { calculateDelay } from '../../src/handlers/general'
import {
  generateWideTree,
  generateComplexTree,
  generateLargeFlat,
} from './test-data-generator'
import type { Data, Datum } from '../../src/types/data'

function measureTime(fn: () => void, iterations: number = 1): { mean: number; min: number; max: number } {
  const times: number[] = []

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    fn()
    const end = performance.now()
    times.push(end - start)
  }

  times.sort((a, b) => a - b)
  const total = times.reduce((a, b) => a + b, 0)

  return {
    mean: total / times.length,
    min: times[0],
    max: times[times.length - 1],
  }
}

function formatTime(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}µs`
  if (ms < 1000) return `${ms.toFixed(2)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

describe('Handler Functions Performance Benchmarks', () => {
  const datasets: Record<string, Data> = {}

  beforeAll(() => {
    console.log('\n========================================')
    console.log('HANDLER FUNCTIONS BENCHMARKS')
    console.log('========================================\n')

    // Wide trees have many children to sort
    datasets.wide_small = generateWideTree(3, 5, 3)
    datasets.wide_medium = generateWideTree(3, 8, 4)
    datasets.wide_large = generateWideTree(4, 10, 5)

    datasets.complex_small = generateComplexTree(100)
    datasets.complex_medium = generateComplexTree(300)
    datasets.complex_large = generateComplexTree(500)

    datasets.flat_medium = generateLargeFlat(300)
    datasets.flat_large = generateLargeFlat(600)
    datasets.flat_xlarge = generateLargeFlat(1000)

    console.log('Datasets generated:')
    Object.entries(datasets).forEach(([name, data]) => {
      console.log(`  ${name}: ${data.length} nodes`)
    })
    console.log('')
  })

  describe('sortChildrenWithSpouses benchmark', () => {
    it('should benchmark current implementation with O(n) lookups in comparator', () => {
      console.log('\n--- sortChildrenWithSpouses Performance ---')
      console.log('Current: Calls otherParent()/data.find() inside sort comparator')
      console.log('Each comparison is O(n), making sort O(m * n * log m)')
      console.log('')

      for (const [name, data] of Object.entries(datasets)) {
        // Find parents with multiple children to sort
        const parentsWithChildren = data.filter(d =>
          d.rels.children && d.rels.children.length > 1
        )

        if (parentsWithChildren.length === 0) continue

        const iterations = Math.min(50, Math.ceil(500 / parentsWithChildren.length))

        // Current implementation timing
        const currentTiming = measureTime(() => {
          for (const parent of parentsWithChildren) {
            const childrenIds = parent.rels.children || []
            const children = childrenIds
              .map(id => data.find(d => d.id === id))
              .filter((d): d is Datum => d !== undefined)

            if (children.length > 1) {
              // This is the problematic sort
              sortChildrenWithSpouses([...children], parent, data)
            }
          }
        }, iterations)

        // Optimized: pre-compute parent lookups before sorting
        const idMap = new Map(data.map(d => [d.id, d]))
        const optimizedTiming = measureTime(() => {
          for (const parent of parentsWithChildren) {
            const childrenIds = parent.rels.children || []
            const children = childrenIds
              .map(id => idMap.get(id))
              .filter((d): d is Datum => d !== undefined)

            if (children.length > 1) {
              // Pre-compute other parents for all children
              const otherParentMap = new Map<string, Datum | undefined>()
              for (const child of children) {
                const otherParentId = child.rels.parents.find(id => id !== parent.id)
                if (otherParentId) {
                  otherParentMap.set(child.id, idMap.get(otherParentId))
                }
              }

              // Now sort with O(1) lookups
              const sorted = [...children].sort((a, b) => {
                const aParent = otherParentMap.get(a.id)
                const bParent = otherParentMap.get(b.id)
                // Simplified comparison for benchmark
                const aIdx = parent.rels.spouses?.indexOf(aParent?.id || '') ?? -1
                const bIdx = parent.rels.spouses?.indexOf(bParent?.id || '') ?? -1
                return aIdx - bIdx
              })
            }
          }
        }, iterations)

        const totalSorts = parentsWithChildren.length
        const avgChildrenPerParent = parentsWithChildren.reduce((sum, p) =>
          sum + (p.rels.children?.length || 0), 0
        ) / parentsWithChildren.length

        const speedup = currentTiming.mean / optimizedTiming.mean

        console.log(
          `${name.padEnd(15)} | ${String(data.length).padStart(5)} nodes | ` +
          `${String(totalSorts).padStart(4)} sorts | ` +
          `Avg children: ${avgChildrenPerParent.toFixed(1).padStart(4)} | ` +
          `Current: ${formatTime(currentTiming.mean).padStart(10)} | ` +
          `Optimized: ${formatTime(optimizedTiming.mean).padStart(10)} | ` +
          `Speedup: ${speedup.toFixed(1).padStart(5)}x`
        )
      }
    })
  })

  describe('calculateDelay benchmark', () => {
    it('should benchmark current implementation that recalculates max depth', () => {
      console.log('\n--- calculateDelay Performance ---')
      console.log('Current: Math.max(...tree.data.map(...)) called for EACH node')
      console.log('Proposed: Pre-compute max depth once')
      console.log('')

      for (const [name, data] of Object.entries(datasets)) {
        const tree = calculateTree(data, { main_id: data[0].id })
        const treeData = tree.data
        const transitionTime = 1000
        const iterations = 50

        // Current implementation: recalculates every time
        const currentTiming = measureTime(() => {
          for (const d of treeData) {
            calculateDelay(tree, d, transitionTime)
          }
        }, iterations)

        // Optimized: pre-compute max depth
        const optimizedTiming = measureTime(() => {
          // Pre-compute once
          const ancestryLevels = Math.max(...treeData.map(d => d.is_ancestry ? d.depth : 0))
          const delayLevel = transitionTime * 0.4

          for (const d of treeData) {
            // Inline the calculation with pre-computed value
            let delay = d.depth * delayLevel
            if ((d.depth !== 0 || !!d.spouse) && !d.is_ancestry) {
              delay += ancestryLevels * delayLevel
              if (d.spouse) delay += delayLevel
              delay += d.depth * delayLevel
            }
          }
        }, iterations)

        const speedup = currentTiming.mean / optimizedTiming.mean

        console.log(
          `${name.padEnd(15)} | ${String(treeData.length).padStart(5)} tree nodes | ` +
          `Current: ${formatTime(currentTiming.mean).padStart(10)} | ` +
          `Precomputed: ${formatTime(optimizedTiming.mean).padStart(10)} | ` +
          `Speedup: ${speedup.toFixed(1).padStart(5)}x`
        )
      }
    })
  })

  describe('Nested loop simulation (setupChildrenAndParents)', () => {
    it('should benchmark O(n²) nested loop vs Map-based approach', () => {
      console.log('\n--- setupChildrenAndParents Pattern ---')
      console.log('Current: tree.forEach(d0 => tree.forEach(d1 => ...)) - O(n²)')
      console.log('Proposed: Build parent->children Map in O(n), then lookup in O(1)')
      console.log('')

      for (const [name, data] of Object.entries(datasets)) {
        const tree = calculateTree(data, { main_id: data[0].id })
        const treeData = [...tree.data]  // Copy to avoid mutation
        const iterations = Math.min(50, Math.ceil(2000 / treeData.length))

        // Current O(n²) implementation
        const currentTiming = measureTime(() => {
          const result: Record<string, any[]> = {}
          for (const d0 of treeData) {
            result[d0.data.id] = { children: [], parents: [] }
            for (const d1 of treeData) {
              if (d1.parent === d0) {
                if (d1.is_ancestry) {
                  result[d0.data.id].parents.push(d1)
                } else {
                  result[d0.data.id].children.push(d1)
                }
              }
            }
          }
        }, iterations)

        // Optimized O(n) implementation with Map
        const optimizedTiming = measureTime(() => {
          // Build parent -> children map in single pass
          const childrenMap = new Map<any, any[]>()
          const parentsMap = new Map<any, any[]>()

          for (const d of treeData) {
            if (d.parent) {
              if (d.is_ancestry) {
                if (!parentsMap.has(d.parent)) parentsMap.set(d.parent, [])
                parentsMap.get(d.parent)!.push(d)
              } else {
                if (!childrenMap.has(d.parent)) childrenMap.set(d.parent, [])
                childrenMap.get(d.parent)!.push(d)
              }
            }
          }

          // Now O(1) lookups
          const result: Record<string, any> = {}
          for (const d0 of treeData) {
            result[d0.data.id] = {
              children: childrenMap.get(d0) || [],
              parents: parentsMap.get(d0) || [],
            }
          }
        }, iterations)

        const speedup = currentTiming.mean / optimizedTiming.mean
        const comparisons = treeData.length * treeData.length

        console.log(
          `${name.padEnd(15)} | ${String(treeData.length).padStart(5)} nodes | ` +
          `${String(comparisons).padStart(10)} comparisons | ` +
          `O(n²): ${formatTime(currentTiming.mean).padStart(10)} | ` +
          `O(n): ${formatTime(optimizedTiming.mean).padStart(10)} | ` +
          `Speedup: ${speedup.toFixed(1).padStart(5)}x`
        )

        // The optimized version should be significantly faster for larger datasets
        if (treeData.length > 100) {
          expect(speedup).toBeGreaterThan(2)
        }
      }
    })
  })

  describe('Summary', () => {
    it('should print handler benchmark summary', () => {
      console.log('\n========================================')
      console.log('HANDLER BENCHMARKS COMPLETE')
      console.log('========================================\n')

      console.log('Key findings:')
      console.log('1. sortChildrenWithSpouses: O(n) lookups in comparator cause O(n² log n) complexity')
      console.log('2. calculateDelay: Redundant O(n) max calculation per node')
      console.log('3. setupChildrenAndParents: O(n²) nested loop can be O(n) with Map')
      console.log('')
      console.log('Recommended optimizations:')
      console.log('- Pre-compute lookup Maps before sorting')
      console.log('- Cache max depth calculation')
      console.log('- Replace nested loops with Map-based indexing')
      console.log('')

      expect(true).toBe(true)
    })
  })
})
