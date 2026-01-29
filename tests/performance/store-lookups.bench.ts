/**
 * Performance Benchmarks for Store Lookup Operations
 *
 * These benchmarks measure the performance of ID-based lookups
 * which are currently O(n) using Array.find().
 *
 * Key bottlenecks being measured:
 * 1. getDatum() - O(n) lookup for each call
 * 2. getTreeDatum() - O(n) lookup for each call
 * 3. Simulated repeated lookups (as in calculateTree)
 */

import { describe, it, expect, beforeAll } from 'vitest'
import createStore from '../../src/store/store'
import calculateTree from '../../src/layout/calculate-tree'
import {
  generateLargeFlat,
  generateComplexTree,
  generateWideTree,
} from './test-data-generator'
import type { Data } from '../../src/types/data'

// Utility to measure execution time
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

describe('Store Lookup Performance Benchmarks', () => {
  const datasets: Record<string, Data> = {}

  beforeAll(() => {
    console.log('\n========================================')
    console.log('STORE LOOKUP BENCHMARKS')
    console.log('========================================\n')

    datasets.small = generateLargeFlat(100)
    datasets.medium = generateLargeFlat(500)
    datasets.large = generateLargeFlat(1000)
    datasets.xlarge = generateLargeFlat(2000)

    console.log('Datasets generated:')
    Object.entries(datasets).forEach(([name, data]) => {
      console.log(`  ${name}: ${data.length} nodes`)
    })
    console.log('')
  })

  describe('Current Array.find() implementation', () => {
    it('should benchmark single lookups', () => {
      console.log('\n--- Single Lookup Performance (getDatum) ---')
      console.log('This simulates single ID lookups using Array.find()')
      console.log('')

      for (const [name, data] of Object.entries(datasets)) {
        const store = createStore({ data })

        // Get random IDs to look up
        const lookupIds = data.slice(0, Math.min(100, data.length)).map(d => d.id)

        const timing = measureTime(() => {
          for (const id of lookupIds) {
            store.getDatum(id)
          }
        }, 50)

        const perLookup = timing.mean / lookupIds.length

        console.log(
          `${name.padEnd(10)} | ${String(data.length).padStart(5)} nodes | ` +
          `100 lookups: ${formatTime(timing.mean).padStart(10)} | ` +
          `Per lookup: ${formatTime(perLookup).padStart(10)}`
        )

        expect(timing.mean).toBeLessThan(1000)
      }
    })

    it('should benchmark repeated lookups (simulating calculateTree pattern)', () => {
      console.log('\n--- Repeated Lookup Pattern (simulating calculateTree) ---')
      console.log('This simulates the pattern in hierarchyGetterChildren: map(id => data.find(...))')
      console.log('')

      for (const [name, data] of Object.entries(datasets)) {
        // Simulate the pattern: for each node, look up all its children/parents/spouses
        const iterations = Math.min(20, Math.ceil(1000 / data.length))

        const timing = measureTime(() => {
          for (const datum of data) {
            // Look up children (like hierarchyGetterChildren)
            const children = (datum.rels.children || []).map(id =>
              data.find(d => d.id === id)
            ).filter(d => d !== undefined)

            // Look up parents (like hierarchyGetterParents)
            const parents = datum.rels.parents.map(id =>
              data.find(d => d.id === id)
            ).filter(d => d !== undefined)

            // Look up spouses
            const spouses = (datum.rels.spouses || []).map(id =>
              data.find(d => d.id === id)
            ).filter(d => d !== undefined)
          }
        }, iterations)

        // Count total lookups
        let totalLookups = 0
        for (const datum of data) {
          totalLookups += (datum.rels.children || []).length
          totalLookups += datum.rels.parents.length
          totalLookups += (datum.rels.spouses || []).length
        }

        const perLookup = timing.mean / totalLookups

        console.log(
          `${name.padEnd(10)} | ${String(data.length).padStart(5)} nodes | ` +
          `${String(totalLookups).padStart(6)} lookups | ` +
          `Total: ${formatTime(timing.mean).padStart(10)} | ` +
          `Per lookup: ${formatTime(perLookup).padStart(10)}`
        )

        expect(timing.mean).toBeLessThan(5000)
      }
    })
  })

  describe('Comparison with Map-based lookup (proposed optimization)', () => {
    it('should demonstrate Map vs Array.find() performance', () => {
      console.log('\n--- Map vs Array.find() Comparison ---')
      console.log('Shows potential speedup from using ID -> Datum Map')
      console.log('')

      for (const [name, data] of Object.entries(datasets)) {
        const lookupIds = data.map(d => d.id)
        const iterations = 50

        // Current: Array.find()
        const arrayTiming = measureTime(() => {
          for (const id of lookupIds) {
            data.find(d => d.id === id)
          }
        }, iterations)

        // Proposed: Map lookup
        const idMap = new Map(data.map(d => [d.id, d]))
        const mapTiming = measureTime(() => {
          for (const id of lookupIds) {
            idMap.get(id)
          }
        }, iterations)

        const speedup = arrayTiming.mean / mapTiming.mean

        console.log(
          `${name.padEnd(10)} | ${String(data.length).padStart(5)} nodes | ` +
          `Array.find: ${formatTime(arrayTiming.mean).padStart(10)} | ` +
          `Map.get: ${formatTime(mapTiming.mean).padStart(10)} | ` +
          `Speedup: ${speedup.toFixed(1).padStart(6)}x`
        )

        // Map should always be faster
        expect(mapTiming.mean).toBeLessThan(arrayTiming.mean)
      }
    })

    it('should benchmark the full lookup pattern with Map optimization', () => {
      console.log('\n--- Full Lookup Pattern: Array.find() vs Map ---')
      console.log('Simulating calculateTree relationship lookups')
      console.log('')

      for (const [name, data] of Object.entries(datasets)) {
        const iterations = Math.min(20, Math.ceil(500 / data.length))

        // Current implementation with Array.find()
        const arrayTiming = measureTime(() => {
          for (const datum of data) {
            const children = (datum.rels.children || []).map(id =>
              data.find(d => d.id === id)
            ).filter(d => d !== undefined)

            const parents = datum.rels.parents.map(id =>
              data.find(d => d.id === id)
            ).filter(d => d !== undefined)

            const spouses = (datum.rels.spouses || []).map(id =>
              data.find(d => d.id === id)
            ).filter(d => d !== undefined)
          }
        }, iterations)

        // Optimized with Map
        const idMap = new Map(data.map(d => [d.id, d]))
        const mapTiming = measureTime(() => {
          for (const datum of data) {
            const children = (datum.rels.children || []).map(id =>
              idMap.get(id)
            ).filter(d => d !== undefined)

            const parents = datum.rels.parents.map(id =>
              idMap.get(id)
            ).filter(d => d !== undefined)

            const spouses = (datum.rels.spouses || []).map(id =>
              idMap.get(id)
            ).filter(d => d !== undefined)
          }
        }, iterations)

        const speedup = arrayTiming.mean / mapTiming.mean

        console.log(
          `${name.padEnd(10)} | ${String(data.length).padStart(5)} nodes | ` +
          `Array: ${formatTime(arrayTiming.mean).padStart(10)} | ` +
          `Map: ${formatTime(mapTiming.mean).padStart(10)} | ` +
          `Speedup: ${speedup.toFixed(1).padStart(6)}x`
        )
      }
    })
  })

  describe('isAllRelativeDisplayed benchmark', () => {
    it('should benchmark current O(n*m) implementation', () => {
      console.log('\n--- isAllRelativeDisplayed Performance ---')
      console.log('Current: every(rel => data.some(d => d.id === rel))')
      console.log('')

      for (const [name, data] of Object.entries(datasets)) {
        const tree = calculateTree(data, { main_id: data[0].id })
        const treeData = tree.data
        const iterations = Math.min(50, Math.ceil(1000 / data.length))

        // Current implementation
        const currentTiming = measureTime(() => {
          for (const d of treeData) {
            const r = d.data.rels
            const allRels = [...r.parents, ...(r.spouses || []), ...(r.children || [])].filter(v => v)
            allRels.every(relId => treeData.some(t => t.data.id === relId))
          }
        }, iterations)

        // Optimized with Set
        const treeIdSet = new Set(treeData.map(t => t.data.id))
        const optimizedTiming = measureTime(() => {
          for (const d of treeData) {
            const r = d.data.rels
            const allRels = [...r.parents, ...(r.spouses || []), ...(r.children || [])].filter(v => v)
            allRels.every(relId => treeIdSet.has(relId))
          }
        }, iterations)

        const speedup = currentTiming.mean / optimizedTiming.mean

        console.log(
          `${name.padEnd(10)} | ${String(treeData.length).padStart(5)} tree nodes | ` +
          `Current: ${formatTime(currentTiming.mean).padStart(10)} | ` +
          `With Set: ${formatTime(optimizedTiming.mean).padStart(10)} | ` +
          `Speedup: ${speedup.toFixed(1).padStart(6)}x`
        )
      }
    })
  })

  describe('setupTid duplicate detection benchmark', () => {
    it('should benchmark Array.includes vs Set for duplicate detection', () => {
      console.log('\n--- setupTid Duplicate Detection ---')
      console.log('Current: ids.includes(id) - O(n) per check')
      console.log('Proposed: idSet.has(id) - O(1) per check')
      console.log('')

      for (const [name, data] of Object.entries(datasets)) {
        const tree = calculateTree(data, { main_id: data[0].id })
        const treeData = tree.data
        const iterations = 100

        // Simulate current implementation with Array.includes
        const arrayTiming = measureTime(() => {
          const ids: string[] = []
          for (const d of treeData) {
            if (ids.includes(d.data.id)) {
              // Found duplicate
            }
            ids.push(d.data.id)
          }
        }, iterations)

        // Optimized with Set
        const setTiming = measureTime(() => {
          const ids = new Set<string>()
          for (const d of treeData) {
            if (ids.has(d.data.id)) {
              // Found duplicate
            }
            ids.add(d.data.id)
          }
        }, iterations)

        const speedup = arrayTiming.mean / setTiming.mean

        console.log(
          `${name.padEnd(10)} | ${String(treeData.length).padStart(5)} tree nodes | ` +
          `Array.includes: ${formatTime(arrayTiming.mean).padStart(10)} | ` +
          `Set.has: ${formatTime(setTiming.mean).padStart(10)} | ` +
          `Speedup: ${speedup.toFixed(1).padStart(6)}x`
        )
      }
    })
  })
})
