# Bookshelf

A small book catalogue. One category, four books, a list page and a detail page.
The detail page is enriched by a single call to the Google Books API, made from a
Vercel Function so the credential never reaches the browser.

## Architecture

Angular is a static SPA; it is not the backend. The backend is one Vercel
Serverless Function at the repository root.

```
/
├── api/enrich.ts          the only Function, and the only outbound network call
├── server/                its logic and tests — outside api/ so Vercel does not
│                          turn each file into a Function of its own
├── shared/api-contract.ts the wire types, compiled by both sides
├── src/                   the Angular application
├── .env.example           the committed list of variable names — never values
├── proxy.conf.json        routes /api from `ng serve` to `vercel dev`
└── vercel.json            static output + the /api and SPA rewrites
```

The browser calls `/api/enrich?isbn=…`. That Function calls Google Books, reduces
the response to the handful of fields the page shows, and returns them. Google is
never called from the browser.

## Requirements

| Tool       | Version |
| ---------- | ------- |
| Node       | 24.19.0 |
| npm        | 11.17.0 |
| Vercel CLI | 59.19.0 |

Angular 22.1.6 pins TypeScript to `>=6.0 <6.1`; this project uses 6.0.3 exactly.
Installing TypeScript 7 breaks the build.

## Running it locally

```bash
npm install
cp .env.example .env
```

Then open `.env` and fill in the one value:

- `GOOGLE_BOOKS_API_KEY` — from <https://console.cloud.google.com>. Create a
  project, enable **Books API**, then **Credentials → API key**. No billing
  account is required. The key is read by `api/enrich.ts` on the server only.

Google rate-limits keyless requests to effectively zero, so the enrichment will
fail with `missing_configuration` until this is set. That is deliberate: the
Function refuses to make a keyless request rather than appearing to work.

### Both halves on one origin

```bash
npx vercel login       # once, opens a browser
npx vercel link        # once, connects this folder to a Vercel project
npx vercel dev         # serves the app and /api on http://localhost:3000
```

### With Angular's hot reload

`vercel dev` serves a production build, which is slow to iterate on. For UI work,
run both and let the proxy join them:

```bash
npx vercel dev         # terminal 1 — API on http://localhost:3000
npm start              # terminal 2 — app on http://localhost:4200
```

`proxy.conf.json` forwards `/api` from 4200 to 3000, so the browser still sees one
origin.

## Checks

```bash
npm run typecheck      # all three TS projects: app, spec, api
npm run build          # production build into dist/bookshelf/browser
npm test               # Angular tests, then the server tests
```

`npm test` runs two suites. `test:app` is Angular's Vitest via `@angular/build`,
scoped to `src/`. `test:server` is a plain Node Vitest over `server/`, because the
Function's code lives outside `src/` and needs no DOM.

No test touches the network or a real key.

## Deploying

Import the repository into Vercel. Vercel reads `vercel.json`, so the build
command and output directory need no configuration in the dashboard.

Add `GOOGLE_BOOKS_API_KEY` under **Settings → Environment Variables**, scoped to
Production and Preview. A variable added after a deployment does not reach it —
redeploy.

## House style

Conventions this codebase holds to, enforced by review rather than by the compiler:

- Every page opens with the same header block: eyebrow, `h1`, one muted sentence.
- Every list renders loading, empty, error and success. The empty state says what
  to do next; the error state says what failed and offers a retry.
- Dates render as `15 Sep 2026`, money as `12.50 JOD`, both through the shared
  formatters in `src/app/shared/formatters.ts` — never inline, never
  `toLocaleString`.
- External calls happen only in the Function, with a five-second timeout, and
  every failure returns `{ "error": { "code": …, "message": … } }`.
- Images have alt text, and anything from an external URL has explicit width and
  height.
