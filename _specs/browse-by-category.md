# Browse Books By Category

|             |                                     |
| ----------- | ----------------------------------- |
| **Slug**    | `browse-by-category`                |
| **Branch**  | `claude/feature/browse-by-category` |
| **Status**  | Draft                               |
| **Created** | 2026-09-17                          |

## 1. Summary

The catalogue holds three categories but the list page shows only the first one,
so two thirds of the books cannot be reached from the interface at all. This adds
a way to move between categories: the list page gains a set of category links, and
each category has its own address.

A visitor can then see every book the shop stocks, and can link someone directly
to a category rather than to the whole shelf.

## 2. Problem

`/books` renders whatever `CatalogueService.defaultCategorySlug` returns, which is
the first entry in `CATEGORIES`. That was correct when the catalogue had one
category. It now has three — الأدب العربي, تاريخي, ديني — and twelve books, of
which only four are visible.

The other eight are not broken. Their detail pages render correctly if the address
is typed by hand. They are simply unreachable by clicking, which is worse than
missing: the data suggests a shop that stocks them and an interface that hides
them.

Adding a category is already a one-command job, so this gap widens every time that
command is used.

## 3. Goals and non-goals

**Goals**

- Every book in the catalogue is reachable from the list page by clicking.
- Each category has its own address that can be shared and bookmarked.
- A visitor can tell which category they are currently looking at.
- Adding a category to the data module surfaces it in the interface with no
  further code change.

**Non-goals**

- Searching or filtering within a category. That is a separate feature and would
  change the shape of this one.
- Sorting. The order in the data module is the order shown.
- Nesting categories, or a book belonging to more than one category.
- A landing page that lists categories on their own, without books.
- Pagination. Twelve books, and the catalogue is not expected to reach a size
  where a single category needs paging.
- Changing the detail page in any way.

## 4. User stories

- As a visitor, I want to see which categories exist, so that I know what the shop
  stocks beyond the page I landed on.
- As a visitor, I want to switch to another category in one click, so that I can
  browse without editing the address bar.
- As a visitor, I want to send someone a link to a category, so that they see what
  I saw rather than the default.
- As a maintainer, I want a category added to the data module to appear
  automatically, so that `/add-category` stays a data-only change.

## 5. User experience

**Entry point** — The masthead link كل الكتب, and any direct link to a category
address.

**Main flow**

1. The visitor opens `/books` and sees the first category, as today.
2. Above the book grid they see every category name, the current one marked as
   current.
3. They click تاريخي.
4. The address becomes `/categories/tarikhi`, the heading and the muted sentence
   change to that category's name and description, and the grid shows that
   category's books.
5. They click a book and reach its detail page, unchanged from today.
6. The browser back button returns them to the category they came from, not to the
   default.

**States**

| State   | Behaviour                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Loading | The existing message, naming what is loading. The category links are part of the page chrome and need not wait for the books.        |
| Empty   | The category exists but holds no books. Says so, and says what to do next. The category links stay visible so the visitor can leave. |
| Error   | The category could not be loaded. Says what failed and offers a retry that repeats the load. The category links stay visible.        |
| Success | The category's books in a grid, as today.                                                                                            |

**Interaction details** — The current category is marked so it is distinguishable
without relying on colour alone. Category links are real links, so they can be
opened in a new tab and followed by keyboard. An unknown category slug in the
address is a not-found condition, not an empty category, and must not silently
fall back to the default. Navigating between categories does not lose scroll
position in a way that strands the visitor at the bottom of a longer list.

**Accessibility** — The category links are a navigation landmark with an
accessible name. The current category is conveyed to assistive technology, not
only visually. The set is reachable and operable by keyboard in reading order, and
focus is visible on each link. The heading level structure is unchanged: one `h1`
per page.

## 6. Interface contract

No server involvement. The catalogue is a committed module read in the browser,
and this feature adds no request to `/api`.

| Operation             | Trigger                       | Purpose                        | Success result                       |
| --------------------- | ----------------------------- | ------------------------------ | ------------------------------------ |
| List categories       | Page load                     | Render the navigation          | Every category, in data order        |
| List books a category | Page load, or category change | Render the grid for a category | That category's books, in data order |

**Inputs**

| Field         | Type   | Required | Rules                                                                       |
| ------------- | ------ | -------- | --------------------------------------------------------------------------- |
| category slug | string | No       | From the `/categories/:slug` segment. Absent, at `/books`, means the first. |

**Outputs**

| Field                | Type   | Notes                                  |
| -------------------- | ------ | -------------------------------------- |
| category name        | string | Becomes the page heading               |
| category description | string | Becomes the muted sentence             |
| books                | list   | May be empty, which is the empty state |

**Errors**

| Condition                   | Status / code | What the user sees                                        |
| --------------------------- | ------------- | --------------------------------------------------------- |
| Slug matches no category    | not-found     | The not-found page, with its header block and a way back  |
| Category resolves, no books | empty         | The empty state, with the category links still present    |
| Catalogue fails to load     | error         | The error state, saying what failed, with a working retry |

