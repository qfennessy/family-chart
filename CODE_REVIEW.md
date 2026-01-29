# Family Chart Code Review

**Created:** 2026-01-29
**Reviewer:** Claude Code
**Version Reviewed:** 0.9.0

---

## Executive Summary

Family Chart is a well-architected D3.js-based visualization library with solid fundamentals. The codebase demonstrates good separation of concerns, comprehensive type definitions, and a clean modular structure. However, there are significant opportunities for improvement in testing, type safety, security, and documentation.

---

## Table of Contents

1. [Critical Findings](#critical-findings)
2. [Type Safety Issues](#type-safety-issues)
3. [Testing Gaps](#testing-gaps)
4. [Security Considerations](#security-considerations)
5. [Performance Concerns](#performance-concerns)
6. [Code Quality Issues](#code-quality-issues)
7. [Documentation Gaps](#documentation-gaps)
8. [Recommendations](#recommendations)

---

## Critical Findings

| Category | Severity | Issue | Impact |
|----------|----------|-------|--------|
| Type Safety | High | 42 uses of `any` type | Reduced IDE support, runtime errors possible |
| Testing | Critical | 0 unit tests | No regression detection, refactoring risky |
| XSS Vulnerability | High | `innerHTML` without sanitization | Possible script injection if data untrusted |
| Error Handling | Medium | Inconsistent error patterns | Hard to debug, silent failures possible |
| Performance | Medium | Full tree recalculation on updates | Large trees (1000+ nodes) may be slow |
| Code Quality | Medium | Mixed naming conventions | Harder to maintain, inconsistent API |

---

## Type Safety Issues

### Excessive Use of `any` Type

Found 42 instances of `any` type across the codebase, reducing type safety:

**src/types/form.ts:**
```typescript
fields: any[]  // todo: Field[]
```

**src/core/edit.ts:**
```typescript
removeRelative?: any,  // todo: RemoveRelative
```

**src/renderers/card-html.ts:** Multiple `any` usages in card rendering functions.

### Missing Null Checks

Multiple non-null assertions without runtime validation:

```typescript
// Risky pattern - crashes if element doesn't exist
const form = formContainer.querySelector('form')!;
form.querySelector('.f3-cancel-btn')!
```

**Recommendation:** Add proper null checking or use optional chaining with fallback handlers.

---

## Testing Gaps

### Current State

- **Unit Tests:** 0 (none found)
- **E2E Tests:** 2 files only (`examples.cy.js`, `create-tree.cy.js`)
- **Estimated Coverage:** <10%

### Critical Untested Areas

1. **Tree calculation algorithms** (`src/layout/`)
2. **Data formatting and migration logic** (legacy father/mother to parents array)
3. **Relationship validation** (bidirectional relationship integrity)
4. **Kinship calculations** (`src/features/kinships/`)
5. **Form submission and editing** (`src/core/edit.ts`)
6. **Edge cases:** circular references, disconnected relatives, very large trees

### E2E Test Quality

Current Cypress tests perform basic smoke tests:
```javascript
// Typical assertion - checks existence only
cy.get('.f3-card').should('exist')
```

**Recommendation:** Add comprehensive unit test suite using Jest or Vitest targeting 70%+ coverage.

---

## Security Considerations

### XSS Vulnerabilities

Found multiple instances of `innerHTML` without sanitization:

**src/renderers/card-html.ts (line 33):**
```typescript
this.innerHTML = (`<div class="card ..." data-id="${d.tid}" ...></div>`)
```

**src/renderers/create-form.ts (line 21):**
```typescript
formContainer.innerHTML = formHtml;
```

**src/renderers/card-svg/defs.ts:**
```typescript
svg.insertAdjacentHTML('afterbegin', svg_html)
```

### Attack Example

If user data contains malicious content:
```json
{ "first name": "<img src=x onerror='alert(1)'>" }
```

This would execute JavaScript when rendered.

### Mitigating Factors

- Library typically used by trusted administrators
- Data usually from secure sources (databases, WikiData)
- HTML in sandboxed container

### Recommendations

1. Use `textContent` instead of `innerHTML` where possible
2. Integrate DOMPurify for user-generated content
3. Document security model clearly in README
4. Validate/sanitize all user input before rendering

---

## Performance Concerns

### Layout Recalculation

Full tree recalculation occurs on every data change:
```typescript
// store.updateTree triggers complete recalculation
// No memoization of expensive calculations
```

### DOM Operations

**Inefficient patterns found:**
```typescript
formContainer.innerHTML = formHtml;  // Full replacement
```

**History storage creates full copies:**
```typescript
JSON.parse(JSON.stringify(data))  // Memory intensive for large trees
```

### Large Tree Handling

- No lazy loading of cards
- No virtual scrolling for lists
- No canvas rendering option for very large trees
- Potential issues with 1000+ person trees

### Recommendations

1. Add memoization for tree calculations
2. Implement incremental tree updates
3. Consider virtual scrolling for large datasets
4. Profile with DevTools for specific bottlenecks

---

## Code Quality Issues

### Inconsistent Naming Conventions

Mixed styles throughout codebase:
- `is_card_html` vs `editFirst` (underscore vs camelCase)
- `card_y_spacing` vs `cardXSpacing`
- Abbreviations vary: `cont`, `rel`, `datum`, `d`, `p1`, `p2`

### Direct State Mutation

**src/store/format-data.ts:**
```typescript
d.rels.parents = []  // Mutating input parameter
delete d.rels.father  // Direct mutation
```

### Magic Numbers and Strings

Default values scattered throughout:
```typescript
node_separation: 250, level_separation: 150
card_dim: {w:220, h:70, text_x:75, ...}
```

**Recommendation:** Extract to centralized configuration constants.

### Complex Conditional Chains

**src/renderers/card-html.ts:**
```typescript
const cardInner = props.style === 'default' ? ...
  : props.style === 'imageCircleRect' ? ...
  : props.style === 'imageCircle' ? ...
```

**Recommendation:** Refactor to switch statements or strategy pattern.

### Console Logging in Production

Debugging logs found in production code:
```typescript
console.log('historyUpdateTree')
console.log('zoom already setup')
```

### Incomplete Error Handling

Mix of patterns:
```typescript
// Returns instead of throwing
if (!field.options && !field.optionCreator)
  return console.error('optionCreator or options is not set for field', field)
```

**Recommendation:** Standardize error handling with proper Error types.

### Outstanding TODOs

```typescript
// todo: remove store from props (card-svg.ts:10)
// todo: Field[] (form.ts)
// todo: RemoveRelative (edit.ts)
// todo: view-handlers.js (handlers/general.ts)
```

---

## Documentation Gaps

### Missing Documentation

1. **Architecture guide** - No design patterns documentation
2. **D3 layout algorithm** - Limited explanation
3. **Troubleshooting guide** - None exists
4. **Contribution guidelines** - Not in repository
5. **Data format migration** - Legacy vs v0.9.0 format not fully explained
6. **Performance optimization guide** - None exists

### Existing Documentation Strengths

- TypeDoc configuration for API docs
- JSDoc comments on major classes
- README with framework support matrix
- Type definitions are self-documenting

---

## Recommendations

### Priority 1 - Critical

1. **Add unit test suite**
   - Use Jest or Vitest
   - Target 70%+ coverage
   - Focus on tree calculation, data formatting, and relationship validation

2. **Implement input sanitization**
   - Use DOMPurify or document security model
   - Replace `innerHTML` with safer alternatives where possible

3. **Replace `any` types**
   - Define proper TypeScript interfaces for all 42 instances
   - Complete TODO type annotations

4. **Add schema validation**
   - Use Zod or similar for data input validation
   - Validate bidirectional relationships

### Priority 2 - High

1. **Centralize error handling**
   - Create custom error types
   - Standardize error reporting pattern

2. **Refactor callback-heavy code**
   - Break down `src/core/add-relative.ts` activate() function
   - Improve testability

3. **Extract configuration constants**
   - Centralize magic numbers
   - Create configurable defaults

4. **Add performance profiling**
   - Profile large tree rendering
   - Identify optimization targets

### Priority 3 - Medium

1. **Standardize naming conventions**
   - Choose snake_case or camelCase consistently
   - Document naming rules

2. **Complete TODOs**
   - Resolve all TODO comments
   - Remove debugging code

3. **Add architecture documentation**
   - Document D3 layout algorithm
   - Create contributor guide

4. **Implement tree virtualization**
   - Support for 1000+ node trees
   - Lazy loading for deep hierarchies

### Priority 4 - Nice to Have

1. Add bundle size monitoring in CI
2. Implement optional feature loading (tree-shakable features)
3. Add dark mode support
4. Create style guide for contributors

---

## Conclusion

Family Chart is a capable library with a solid foundation. The core D3-based tree rendering is robust, and the modular architecture supports maintainability. Addressing the Priority 1 recommendations—particularly adding unit tests and improving type safety—would significantly enhance production readiness and developer confidence for future refactoring.

The library's minimal dependency footprint (only D3.js) is a strength, and the multi-format bundle output (UMD, ESM, minified) demonstrates good distribution practices.

---

*This review was conducted by examining the source code, configuration files, and test suite. Recommendations are based on industry best practices for TypeScript libraries.*
