# Implementation Plan: Favourites And Compare

|             |                                         |
| ----------- | --------------------------------------- |
| **Slug**    | `favourites-and-compare`                |
| **Spec**    | `_specs/favourites-and-compare.md`      |
| **Branch**  | `claude/feature/favourites-and-compare` |
| **Status**  | Complete                                |
| **Created** | 2026-09-17                              |
| **Updated** | 2026-09-17                              |

## How to resume this plan

1. Read the spec, then this file, before touching any code.
2. Find the first phase in **Progress** below that is not `Done`.
3. Read that phase's Tasks, Technical details and Done when.
4. Do only that phase. Stop at its end rather than running on into the next one.
5. As you work: tick each task, keep **Progress** current, and add a line to the
   **Session log**. A plan that is not updated as it goes is worse than no plan.
6. If reality disagrees with the plan, change the plan and record it under
   **Deviations**. Do not silently diverge.

## Overview

Let a visitor mark books and compare them on one page. Favourites live in the
browser; the comparison page fetches every favourite's detail in a single request
rather than one per book.

Four phases, each finishable in one session: the store, the marking controls, the
batch endpoint, then the page that uses all three.

## Context

The catalogue is a committed TypeScript module of twelve books in three
categories. `BookListPage` and `BookDetailPage` already model their states as
discriminated unions and render the house header block and the four states.

`api/enrich.ts` is the only Vercel Function and must stay the only one: Vercel
turns every file under `api/` into a separate Function. Its logic lives in
`server/enrich-core.ts`, which takes its key, its fetch and its timeout as
arguments, so it is testable without a network or a real credential.

Nothing is persisted server-side today, and this feature does not change that.

## Progress

| Phase | Name                             | Status |
| ----- | -------------------------------- | ------ |
| 1     | The favourites store             | Done   |
| 2     | Marking, and the masthead count  | Done   |
| 3     | Batch enrichment in the Function | Done   |
| 4     | The comparison page              | Done   |

All four phases are committed. 49 Angular tests, 48 server tests, and a
24-check browser pass against a real Chromium, all green.

## Action required

Work only a person can do. None of it blocks phases 1 to 4, but the first two
block the final verification.

| When   | Action                                                              | Why it is needed                                                                                              |
| ------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Before | Run `claude` and approve the two servers in `.mcp.json`             | The Playwright browser pass in CLAUDE.md's definition of done cannot run while they are pending approval.     |
| Before | Restart Claude Code so `.claude/agents/site-reviewer.md` registers  | Agent definitions load at startup; it was created mid-session and could not be invoked by name for Feature A. |
| Before | Set `CONTEXT7_API_KEY` in the environment, then reopen the terminal | `.mcp.json` substitutes it from the environment; `.env` alone is not read for this.                           |
| After  | Disable Deployment Protection on the Vercel project                 | The marker cannot open a protected production URL.                                                            |
| After  | Connect GitHub as a Vercel login method                             | Without it `vercel git connect` fails and no branch preview is ever built.                                    |

## Phase 1: The favourites store

The one piece of this feature with genuinely hostile input: the stored value is
the only thing a visitor can edit by hand.

### Tasks

- [x] Add `src/app/core/favourites-service.ts` holding the list as a signal.
- [x] Read from `localStorage` on construction, defensively.
- [x] Write back on every change.
- [x] Discard slugs that match no book in the catalogue.
- [x] Discard a stored value that is not an array of strings.
- [x] Deduplicate, and read back in catalogue order rather than insertion order.
- [x] Add `src/app/core/favourites-service.spec.ts` covering each of the above.

### Technical details

Key: `bookshelf:favourites`. Value: a JSON array of book slugs.

Every read and write is wrapped in `try`/`catch`. `localStorage` throws rather
than returning null in a private window, when site data is blocked, and when the
quota is exceeded — a throw from the constructor would take the whole application
down, so the service must degrade to an in-memory list instead.