## 7. Data model

No change. `CATEGORIES` and `BOOKS` in `src/app/core/catalogue.ts` already carry
everything this needs: each category has `slug`, `name` and `description`, and each
book has `categorySlug`.

**New or changed records**

| Field | Type | Required | Constraints / default |
| ----- | ---- | -------- | --------------------- |
| None  |      |          |                       |

**Access patterns** — Two questions: what categories exist, and which books belong
to a given slug. Both are answered by a linear pass over a module of a dozen
entries, so no index is implied.

**Migration impact** — None. No schema, no persisted data, nothing to backfill.

**Retention and growth** — The catalogue grows only when someone commits to it.
A category with many books would eventually want paging; that is recorded as a
follow-up rather than built now.

## 8. Validation rules

| Rule                                                        | Message                                | Enforced |
| ----------------------------------------------------------- | -------------------------------------- | -------- |
| A category slug in the address must exist in `CATEGORIES`   | The not-found page                     | Client   |
| Every book's `categorySlug` must match an existing category | Build-time failure, not a user message | Both     |

The second rule is the more important one and is not new: a book pointing at a
category that does not exist would silently disappear from every list. This
feature makes that failure visible because every category is now browsable.

## 9. Background and scheduled work

None.

## 10. Security and access

The catalogue is public and this feature adds no request, no credential and no
user input that reaches a query, a file path or a shell. The only untrusted value
is the category slug from the address, which is compared against a fixed list and
never used to construct anything.

## 11. Performance and scale

Twelve books and three categories, all in the initial bundle already. Filtering is
a linear pass over a dozen items on navigation. Nothing here grows with anything
except the size of the committed data module, and that grows only by commit.

The category links add a small, fixed amount of markup to one page.

## 12. Testing

**Integration** — Navigating from the default category to another changes the
heading, the muted sentence and the books shown. A direct link to a category
address renders that category without passing through the default.

**Unit** — Selecting books by category slug returns only that category's books.
An unknown slug is reported as not-found rather than returning an empty list, so
the two conditions cannot be confused.

**Frontend** — The current category is marked as current. Each of the four states
renders. An empty category still shows the category links.

**Manual** — Keyboard order through the category links is sensible and focus is
visible. The layout holds at phone width with three categories. The reading order
is correct in right-to-left.

## 13. Acceptance criteria

Each line is independently checkable and phrased so it is unambiguously true or
false.

- [ ] Starting at `/books` and clicking only links, all twelve books can be
      reached. Verified by visiting each of the three categories and counting
      4 + 4 + 4 book links.
- [ ] `/categories/tarikhi` opened directly renders تاريخي without first showing
      الأدب العربي.
- [ ] On `/categories/dini` the `h1` reads ديني and the muted sentence is that
      category's `description` string from `catalogue.ts`, character for
      character.
- [ ] The current category link carries `aria-current="page"`, and is
      distinguishable with colour removed — verified by forcing greyscale.
- [ ] `/categories/does-not-exist` renders the not-found page. It does not render
      the default category, and it does not render an empty grid.
- [ ] A category whose books are all removed from `catalogue.ts` renders the empty
      state, and the category links remain visible on that page.
- [ ] Adding a fourth category to `catalogue.ts` and touching no other file makes
      it appear in the links and become browsable.
- [ ] `/books` still renders الأدب العربي, unchanged from before this feature.
- [ ] The category links are inside a `<nav>` with an accessible name, and every
      link is reachable by Tab with a visible focus ring.
- [ ] `npm run typecheck`, `npm run build` and `npm test` all pass.
- [ ] `site-reviewer` reports no BLOCKING findings.
- [ ] `git diff main --stat` shows no change to `book-detail.html`,
      `book-detail.ts`, `api/`, `server/` or `shared/`.

## 14. Open questions

All three questions raised in the first draft have been answered. They are kept
here with their answers rather than deleted, so the reasoning survives.

| Question                                                            | Decision                                 | Why                                                                                                                                        |
| ------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Should `/books` keep showing the first category, or list all books? | Keep showing the first category          | An "all books" page needs a heading and a muted sentence that exist nowhere in the data, so it would force invented copy into the header.  |
| What shape should a category address take?                          | `/categories/:slug`                      | `/books/:slug` is already the detail route. Anything nested under `/books` risks an ambiguity that is cheap to avoid and expensive to fix. |
| Where do the category links belong?                                 | Above the book grid, not in the masthead | They filter the grid, so they sit with it. The masthead is a two-item gradient bar and does not survive `/add-category` being used again.  |

None remain open.

## 15. Out of scope and follow-ups

- Search within a category.
- Sorting by price or publication date.
- Paging, once any single category outgrows one screen.
- A category index page listing categories with book counts.
- Surfacing the category on the book detail page, with a link back to it.
