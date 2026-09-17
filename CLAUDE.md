# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

An Arabic-literature catalogue. Angular 22 static SPA plus one Vercel Function.
The interface is Arabic and right-to-left.

## Commands

```bash
npm install
npm start                    # Angular dev server, http://localhost:4200
npx vercel dev               # app + /api on one origin, http://localhost:3000
npm run build                # production build into dist/bookshelf/browser
npm run typecheck            # all three TS projects; run this before any commit
npm test                     # Angular tests, then server tests
npx vitest run --config vitest.server.config.ts -t "returns timeout"   # one test
```

Never add a `dev` script that runs `vercel dev`. Vercel executes `package.json`'s
`dev` script as its dev command, so that makes it invoke itself and refuse to
start.

## Data shape

Categories and books live in `src/app/core/catalogue.ts`; their types are in
`src/app/core/models.ts`. There is no database and must not be one.

A book must have every one of these fields:

| Field             | Notes                                                        |
| ----------------- | ------------------------------------------------------------ |
| `slug`            | transliterated ASCII, used in the URL                        |
| `categorySlug`    | must match an existing category's `slug`                     |
| `title`, `author` | Arabic                                                       |
| `isbn13`          | 13 digits, must pass the checksum in `server/enrich-core.ts` |
| `publishedDate`   | ISO `YYYY-MM-DD`                                             |
| `priceJod`        | plain number, never a preformatted string                    |
| `coverAlt`        | Arabic alt text                                              |

Before adding a book, confirm its ISBN resolves in Google Books **and** that the
returned author is the real author. Google's Arabic metadata often credits a
critical study rather than the novel.

## Secrets

`GOOGLE_BOOKS_API_KEY` is the only secret. It lives in `.env`, which is gitignored.
`.env.example` is the committed list and holds **names only, never values**.

- It is read in exactly one place: `api/enrich.ts`, via `process.env`.
- It must never reach client code, a browser-exposed variable, or a committed file.
- The Function returns `missing_configuration` when it is unset rather than making
  a keyless request.
- In production it is set in Vercel under Settings → Environment Variables, scoped
  to Production and Preview. A variable added after a deployment does not reach it
  — redeploy.

Never add a wildcard such as `.env*` to `.gitignore`. It also matches
`.env.example` and silently stops it being committed. List env files individually.
`vercel link` has done this once already.

Check with: `git check-ignore -v .env .env.example` — it must name `.env` and stay
silent on `.env.example`.

## Rules

**Backend.** `api/` holds exactly one file. Vercel turns every file under `api/`
into its own Function, so new logic goes in `server/`, and spec files for the
Function stay in `server/` too. All external calls happen in the Function, never in
Angular, with a five-second timeout. Every failure returns
`{ "error": { "code": …, "message": … } }` and nothing else.

**Formatting.** Dates render as `15 Sep 2026`, money as `12.50 JOD` — two decimals
even though the dinar is conventionally three. Both go through
`src/app/shared/formatters.ts`. Never use `toLocaleString`, and never use Angular's
`date` or `currency` pipes: they vary with the visitor's locale.

**Pages.** Every page opens with `<app-page-header>`, including error pages. Every
list renders loading, empty, error and success — a bare spinner is a defect. The
empty state says what to do next; the error state says what failed and offers a
retry that repeats the failed call.

**RTL.** Latin-script values inside Arabic text are wrapped in `<span dir="ltr">`
— ISBNs, dates, prices, page counts. Use CSS logical properties
(`margin-inline-start`, not `margin-left`).

**Images.** Anything from an external URL needs explicit `width` and `height` plus
alt text. Decorative images use `alt=""`.

**Dependencies.** Every version in `package.json` is pinned exactly — no `^`, no
`~`. Angular 22 requires TypeScript `>=6.0 <6.1`; it is pinned at 6.0.3 and
TypeScript 7 breaks the build. `engines.node` is `24.x` rather than an exact pin
because Vercel rejects an exact patch version.

**Typecheck.** Do not use `tsc -b` — Angular's generated projects are not
`composite`. `npm run typecheck` runs the three projects explicitly.

## Definition of done

A change is not done until all of these pass:

1. `npm run typecheck`, `npm run build` and `npm test` all succeed.
2. The `site-reviewer` subagent has reviewed the branch diff and every BLOCKING
   finding is fixed. Run it before asking for review, not after.
3. The changed pages have been opened in a real browser through the Playwright MCP
   server, and the four states were checked — not just the happy path.
4. `git check-ignore -v .env .env.example` still names only `.env`.
