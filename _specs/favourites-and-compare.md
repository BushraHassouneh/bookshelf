# Favourites And Compare

|             |                                         |
| ----------- | --------------------------------------- |
| **Slug**    | `favourites-and-compare`                |
| **Branch**  | `claude/feature/favourites-and-compare` |
| **Status**  | Draft                                   |
| **Created** | 2026-09-17                              |

## 1. Summary

A visitor can mark books as favourites and then open a page that puts those books
side by side, with the details that currently require opening each book in turn:
publisher, page count, rating and price.

Favourites live in the visitor's own browser. Nothing is stored on the server and
no account is involved.

## 2. Problem

The catalogue has twelve books across three categories, and the only way to
compare two of them is to open one detail page, remember what it said, and open
another. Each detail page costs a separate call to Google Books, and the numbers
worth comparing — price, page count, rating — are exactly the ones that are hard
to hold in memory.

The comparison a book buyer actually makes is between a shortlist, not between a
book and nothing.

## 3. Goals and non-goals

**Goals**

- A visitor can mark and unmark any book as a favourite from where they already
  are: the list page and the detail page.
- Favourites survive a page reload and a browser restart.
- A single page shows every favourite together, with the fields worth comparing
  aligned in columns.
- That page fetches its extra detail in one request rather than one per book.

**Non-goals**

- Accounts, sign-in, or favourites that follow a visitor between devices.
- Sharing a comparison by URL. The list lives in the browser, so a link would not
  carry it.
- Sorting or reordering the comparison. Favourites appear in catalogue order.
- A limit on how many books can be compared, beyond what the layout tolerates.
- Any change to how a single book's detail page fetches its own enrichment.
- Recommendations, "similar books", or anything that infers taste from the list.

## 4. User stories

- As a visitor, I want to mark a book while browsing a category, so that I do not
  lose it when I navigate away.
- As a visitor, I want my marks to still be there tomorrow, so that I can think
  about a purchase overnight.
- As a visitor, I want to see my shortlist side by side, so that I can compare
  price and length without opening four pages.
- As a visitor, I want to remove a book from the comparison while looking at it,
  so that I can narrow down in place.

## 5. User experience

**Entry point** — A control on each book card and on each detail page, plus a link
in the masthead showing how many favourites are held.

**Main flow**

1. The visitor browses a category and marks two books.
2. The masthead link updates to show the count.
3. They open another category and mark a third.
4. They follow the masthead link to the comparison page.
5. The three books appear together, each with publisher, page count, rating and
   price, aligned so the rows can be read across.
6. They remove one from the comparison, and it disappears without a reload.
7. They close the browser, return the next day, and the remaining two are still
   there.

**States**

| State   | Behaviour                                                                                                                                           |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading | The favourites are known immediately; their extra detail is not. Says that details are being fetched, with the books already visible.               |
| Empty   | No favourites held. Explains what the page is for and how to add one, with a link back to the catalogue. This is the first state most visitors see. |
| Error   | The detail request failed. The books stay on screen with their local fields; only the fetched columns are missing. Says what failed, offers retry.  |
| Success | Every favourite with its fetched detail.                                                                                                            |

**Interaction details** — The mark control is a toggle that states what it will do
and reflects what is currently true, so it is understandable without colour. It
does not navigate. Removing the last favourite from the comparison leaves the
empty state, not a blank page. A favourite whose book has since been removed from
the catalogue is dropped silently rather than rendered as a gap.

**Accessibility** — The toggle is a real button with an accessible name naming the
book, not just "favourite". Its pressed state is exposed to assistive technology.
The count in the masthead is announced when it changes. The comparison is a table
with proper headers, so a screen reader can read a row across.

## 6. Interface contract

The comparison page needs detail for several books at once. The existing endpoint
takes one ISBN, and calling it per book would mean one request per favourite.

The endpoint is extended to accept a list. It remains the only Function, because
Vercel turns every file under `api/` into its own.

| Operation      | Trigger              | Purpose                    | Success result                  |
| -------------- | -------------------- | -------------------------- | ------------------------------- |
| Enrich one     | Detail page load     | Detail for one book        | One enrichment object, as today |
| Enrich several | Comparison page load | Detail for every favourite | One enrichment object per ISBN  |

**Inputs**

| Field   | Type   | Required       | Rules                                                               |
| ------- | ------ | -------------- | ------------------------------------------------------------------- |
| `isbn`  | string | One of the two | A single ISBN-13, as today. Unchanged behaviour.                    |
| `isbns` | string | One of the two | Comma-separated ISBN-13s. Each validated. A capped maximum applies. |

**Outputs**

| Field     | Type | Notes                                                               |
| --------- | ---- | ------------------------------------------------------------------- |
| existing  | —    | The single-ISBN response shape is unchanged.                        |
| `results` | list | For the list form: one entry per requested ISBN, each found or not. |