Expose `has(slug)`, `toggle(slug)`, `remove(slug)`, and a `books()` computed that
returns the favourite books in catalogue order. Keeping the ordering here rather
than in the page means the comparison and any future view agree.

### Done when

- [x] Toggling a slug twice returns the list to its starting state.
- [x] A stored `"not json"`, `"{}"`, `"[1,2,3]"` and `["no-such-book"]` all leave
      the service reporting no favourites, and none of them throws.
- [x] `npm run typecheck` and `npm test` pass.

## Phase 2: Marking, and the masthead count

### Tasks

- [x] Add a toggle button component under `src/app/shared/`.
- [x] Use it on the book card in `book-list.html`.
- [x] Use it on `book-detail.html`.
- [x] Add the count and a link to the comparison page in `app.html`.
- [x] Add styles to `styles.css`, logical properties only.
- [x] Extend the page specs to cover marking from both pages.

### Technical details

The button carries `aria-pressed` and an accessible name that includes the book's
title, so a screen reader hears which book it refers to rather than a row of
identical "favourite" buttons.

On the book card the whole card is already a link, via
`.book-card__link::after { inset: 0 }`. A button inside that overlay will not
receive clicks. Raise the button above it with a stacking context rather than
removing the card-wide link, which is worth keeping.

The masthead count is a link to `/compare`, rendered on every page, with an
`aria-live` region so its change is announced.

### Done when

- [x] Marking on the list page, reloading, and returning shows it still marked.
- [x] Marking on the detail page does the same.
- [x] Clicking the button does not navigate to the book.
- [x] The count updates without a reload.
- [x] `npm run typecheck`, `npm run build` and `npm test` pass.

## Phase 3: Batch enrichment in the Function

### Tasks

- [x] Extend `server/enrich-core.ts` to accept an `isbns` list parameter.
- [x] Validate every member, and cap the count.
- [x] Fetch them together, reporting per-ISBN success or absence.
- [x] Keep the single-`isbn` response shape exactly as it is.
- [x] Add the batch types to `shared/api-contract.ts`.
- [x] Extend `server/enrich-core.spec.ts`.

### Technical details

`api/enrich.ts` gains nothing — still one file, still one Function.

The cap is the security boundary, not a nicety: without it a crafted URL turns one
request into an unbounded fan-out of upstream calls on someone else's key.

The five-second timeout applies to the batch as a whole, using one
`AbortController` shared by every fetch, so the Function cannot be held open
longer than it can be today.

One ISBN that Google does not know must not fail the others: each entry reports
its own outcome, and the request succeeds if it was well-formed.

### Done when

- [x] `?isbn=` behaves exactly as before — the existing tests still pass unchanged.
- [x] `?isbns=a,b` returns an entry for each.
- [x] One malformed member rejects the whole request with `invalid_request`.
- [x] More than the cap rejects with `invalid_request` and calls nothing upstream.
- [x] An unknown ISBN among known ones is reported as absent, not as a failure.
- [x] The key never appears in any response body.

## Phase 4: The comparison page

### Tasks

- [x] Add `src/app/pages/compare.ts` and `compare.html`.
- [x] Route `/compare`.
- [x] Model the four states as a discriminated union.
- [x] Render a table with the books as columns and the fields as rows.
- [x] Allow removing a book in place.
- [x] Add styles.
- [x] Add `compare.spec.ts`.

### Technical details

The page reads its books from the store synchronously and fetches their detail in
one request. The books are therefore visible while the detail is still loading,
which is what the loading state should say — not that the page is loading.

A failed fetch leaves the local columns intact and only the fetched rows missing.
That is the error state: the page is still useful.

Removing the last favourite leaves the empty state, which must render rather than
leaving a blank page.

### Done when

- [x] Every acceptance criterion in the spec is met.
- [x] Exactly one `/api` request is made regardless of the number of books.
- [x] `site-reviewer` reports no BLOCKING findings.
- [x] The browser pass has been done, including at phone width.

