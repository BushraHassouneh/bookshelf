# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Bookshelf is a small Arabic-literature catalogue: one category, four books, a list
page and a detail page. The detail page is enriched by a single call to the Google
Books API, made from a Vercel Serverless Function so the credential never reaches
the browser.

The interface is Arabic and right-to-left.

## Commands

```bash
npm install                  # install dependencies
npm start                    # Angular dev server on http://localhost:4200
npx vercel dev               # app + /api on one origin, http://localhost:3000
npm run build                # production build into dist/bookshelf/browser
npm run typecheck            # all three TypeScript projects
npm test                     # Angular tests, then server tests
npm run test:app             # Angular tests only
npm run test:server          # server tests only
```

Run a single test file:

```bash
npx vitest run --config vitest.server.config.ts server/enrich-core.spec.ts
```

Run a single test by name:

```bash
npx vitest run --config vitest.server.config.ts -t "returns timeout"
```

## Architecture

Angular is a static SPA. It is not the backend. The backend is one Vercel
Serverless Function at the repository root.

```
api/enrich.ts          the only Function, and the only outbound network call
server/                its logic and tests
shared/api-contract.ts wire types, compiled by both sides
src/                   the Angular application
```

### Why the layout is like this

`api/` holds exactly one file because Vercel turns every file under `api/` into a
separate Function. The logic therefore lives in `server/enrich-core.ts`, which
`api/enrich.ts` imports. Spec files for the Function also live in `server/` for
the same reason — a spec file under `api/` would be deployed.

`shared/api-contract.ts` is the single source of truth for the request and
response shapes. It is included by both `tsconfig.app.json` and
`tsconfig.api.json`, so changing it breaks the typecheck on whichever side has not
been updated.

### Three TypeScript projects

| File | Covers | Notes |
|---|---|---|
| `tsconfig.app.json` | `src/`, `shared/` | `types: []` — no Node globals in browser code |
| `tsconfig.spec.json` | `src/**/*.spec.ts`, `shared/` | Vitest globals |
| `tsconfig.api.json` | `api/`, `server/`, `shared/` | `types: ["node"]` |

`tsc -b` does not work here — Angular's generated projects are not `composite`.
The typecheck script runs the three projects explicitly instead.

### The enrichment request

The browser calls `/api/enrich?isbn=…`. The Function validates the ISBN-13
checksum, calls Google Books with a five-second timeout, reduces the response to
eight fields, and returns them. Every failure returns the same envelope.

### Two test suites

`test:app` is Angular's Vitest via `@angular/build`, scoped to `src/` with jsdom.
`test:server` is a plain Node Vitest over `server/`. They are separate because the
Function's code lives outside `src/` and needs no DOM. No test touches the network
or a real key.

## Versions

Angular 22.1.6 requires TypeScript `>=6.0 <6.1`. This project pins 6.0.3 exactly.
Installing TypeScript 7 breaks the build. All dependencies are pinned exactly, with
no caret or tilde ranges.

Node 24.19.0. `engines.node` is `24.x` rather than an exact pin because Vercel
rejects an exact patch version.

## Conventions

- Dates render as `15 Sep 2026` and money as `12.50 JOD`, both through the shared
  formatters in `src/app/shared/formatters.ts`.
- Every page opens with the `app-page-header` component.
- Every list renders loading, empty, error and success states.
- External calls happen only in the Vercel Function.
- Latin-script values inside Arabic text are wrapped in `<span dir="ltr">`.