A book Google does not know must not fail the whole request. The response says
which ISBNs resolved and which did not.

**Errors**

| Condition                        | Status / code                        | What the user sees                  |
| -------------------------------- | ------------------------------------ | ----------------------------------- |
| Neither `isbn` nor `isbns` given | 400 `invalid_request`                | The error state with a retry        |
| Any ISBN malformed               | 400 `invalid_request`                | The error state with a retry        |
| More ISBNs than the cap          | 400 `invalid_request`                | The error state with a retry        |
| Credential missing               | 500 `missing_configuration`          | The error state; books still listed |
| Upstream slow or unreachable     | 504 `timeout` / 502 `external_error` | The error state; books still listed |

## 7. Data model

No change to the committed catalogue. Favourites are a separate, per-browser list.

**New or changed records**

| Field   | Type     | Required | Constraints / default                       |
| ------- | -------- | -------- | ------------------------------------------- |
| `slugs` | string[] | Yes      | Book slugs, unique, catalogue order on read |

**Access patterns** — Two questions: is this book a favourite, and what are all
the favourites. Both are answered from a list of at most a few dozen strings held
in the browser.

**Migration impact** — None. Nothing persisted server-side, nothing to backfill.
A stored list from a previous version of the site must not crash the page; unknown
slugs are discarded on read.

**Retention and growth** — Bounded by the size of the catalogue, since only real
books can be marked. Storage is the visitor's own and is never sent anywhere.

## 8. Validation rules

| Rule                                                   | Message                  | Enforced |
| ------------------------------------------------------ | ------------------------ | -------- |
| Every ISBN passes the ISBN-13 checksum                 | `invalid_request`        | Server   |
| The number of ISBNs does not exceed the cap            | `invalid_request`        | Both     |
| A stored favourite matches a book in the catalogue     | Silently dropped         | Client   |
| Stored data that is not a list of strings is discarded | Treated as no favourites | Client   |

The last two matter more than they look: the stored value is the one input to this
feature that a visitor can edit by hand.

## 9. Background and scheduled work

None.

## 10. Security and access

Favourites are not sent to the server, so nothing new is stored about a visitor.
The list form of the endpoint accepts more input than before, so its validation is
the security boundary: every ISBN is checksum-validated before any of it reaches
an outbound URL, and the number of them is capped so one request cannot be turned
into many upstream calls.

The page is public. No credential reaches the browser, as before.

## 11. Performance and scale

The comparison page makes one request regardless of how many books are being
compared. That request makes one upstream call per ISBN, which is why the cap
exists — without it a crafted URL turns one request into an unbounded fan-out.

The five-second timeout continues to apply to the request as a whole, not per
book, so a slow upstream cannot hold the Function open for longer than it does
today.

## 12. Testing

**Integration** — Marking a book on the list page and reloading leaves it marked.
The comparison page renders every favourite. Removing the last one shows the empty
state.

**Unit** — The store discards unknown slugs, non-list stored values, and duplicate
entries. The endpoint accepts a list, rejects a malformed member, rejects more
than the cap, and reports a not-found ISBN without failing the others.

**Frontend** — The toggle reflects and announces its state. The count updates. All
four states of the comparison page render.

**Manual** — The table is readable at phone width. The toggle is understandable
with colour removed. Reading order is correct right-to-left.

## 13. Acceptance criteria

- [ ] Marking a book on the list page, reloading, and returning shows it still
      marked.
- [ ] The masthead shows the number of favourites and updates without a reload.
- [ ] The comparison page shows one column or row per favourite, with publisher,
      page count, rating and price.
- [ ] The comparison page makes exactly one network request to `/api`, regardless
      of how many books are being compared — verified in the network panel.
- [ ] Requesting more than the cap returns `invalid_request` and no upstream call
      is made.
- [ ] One unknown ISBN among several does not fail the others.
- [ ] With no favourites, the page shows the empty state and a way back.
- [ ] Editing the stored value by hand to nonsense leaves the page working, with
      no favourites.
- [ ] The detail page's own behaviour is unchanged.
- [ ] `npm run typecheck`, `npm run build` and `npm test` all pass.
- [ ] `site-reviewer` reports no BLOCKING findings.

## 14. Open questions

| Question                                            | Options                                                         | Owner     |
| --------------------------------------------------- | --------------------------------------------------------------- | --------- |
| What is the cap on ISBNs per request?               | Catalogue size / a fixed small number / configurable            | Developer |
| Should the comparison be a table or a set of cards? | Table, comparable across rows / cards, better at phone width    | Bushra    |
| Does the masthead count belong on every page?       | Yes, it is the only route to the page / only on catalogue pages | Bushra    |

## 15. Out of scope and follow-ups

- Sharing a comparison by link, which would need the list to leave the browser.
- Sorting the comparison by any column.
- Marking from search results, once search exists.
- Remembering favourites across devices, which would need accounts.
