/**
 * Performance Benchmarks for calculateTree
 *
 * These benchmarks measure the performance of the core tree calculation algorithm.
 * Run before and after optimizations to quantify improvements.
 *
 * Key bottlenecks being measured:
 * 1. O(n²) nested loop in setupChildrenAndParents
 * 2. Repeated data_stash.find() calls (O(n) each)
 * 3. isAllRelativeDisplayed with nested .some() calls
 * 4. setupTid with Array.includes() instead of Set
 */

import { describe, it, expect, beforeAll } from 'vitest'
import calculateTree from '../../src/layout/calculate-tree'
import {
  generateDeepTree,
  generateWideTree,
  generateComplexTree,
  generateLargeFlat,
  generateBalancedTree,
  BENCHMARK_SIZES,
} from './test-data-generator'
import type { Data } from '../../src/types/data'

// Utility to measure execution time with high precision
function measureTime(fn: () => void, iterations: number = 1): { mean: number; min: number; max: number; total: number } {
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
    total,
  }
}

// Format time for display
function formatTime(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}µs`
  if (ms < 1000) return `${ms.toFixed(2)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

// Store benchmark results for comparison
interface BenchmarkResult {
  name: string
  dataSize: number
  treeSize: number
  iterations: number
  meanTime: number
  minTime: number
  maxTime: number
  totalTime: number
  opsPerSecond: number
}

const benchmarkResults: BenchmarkResult[] = []

function recordResult(
  name: string,
  dataSize: number,
  treeSize: number,
  iterations: number,
  timing: { mean: number; min: number; max: number; total: number }
) {
  const result: BenchmarkResult = {
    name,
    dataSize,
    treeSize,
    iterations,
    meanTime: timing.mean,
    minTime: timing.min,
    maxTime: timing.max,
    totalTime: timing.total,
    opsPerSecond: 1000 / timing.mean,
  }
  benchmarkResults.push(result)
  return result
}

describe('calculateTree Performance Benchmarks', () => {
  // Generate test datasets once
  const datasets: Record<string, Data> = {}

  beforeAll(() => {
    console.log('\n========================================')
    console.log('FAMILY CHART PERFORMANCE BENCHMARKS')
    console.log('========================================\n')
    console.log('Generating test datasets...')

    datasets.deep_small = generateDeepTree(5)    // ~10 nodes
    datasets.deep_medium = generateDeepTree(10)  // ~20 nodes
    datasets.deep_large = generateDeepTree(20)   // ~40 nodes

    datasets.wide_small = generateWideTree(2, 3, 2)   // ~20 nodes
    datasets.wide_medium = generateWideTree(3, 4, 3)  // ~100 nodes
    datasets.wide_large = generateWideTree(4, 5, 4)   // ~400+ nodes

    datasets.complex_small = generateComplexTree(50)
    datasets.complex_medium = generateComplexTree(200)
    datasets.complex_large = generateComplexTree(500)

    datasets.flat_medium = generateLargeFlat(200)
    datasets.flat_large = generateLargeFlat(500)
    datasets.flat_xlarge = generateLargeFlat(1000)
    datasets.flat_xxlarge = generateLargeFlat(2000)

    datasets.balanced_small = generateBalancedTree(4)   // 31 nodes
    datasets.balanced_medium = generateBalancedTree(6)  // 127 nodes
    datasets.balanced_large = generateBalancedTree(8)   // 511 nodes

    console.log('Datasets generated:')
    Object.entries(datasets).forEach(([name, data]) => {
      console.log(`  ${name}: ${data.length} nodes`)
    })
    console.log('')
  })

  describe('Full calculateTree execution', () => {
    it('should benchmark deep trees (ancestry depth)', () => {
      console.log('\n--- Deep Trees (Ancestry Depth) ---')

      for (const [name, data] of Object.entries(datasets).filter(([k]) => k.startsWith('deep_'))) {
        const iterations = data.length < 20 ? 100 : data.length < 50 ? 50 : 20
        const timing = measureTime(() => {
          calculateTree(data, { main_id: data[0].id })
        }, iterations)

        const tree = calculateTree(data, { main_id: data[0].id })
        const result = recordResult(name, data.length, tree.data.length, iterations, timing)

        console.log(
          `${name.padEnd(15)} | Data: ${String(data.length).padStart(5)} | Tree: ${String(tree.data.length).padStart(5)} | ` +
          `Mean: ${formatTime(result.meanTime).padStart(10)} | Ops/sec: ${result.opsPerSecond.toFixed(1).padStart(8)}`
        )

        expect(timing.mean).toBeLessThan(5000) // Should complete within 5 seconds
      }
    })

    it('should benchmark wide trees (many siblings/spouses)', () => {
      console.log('\n--- Wide Trees (Many Siblings/Spouses) ---')

      for (const [name, data] of Object.entries(datasets).filter(([k]) => k.startsWith('wide_'))) {
        const iterations = data.length < 50 ? 50 : data.length < 200 ? 20 : 10
        const timing = measureTime(() => {
          calculateTree(data, { main_id: data[0].id })
        }, iterations)

        const tree = calculateTree(data, { main_id: data[0].id })
        const result = recordResult(name, data.length, tree.data.length, iterations, timing)

        console.log(
          `${name.padEnd(15)} | Data: ${String(data.length).padStart(5)} | Tree: ${String(tree.data.length).padStart(5)} | ` +
          `Mean: ${formatTime(result.meanTime).padStart(10)} | Ops/sec: ${result.opsPerSecond.toFixed(1).padStart(8)}`
        )

        expect(timing.mean).toBeLessThan(5000)
      }
    })

    it('should benchmark complex trees (multiple marriages, half-siblings)', () => {
      console.log('\n--- Complex Trees (Multiple Marriages) ---')

      for (const [name, data] of Object.entries(datasets).filter(([k]) => k.startsWith('complex_'))) {
        const iterations = data.length < 100 ? 30 : data.length < 300 ? 15 : 5
        const timing = measureTime(() => {
          calculateTree(data, { main_id: data[0].id })
        }, iterations)

        const tree = calculateTree(data, { main_id: data[0].id })
        const result = recordResult(name, data.length, tree.data.length, iterations, timing)

        console.log(
          `${name.padEnd(15)} | Data: ${String(data.length).padStart(5)} | Tree: ${String(tree.data.length).padStart(5)} | ` +
          `Mean: ${formatTime(result.meanTime).padStart(10)} | Ops/sec: ${result.opsPerSecond.toFixed(1).padStart(8)}`
        )

        expect(timing.mean).toBeLessThan(10000)
      }
    })

    it('should benchmark flat trees (many small families)', () => {
      console.log('\n--- Flat Trees (Many Small Families) ---')

      for (const [name, data] of Object.entries(datasets).filter(([k]) => k.startsWith('flat_'))) {
        const iterations = data.length < 300 ? 20 : data.length < 1000 ? 10 : 5
        const timing = measureTime(() => {
          calculateTree(data, { main_id: data[0].id })
        }, iterations)

        const tree = calculateTree(data, { main_id: data[0].id })
        const result = recordResult(name, data.length, tree.data.length, iterations, timing)

        console.log(
          `${name.padEnd(15)} | Data: ${String(data.length).padStart(5)} | Tree: ${String(tree.data.length).padStart(5)} | ` +
          `Mean: ${formatTime(result.meanTime).padStart(10)} | Ops/sec: ${result.opsPerSecond.toFixed(1).padStart(8)}`
        )

        expect(timing.mean).toBeLessThan(15000)
      }
    })

    it('should benchmark balanced trees (predictable structure)', () => {
      console.log('\n--- Balanced Trees (Predictable Structure) ---')

      for (const [name, data] of Object.entries(datasets).filter(([k]) => k.startsWith('balanced_'))) {
        const iterations = data.length < 50 ? 50 : data.length < 200 ? 20 : 10
        const timing = measureTime(() => {
          calculateTree(data, { main_id: data[0].id })
        }, iterations)

        const tree = calculateTree(data, { main_id: data[0].id })
        const result = recordResult(name, data.length, tree.data.length, iterations, timing)

        console.log(
          `${name.padEnd(15)} | Data: ${String(data.length).padStart(5)} | Tree: ${String(tree.data.length).padStart(5)} | ` +
          `Mean: ${formatTime(result.meanTime).padStart(10)} | Ops/sec: ${result.opsPerSecond.toFixed(1).padStart(8)}`
        )

        expect(timing.mean).toBeLessThan(10000)
      }
    })
  })

  describe('Scaling analysis', () => {
    it('should analyze O(n²) behavior', () => {
      console.log('\n--- Scaling Analysis (Detecting O(n²) Behavior) ---')
      console.log('If ratio ≈ 4x when size doubles, algorithm is O(n²)')
      console.log('If ratio ≈ 2x when size doubles, algorithm is O(n)')
      console.log('')

      const sizes = [50, 100, 200, 400, 800]
      const results: Array<{ size: number; time: number }> = []

      for (const size of sizes) {
        const data = generateLargeFlat(size)
        const iterations = size < 200 ? 20 : size < 500 ? 10 : 5

        const timing = measureTime(() => {
          calculateTree(data, { main_id: data[0].id })
        }, iterations)

        results.push({ size, time: timing.mean })
      }

      console.log('Size'.padStart(6) + ' | ' + 'Time'.padStart(12) + ' | ' + 'Ratio vs Prev'.padStart(14))
      console.log('-'.repeat(40))

      for (let i = 0; i < results.length; i++) {
        const { size, time } = results[i]
        const ratio = i > 0 ? (time / results[i - 1].time).toFixed(2) + 'x' : 'N/A'
        console.log(
          `${String(size).padStart(6)} | ${formatTime(time).padStart(12)} | ${ratio.padStart(14)}`
        )
      }

      // Record for summary
      results.forEach(r => {
        benchmarkResults.push({
          name: `scaling_${r.size}`,
          dataSize: r.size,
          treeSize: 0,
          iterations: 1,
          meanTime: r.time,
          minTime: r.time,
          maxTime: r.time,
          totalTime: r.time,
          opsPerSecond: 1000 / r.time,
        })
      })
    })
  })

  describe('Summary', () => {
    it('should print benchmark summary', () => {
      console.log('\n========================================')
      console.log('BENCHMARK SUMMARY')
      console.log('========================================\n')

      // Group by test type
      const groups: Record<string, BenchmarkResult[]> = {}
      for (const result of benchmarkResults) {
        const group = result.name.split('_')[0]
        if (!groups[group]) groups[group] = []
        groups[group].push(result)
      }

      for (const [group, results] of Object.entries(groups)) {
        console.log(`\n${group.toUpperCase()}:`)
        for (const r of results) {
          console.log(
            `  ${r.name.padEnd(20)} | ${String(r.dataSize).padStart(5)} nodes | ${formatTime(r.meanTime).padStart(10)} mean`
          )
        }
      }

      // Calculate overall statistics
      const totalBenchmarks = benchmarkResults.length
      const avgTime = benchmarkResults.reduce((a, b) => a + b.meanTime, 0) / totalBenchmarks
      const maxTime = Math.max(...benchmarkResults.map(r => r.meanTime))
      const minTime = Math.min(...benchmarkResults.map(r => r.meanTime))

      console.log('\n----------------------------------------')
      console.log(`Total benchmarks: ${totalBenchmarks}`)
      console.log(`Average time: ${formatTime(avgTime)}`)
      console.log(`Min time: ${formatTime(minTime)}`)
      console.log(`Max time: ${formatTime(maxTime)}`)
      console.log('----------------------------------------\n')

      // Output JSON for comparison
      console.log('\nJSON Results (for comparison):')
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        results: benchmarkResults.map(r => ({
          name: r.name,
          dataSize: r.dataSize,
          meanTimeMs: r.meanTime,
        }))
      }, null, 2))

      expect(true).toBe(true)
    })
  })
})