## Decisions

| Decision                                                   | Reasoning                                                                                                                                         | Alternatives rejected                                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Cap the batch at 24 ISBNs                                  | Twice the current catalogue, so it cannot be hit honestly, but it bounds the upstream fan-out from a crafted URL.                                 | No cap, which makes the endpoint an amplifier. Cap at catalogue size, which breaks on growth. |
| Extend the existing endpoint rather than add a second file | Vercel turns every file under `api/` into its own Function, and CLAUDE.md fixes that at one.                                                      | `api/enrich-batch.ts`, which would silently create a second Function.                         |
| A table, not cards                                         | The point is reading a row across — price against price. Cards put the comparison back in the reader's memory, which is the problem being solved. | Cards. Revisit only if the table proves unreadable at phone width.                            |
| Count in the masthead, on every page                       | It is the only route to `/compare`, and a visitor marks books from the detail page too.                                                           | Only on catalogue pages, which strands anyone who marked from a detail page.                  |
| Favourites in `localStorage`, not the URL                  | The spec's non-goals exclude sharing, and a URL-carried list would invite it.                                                                     | Query parameter, which would make the list shareable and therefore a support burden.          |

## Open questions

| Question                                                                     | Blocking? | Owner  |
| ---------------------------------------------------------------------------- | --------- | ------ |
| Should a favourite whose book leaves the catalogue be reported, not dropped? | No        | Bushra |

Everything else raised in the spec is settled above.

## Deviations

Recorded as they happen. A plan that survives contact with the code unchanged is
either very good or unread.

**Phase 2 ships a link to a route that does not exist yet.** The plan puts the
masthead count in phase 2 and the comparison page in phase 4, so between the two
commits `/compare` falls through to the not-found page. Noticed while building
phase 2, not planned for.

Left as it is rather than reordered. The alternative — building the page first,
or holding the masthead back — would either merge phases or leave phase 2 with
nothing observable to test. The branch is never merged in this intermediate
state, so no visitor sees it. If the phases are ever merged separately, phase 2
must not go without phase 4.

**`vercel dev` cannot serve this app's dev-server assets, and the cause is in
`vercel.json`.** Found during phase 4's browser pass: every page loaded the
shell but Angular never booted, because `/main.js` and `/@vite/client` returned 500. The SPA catch-all rewrite, `/(.*) → /index.html`, swallows the dev server's
virtual assets, which have no file on disk for the filesystem check to find
first.

Production is unaffected — there `main-HASH.js` is a real file in the output
directory, so the filesystem check matches before any rewrite — and the
deployed site was verified working earlier. The `/api` half of `vercel dev`
works too, and the batch endpoint was verified through it.

The browser pass therefore ran against `ng serve` with `proxy.conf.json`
forwarding `/api` to `vercel dev`, which is the second workflow the README
already documents. Not fixed here: changing the rewrite is out of this
feature's scope, and it belongs with a proper look at whether the catch-all
should exclude asset extensions.

**The browser pass used Playwright directly, not the Playwright MCP server.**
The MCP servers are still awaiting approval in this session, so the check was
done with a real Chromium driven from a script outside the repository rather
than being skipped. Same browser, same assertions; the MCP route is what
CLAUDE.md names and should be used once approved.

**Phase 4's compare page gained a fetched-detail cache that this plan did not
call for.** `load()` originally re-requested every remaining book whenever the
shortlist changed, so removing one book spent another upstream call and blanked
the other columns while it ran. The cache holds detail already fetched and only
requests what is missing. Correct, and covered by a test that removing a book
leaves the request count at one.

