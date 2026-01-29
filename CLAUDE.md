# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Family Chart is a D3.js-based visualization library for creating interactive family trees. It supports React, Vue, Angular, Svelte, and vanilla JavaScript.

## Common Commands

- `npm run build` - Build the library (runs Rollup, outputs to dist/)
- `npm run dev` - Start Vite dev server for local development
- `npm test` - Open Cypress interactive test runner
- `npm run test-run` - Run Cypress tests headlessly
- `npm run docs` - Generate TypeDoc documentation

## Architecture

### Entry Point and Exports

- `src/index.ts` → `src/exports.ts`: Main entry point exposing the public API
- Library exports as `f3` in UMD builds, supports ESM imports

### Core Classes

**Chart** (`src/core/chart.ts`): Main class created via `f3.createChart(container, data)`. Handles:
- Tree visualization setup and configuration
- Card rendering (SVG or HTML)
- Layout orientation (horizontal/vertical)
- Tree depth control (ancestry/progeny)
- Person search dropdown

**EditTree** (`src/core/edit.ts`): Created via `chart.editTree()`. Handles:
- Form-based editing of person data
- Adding/removing relatives
- History (undo/redo) management
- Data export via `exportData()`

**CardSvg/CardHtml** (`src/core/cards/`): Card rendering implementations set via `chart.setCardSvg()` or `chart.setCardHtml()`.

### Key Directories

- `src/layout/`: Tree hierarchy calculation and link creation
- `src/renderers/`: SVG/HTML rendering, form creation, view updates
- `src/store/`: Data management, formatting, relationship operations
- `src/features/`: Modular features (autocomplete, history, kinships, modals)
- `src/types/`: TypeScript type definitions

### Data Format

Family tree data is an array of person objects:
```javascript
{
  "id": "unique-id",
  "data": { "gender": "M", "first name": "John", ... },
  "rels": {
    "parents": ["parent-id-1", "parent-id-2"],
    "spouses": ["spouse-id"],
    "children": ["child-id"]
  }
}
```

**Important**: Relationships must be bidirectional (if A is B's parent, B must be in A's children array).

**Legacy format**: Prior to v0.9.0, `father` and `mother` properties were used instead of `parents` array. The library auto-migrates but preserves original format on export.

## Build Output

Rollup produces three bundles in `dist/`:
- `family-chart.js` (UMD)
- `family-chart.esm.js` (ESM)
- `family-chart.min.js` (minified UMD)

Type declarations go to `dist/types/`. Styles are copied from `src/styles/` to `dist/styles/`.

## Testing

Tests use Cypress and are located in `cypress/e2e/`. The library uses live examples for e2e testing.
