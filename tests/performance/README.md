# Performance Benchmarks

This directory contains performance benchmarks for the family-chart library. These benchmarks measure the execution time of key operations and help quantify improvements when optimizations are applied.

## Running Benchmarks

```bash
# Run all benchmarks
npm run benchmark

# Run specific benchmark suites
npm run benchmark:calculate-tree  # Core tree calculation
npm run benchmark:store          # Store lookup operations
npm run benchmark:handlers       # Layout handler functions

# Run with watch mode (re-runs on file changes)
npm run test:bench:watch
```

## Benchmark Files

### `calculate-tree.bench.ts`
Measures the performance of the core `calculateTree` function with various tree structures:
- **Deep trees**: Many generations, few children (tests ancestry depth)
- **Wide trees**: Few generations, many children/siblings (tests horizontal layout)
- **Complex trees**: Multiple marriages, half-siblings (tests edge cases)
- **Flat trees**: Many small disconnected families (tests data size scaling)
- **Balanced trees**: Predictable binary structure (baseline comparison)
- **Scaling analysis**: Detects O(n²) behavior by doubling data size

### `store-lookups.bench.ts`
Measures lookup performance and compares current implementation vs optimized approaches:
- Single `getDatum()` lookups
- Repeated lookup patterns (simulating `hierarchyGetterChildren`)
- `Array.find()` vs `Map.get()` comparison
- `isAllRelativeDisplayed` with `.some()` vs `Set.has()`
- `setupTid` duplicate detection with `Array.includes()` vs `Set.has()`

### `handlers.bench.ts`
Measures layout helper function performance:
- `sortChildrenWithSpouses` with O(n) lookups in comparator
- `calculateDelay` with redundant max depth calculation
- `setupChildrenAndParents` O(n²) nested loop simulation

## Test Data Generator

The `test-data-generator.ts` module creates family tree datasets of various sizes and structures:

```typescript
import {
  generateDeepTree,      // Many generations
  generateWideTree,      // Many siblings/spouses
  generateComplexTree,   // Multiple marriages
  generateLargeFlat,     // Many small families
  generateBalancedTree,  // Binary tree structure
  generateTreeBySize,    // Auto-select by size
  BENCHMARK_SIZES,       // Standard sizes: tiny(10), small(50), medium(200), large(500), xlarge(1000), xxlarge(2000)
} from './test-data-generator'
```

## Interpreting Results

### Scaling Analysis
When data size doubles:
- **Ratio ≈ 2x**: O(n) linear complexity - good
- **Ratio ≈ 4x**: O(n²) quadratic complexity - needs optimization
- **Ratio > 4x**: Worse than quadratic - critical issue

### Speedup Metrics
Each benchmark compares current implementation vs optimized approaches:
- **Speedup > 10x**: Major improvement opportunity
- **Speedup 2-10x**: Significant improvement
- **Speedup < 2x**: Minor improvement or overhead dominates

## Comparing Before/After

1. Run benchmarks before optimization:
   ```bash
   npm run benchmark > benchmark-before.txt
   ```

2. Apply optimizations to the code

3. Run benchmarks after optimization:
   ```bash
   npm run benchmark > benchmark-after.txt
   ```

4. Compare results:
   ```bash
   diff benchmark-before.txt benchmark-after.txt
   ```

## Key Performance Issues Identified

| Issue | Location | Current | Proposed | Expected Speedup |
|-------|----------|---------|----------|------------------|
| O(n²) nested loop | `setupChildrenAndParents` | `tree.forEach` nested | Map-based | 3-9x |
| Repeated `data.find()` | `hierarchyGetterChildren` | O(n) per lookup | ID→Datum Map | 15-260x |
| O(n) in sort comparator | `sortChildrenWithSpouses` | `otherParent()` calls | Pre-compute | 3-17x |
| Redundant max calculation | `calculateDelay` | Per-node O(n) | Pre-compute once | 4-36x |
| `Array.includes()` | `setupTid` | O(n) per check | Set.has() | 1-2x |

## JSON Output

Benchmarks output JSON results for programmatic comparison:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "results": [
    { "name": "deep_small", "dataSize": 9, "meanTimeMs": 0.107 },
    { "name": "flat_xlarge", "dataSize": 1000, "meanTimeMs": 2.37 }
  ]
}
```