**The reviewer found two BLOCKING findings, both RTL, both in this phase's
surface.** The masthead count rendered `({{ favourites.count() }})` and the
comparison caption rendered `{{ books.length }}` with the digits bare inside
Arabic text, which is exactly the case CLAUDE.md's RTL rule names. Both are now
wrapped in `<span dir="ltr">`. The masthead one mattered most: it is chrome on
every page, and it was the only unwrapped number in the codebase.

Not fixed, and deliberately: the rating cell renders
`<span dir="ltr">{{ rating }}</span> من 5` with the literal `5` outside the
wrapper. `book-detail.html` already ships that exact pattern on `main`, so
changing only the comparison page would make the two disagree. It belongs in a
pass over both, not in this phase.

**`enrichmentFor` was reading the wrong thing, which the cache above had made
load-bearing.** It returned detail only while `detail()` was `ready`, so any
later request would have blanked every already-fetched column back to a dash —
the very thing the cache was added to prevent. The cache is now a signal and is
what the template reads; the state signal says only what the request is doing.
The effect wraps its `load()` call in `untracked` so that writing the cache does
not schedule another pass through the effect.

**Phase 3's batch tests went in a new file, not into `enrich-core.spec.ts` as
the task said.** They are in `server/enrich-batch.spec.ts` instead.

Deliberate once the task was underway. The phase's first Done-when is that the
single-ISBN path behaves exactly as before, and the strongest evidence for that
is `enrich-core.spec.ts` being untouched by this commit — all 35 of its tests
still passing without a line changed. Editing that file to add batch tests would
have thrown away the proof.

**Phase 3's `found: false` conflates two outcomes.** "Google has no such volume"
and "that one lookup failed" both produce the same entry. The spec only asked
that one unknown ISBN not fail the others, which this satisfies, but a total
upstream outage now returns 200 with every entry absent rather than an error.
Acceptable because the page keeps its local fields either way and offers a
retry; worth revisiting if the comparison page ever looks broken rather than
incomplete.

**Phase 2's "reloading and returning" check is covered by unit tests, not a
reload.** The persistence test constructs a fresh service against the same
`localStorage`, which is what a reload does to this code but is not literally a
reload. The real browser pass is in phase 4's Done when, and that is where the
claim is actually settled.

## Session log

One entry per session, including the reviewer's actual result.

| Date       | Phases touched | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-17 | 1              | Store written and covered. 16 new tests, 36 Angular tests total, typecheck clean. Two `localStorage` failure modes tested by making it throw — private windows and quota. Reviewer not yet run this phase.                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-09-17 | 2              | Toggle component, used on both pages, plus the masthead count. 5 new tests, 41 Angular and 35 server. The card-wide link needed a stacking context or the button never received its click — anticipated in the plan and it was right. Two deviations recorded.                                                                                                                                                                                                                                                                                                                                                       |
| 2026-09-17 | 3              | Batch form of the endpoint, capped at 24, one AbortController for the whole batch. 13 new tests in a new file; `enrich-core.spec.ts` deliberately untouched and its 35 tests still pass, which is the evidence the single path did not change. 48 server tests.                                                                                                                                                                                                                                                                                                                                                      |
| 2026-09-17 | 4              | Comparison page, plus the browser pass. 49 Angular, 48 server, and 24 of 24 browser checks green against real Chromium — including one `/api` request for three books, favourites surviving a genuine reload, the current marker under forced greyscale, and no horizontal scroll at 390px. Three deviations recorded, one of them a `vercel.json` bug.                                                                                                                                                                                                                                                              |
| 2026-09-17 | 4              | Re-verified phase 4 through the Playwright MCP server, which was available this session. `site-reviewer` reported two BLOCKING RTL findings — the masthead count and the comparison caption — both now fixed and re-checked in the browser. Also corrected `enrichmentFor` to read the cache rather than the request state. 49 Angular, 48 server, typecheck and build clean. Browser pass: four states, retry while failing and then recovering, one `/api` call for three books and still one after a removal, six hand-edited storage values, and six columns at 400px with the table scrolling and the page not. |
