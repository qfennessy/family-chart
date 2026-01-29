/**
 * Test Data Generator for Family Chart Performance Testing
 *
 * Generates family trees of various sizes and structures to benchmark
 * performance of tree calculation algorithms.
 */

import type { Datum, Data } from '../../src/types/data'

let idCounter = 0

function generateId(): string {
  return `person-${++idCounter}`
}

function resetIdCounter(): void {
  idCounter = 0
}

interface GeneratorOptions {
  generations?: number
  childrenPerCouple?: number
  includeSpouses?: boolean
  branchingFactor?: number  // How many couples per generation (for wide trees)
}

/**
 * Creates a single person datum
 */
function createPerson(gender: 'M' | 'F', name?: string): Datum {
  const id = generateId()
  return {
    id,
    data: {
      gender,
      'first name': name || `Person ${id}`,
    },
    rels: {
      parents: [],
      spouses: [],
      children: [],
    }
  }
}

/**
 * Links two people as spouses
 */
function linkSpouses(person1: Datum, person2: Datum): void {
  if (!person1.rels.spouses.includes(person2.id)) {
    person1.rels.spouses.push(person2.id)
  }
  if (!person2.rels.spouses.includes(person1.id)) {
    person2.rels.spouses.push(person1.id)
  }
}

/**
 * Links a child to parents
 */
function linkChild(child: Datum, parent1: Datum, parent2?: Datum): void {
  // Add child to parents
  if (!parent1.rels.children.includes(child.id)) {
    parent1.rels.children.push(child.id)
  }
  if (parent2 && !parent2.rels.children.includes(child.id)) {
    parent2.rels.children.push(child.id)
  }

  // Add parents to child
  if (!child.rels.parents.includes(parent1.id)) {
    child.rels.parents.push(parent1.id)
  }
  if (parent2 && !child.rels.parents.includes(parent2.id)) {
    child.rels.parents.push(parent2.id)
  }
}

/**
 * Generates a deep family tree (many generations, few children)
 * Useful for testing ancestry/progeny depth traversal
 */
export function generateDeepTree(generations: number = 10): Data {
  resetIdCounter()
  const data: Data = []

  let currentMale = createPerson('M', 'Patriarch')
  let currentFemale = createPerson('F', 'Matriarch')
  linkSpouses(currentMale, currentFemale)
  data.push(currentMale, currentFemale)

  for (let gen = 1; gen < generations; gen++) {
    const child = createPerson(gen % 2 === 0 ? 'M' : 'F', `Gen${gen}`)
    linkChild(child, currentMale, currentFemale)
    data.push(child)

    // Add spouse for next generation
    if (gen < generations - 1) {
      const spouse = createPerson(gen % 2 === 0 ? 'F' : 'M', `Spouse-Gen${gen}`)
      linkSpouses(child, spouse)
      data.push(spouse)

      currentMale = gen % 2 === 0 ? child : spouse
      currentFemale = gen % 2 === 0 ? spouse : child
    }
  }

  return data
}

/**
 * Generates a wide family tree (few generations, many children and siblings)
 * Useful for testing horizontal layout and spouse handling
 */
export function generateWideTree(
  generations: number = 3,
  childrenPerCouple: number = 5,
  couplesPerGeneration: number = 4
): Data {
  resetIdCounter()
  const data: Data = []

  // Create founding couples
  const foundingCouples: Array<[Datum, Datum]> = []
  for (let c = 0; c < couplesPerGeneration; c++) {
    const male = createPerson('M', `Founder-M-${c}`)
    const female = createPerson('F', `Founder-F-${c}`)
    linkSpouses(male, female)
    data.push(male, female)
    foundingCouples.push([male, female])
  }

  let currentCouples = foundingCouples

  for (let gen = 1; gen < generations; gen++) {
    const nextCouples: Array<[Datum, Datum]> = []

    for (const [father, mother] of currentCouples) {
      // Create children for this couple
      for (let i = 0; i < childrenPerCouple; i++) {
        const gender: 'M' | 'F' = i % 2 === 0 ? 'M' : 'F'
        const child = createPerson(gender, `Gen${gen}-Child${i}`)
        linkChild(child, father, mother)
        data.push(child)

        // Pair up children with spouses for next generation
        if (gen < generations - 1 && i < couplesPerGeneration) {
          const spouseGender: 'M' | 'F' = gender === 'M' ? 'F' : 'M'
          const spouse = createPerson(spouseGender, `Gen${gen}-Spouse${i}`)
          linkSpouses(child, spouse)
          data.push(spouse)

          if (gender === 'M') {
            nextCouples.push([child, spouse])
          } else {
            nextCouples.push([spouse, child])
          }
        }
      }
    }

    currentCouples = nextCouples.slice(0, couplesPerGeneration)
  }

  return data
}

