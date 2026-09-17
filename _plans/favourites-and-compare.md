# Implementation Plan: Favourites And Compare

|             |                                         |
| ----------- | --------------------------------------- |
| **Slug**    | `favourites-and-compare`                |
| **Spec**    | `_specs/favourites-and-compare.md`      |
| **Branch**  | `claude/feature/favourites-and-compare` |
| **Status**  | In progress                             |
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

| Phase | Name                             | Status      |
| ----- | -------------------------------- | ----------- |
| 1     | The favourites store             | Done        |
| 2     | Marking, and the masthead count  | Not started |
| 3     | Batch enrichment in the Function | Not started |
| 4     | The comparison page              | Not started |

No files have been changed for this feature yet. The spec is committed; nothing
else.

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

- [ ] Add a toggle button component under `src/app/shared/`.
- [ ] Use it on the book card in `book-list.html`.
- [ ] Use it on `book-detail.html`.
- [ ] Add the count and a link to the comparison page in `app.html`.
- [ ] Add styles to `styles.css`, logical properties only.
- [ ] Extend the page specs to cover marking from both pages.

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

- [ ] Marking on the list page, reloading, and returning shows it still marked.
- [ ] Marking on the detail page does the same.
- [ ] Clicking the button does not navigate to the book.
- [ ] The count updates without a reload.
- [ ] `npm run typecheck`, `npm run build` and `npm test` pass.

## Phase 3: Batch enrichment in the Function

### Tasks

- [ ] Extend `server/enrich-core.ts` to accept an `isbns` list parameter.
- [ ] Validate every member, and cap the count.
- [ ] Fetch them together, reporting per-ISBN success or absence.
- [ ] Keep the single-`isbn` response shape exactly as it is.
- [ ] Add the batch types to `shared/api-contract.ts`.
- [ ] Extend `server/enrich-core.spec.ts`.

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

- [ ] `?isbn=` behaves exactly as before — the existing tests still pass unchanged.
- [ ] `?isbns=a,b` returns an entry for each.
- [ ] One malformed member rejects the whole request with `invalid_request`.
- [ ] More than the cap rejects with `invalid_request` and calls nothing upstream.
- [ ] An unknown ISBN among known ones is reported as absent, not as a failure.
- [ ] The key never appears in any response body.

## Phase 4: The comparison page

### Tasks

- [ ] Add `src/app/pages/compare.ts` and `compare.html`.
- [ ] Route `/compare`.
- [ ] Model the four states as a discriminated union.
- [ ] Render a table with the books as columns and the fields as rows.
- [ ] Allow removing a book in place.
- [ ] Add styles.
- [ ] Add `compare.spec.ts`.

### Technical details

The page reads its books from the store synchronously and fetches their detail in
one request. The books are therefore visible while the detail is still loading,
which is what the loading state should say — not that the page is loading.

A failed fetch leaves the local columns intact and only the fetched rows missing.
That is the error state: the page is still useful.

Removing the last favourite leaves the empty state, which must render rather than
leaving a blank page.

### Done when

- [ ] Every acceptance criterion in the spec is met.
- [ ] Exactly one `/api` request is made regardless of the number of books.
- [ ] `site-reviewer` reports no BLOCKING findings.
- [ ] The browser pass has been done, including at phone width.

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

## Session log

One entry per session, including the reviewer's actual result.

| Date       | Phases touched | Notes                                                                                                                                                                                                      |
| ---------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-17 | 1              | Store written and covered. 16 new tests, 36 Angular tests total, typecheck clean. Two `localStorage` failure modes tested by making it throw — private windows and quota. Reviewer not yet run this phase. |
