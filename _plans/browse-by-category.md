# Plan — Browse Books By Category

Saved verbatim from plan mode. Spec: `_specs/browse-by-category.md`.
Branch: `claude/feature/browse-by-category`. One session.

## Goal

Make all twelve books reachable by clicking, give each category its own address,
and keep `/books` showing the first category exactly as it does today.

## Approach

The list page already models four states and already reads a category through
`CatalogueService`. The change is therefore narrow: teach the route to carry a
slug, teach the page to read it, and add a navigation block above the grid.

`CatalogueService.listCategory` already throws `CategoryNotFoundError` for an
unknown slug, so the not-found path exists and only needs to be routed to rather
than swallowed into the error state. That distinction is the one piece of real
logic in this feature — the spec is explicit that an unknown slug is not-found,
not empty, and not a silent fallback.

## Steps

1. **Route.** Add `categories/:slug` to `app.routes.ts`, loading the same
   `BookListPage` component as `/books`. Keep `/books` as it is. Do not nest under
   `/books`, because `/books/:slug` is the detail route.

2. **Page input.** Give `BookListPage` an optional `slug` input, bound by the
   router's `withComponentInputBinding()` that is already configured. When it is
   absent, fall back to `catalogue.defaultCategorySlug` — that is what preserves
   `/books`.

3. **Not-found vs error.** In `load()`, catch `CategoryNotFoundError` separately
   from any other failure and set a new `missing` state. Render it with the house
   empty-state treatment plus a link back, matching how the detail page already
   handles a missing book. Every other throw stays the existing `error` state with
   its retry.

4. **Category navigation.** Add a `<nav>` above the grid containing one
   `routerLink` per category, rendered for every state including `missing`, so a
   visitor is never stranded. Mark the current one with `aria-current="page"` plus
   a visible treatment that survives greyscale — a filled background and weight,
   not colour alone.

5. **Reactivity.** The page currently loads once in the constructor. Move that
   into an `effect()` keyed on the slug input, the same pattern `BookDetailPage`
   already uses, so switching category re-loads rather than requiring a remount.

6. **Styles.** Add the nav styles to `styles.css` next to the existing page
   classes, using logical properties only.

7. **Tests.** Extend the Angular suite: an unknown slug produces `missing`, a known
   slug produces that category's books only, and absence of a slug produces the
   default category.

## Files

| File                              | Change                              |
| --------------------------------- | ----------------------------------- |
| `src/app/app.routes.ts`           | add `categories/:slug`              |
| `src/app/pages/book-list.ts`      | slug input, effect, `missing` state |
| `src/app/pages/book-list.html`    | category nav, `missing` state       |
| `src/styles.css`                  | nav styles                          |
| `src/app/pages/book-list.spec.ts` | new file                            |

Not touched: `book-detail.*`, `api/`, `server/`, `shared/`, `catalogue.ts`.

## Verification

- `npm run typecheck`, `npm run build`, `npm test`
- `site-reviewer` on the branch diff, BLOCKING findings fixed
- Playwright: visit `/books`, each of the three categories, and
  `/categories/does-not-exist`; confirm 4 + 4 + 4 book links and the not-found
  treatment
- Check the current-category marker with colour removed

## Risks

- **Reusing one component for two routes** is the main risk. If `/books` regresses
  while `/categories/:slug` works, the cause is the fallback in step 2.
- **`effect()` on a signal input** re-runs on every slug change including the first,
  so the constructor load must be removed or the page loads twice.
- The spec's non-goals exclude search and sorting. Do not add either while the nav
  is being built, however convenient it looks.