/**
 * Generates a complex tree with multiple marriages, half-siblings, etc.
 * Useful for testing edge cases in relationship handling
 */
export function generateComplexTree(size: number = 100): Data {
  resetIdCounter()
  const data: Data = []

  // Create initial pool of people
  for (let i = 0; i < size; i++) {
    const gender: 'M' | 'F' = i % 2 === 0 ? 'M' : 'F'
    data.push(createPerson(gender, `Person-${i}`))
  }

  // Create relationships
  // Split into "older" and "younger" generations
  const olderGen = data.slice(0, Math.floor(size / 2))
  const youngerGen = data.slice(Math.floor(size / 2))

  // Create couples from older generation
  for (let i = 0; i < olderGen.length - 1; i += 2) {
    const person1 = olderGen[i]
    const person2 = olderGen[i + 1]

    // Make them spouses if opposite genders
    if (person1.data.gender !== person2.data.gender) {
      linkSpouses(person1, person2)

      // Assign some younger gen as their children
      const childCount = Math.min(3, Math.floor(youngerGen.length / (olderGen.length / 2)))
      for (let c = 0; c < childCount; c++) {
        const childIndex = (i / 2) * childCount + c
        if (childIndex < youngerGen.length) {
          const child = youngerGen[childIndex]
          linkChild(child, person1, person2)
        }
      }
    }
  }

  // Add some second marriages (remarriages) for complexity
  for (let i = 0; i < Math.min(5, olderGen.length / 4); i++) {
    const personIndex = i * 4
    if (personIndex + 3 < olderGen.length) {
      const person = olderGen[personIndex]
      const newSpouse = olderGen[personIndex + 3]
      if (person.data.gender !== newSpouse.data.gender) {
        linkSpouses(person, newSpouse)
      }
    }
  }

  return data
}

/**
 * Generates a balanced binary tree structure
 * Each person has exactly 2 parents and each couple has exactly 2 children
 * Useful for predictable performance testing
 */
export function generateBalancedTree(depth: number = 5): Data {
  resetIdCounter()
  const data: Data = []

  // Start from bottom (youngest generation) and work up
  // This creates 2^depth people at the bottom

  function createAncestryTree(person: Datum, currentDepth: number): void {
    if (currentDepth >= depth) return

    const father = createPerson('M', `Father-D${currentDepth}`)
    const mother = createPerson('F', `Mother-D${currentDepth}`)

    linkSpouses(father, mother)
    linkChild(person, father, mother)

    data.push(father, mother)

    createAncestryTree(father, currentDepth + 1)
    createAncestryTree(mother, currentDepth + 1)
  }

  const root = createPerson('M', 'Root')
  data.push(root)
  createAncestryTree(root, 0)

  return data
}

/**
 * Generates a large flat dataset (many people, sparse relationships)
 * Useful for testing lookup performance with many nodes
 */
export function generateLargeFlat(count: number = 1000): Data {
  resetIdCounter()
  const data: Data = []

  // Create many small family units
  const familySize = 5  // 2 parents + 3 children per unit
  const numFamilies = Math.floor(count / familySize)

  for (let f = 0; f < numFamilies; f++) {
    const father = createPerson('M', `Family${f}-Father`)
    const mother = createPerson('F', `Family${f}-Mother`)
    linkSpouses(father, mother)
    data.push(father, mother)

    for (let c = 0; c < 3; c++) {
      const child = createPerson(c % 2 === 0 ? 'M' : 'F', `Family${f}-Child${c}`)
      linkChild(child, father, mother)
      data.push(child)
    }
  }

  return data
}

/**
 * Generates trees of specific sizes for benchmarking
 */
export function generateTreeBySize(targetSize: number): Data {
  if (targetSize <= 20) {
    return generateDeepTree(Math.ceil(targetSize / 2))
  } else if (targetSize <= 100) {
    return generateWideTree(4, 5, 3)
  } else if (targetSize <= 500) {
    return generateComplexTree(targetSize)
  } else {
    return generateLargeFlat(targetSize)
  }
}

/**
 * Standard test sizes for benchmarking
 */
export const BENCHMARK_SIZES = {
  tiny: 10,
  small: 50,
  medium: 200,
  large: 500,
  xlarge: 1000,
  xxlarge: 2000,
}

/**
 * Generate all standard benchmark datasets
 */
export function generateBenchmarkDatasets(): Record<string, Data> {
  return {
    tiny: generateTreeBySize(BENCHMARK_SIZES.tiny),
    small: generateTreeBySize(BENCHMARK_SIZES.small),
    medium: generateTreeBySize(BENCHMARK_SIZES.medium),
    large: generateTreeBySize(BENCHMARK_SIZES.large),
    xlarge: generateTreeBySize(BENCHMARK_SIZES.xlarge),
    xxlarge: generateTreeBySize(BENCHMARK_SIZES.xxlarge),
  }
}

export { resetIdCounter }
