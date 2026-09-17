# Covers On The List

|             |                                     |
| ----------- | ----------------------------------- |
| **Slug**    | `covers-on-the-list`                |
| **Branch**  | `claude/feature/covers-on-the-list` |
| **Status**  | Draft                               |
| **Created** | 2026-09-17                          |

## 1. Summary

Show each book's cover on the catalogue page. The covers come from Google Books,
fetched for a whole category in one request, and appear on the cards that
currently show only text.

## 2. Problem

This is a book catalogue in which you cannot see a book. Every card is a title,
an author, a date and a price, so browsing is reading rather than scanning — and
scanning is what a shelf is for. A reader who knows a cover recognises it in a
fraction of the time it takes to read four titles.

The covers already exist. The detail page shows one, fetched per book. The list
page shows none, because when it was built the only way to get a cover was one
request per book, and four requests to paint one page was not worth it.

That constraint is gone: the batch endpoint added for the comparison page takes a
list of ISBNs and answers in a single request.

## 3. Goals and non-goals

**Goals**

- Every book card shows its cover.
- A whole category's covers arrive in one request, not one per book.
- A book whose cover Google does not have still reads as a complete card.
- The page is usable before the covers arrive, and does not jump when they do.

**Non-goals**

- Covers on the comparison page. That page compares facts, and thumbnails would
  push the rows a reader is comparing off the screen.
- Uploading, hosting or caching covers ourselves. They stay remote.
- A larger cover, a lightbox, or any zoom.
- Changing the detail page's own cover, which already works.
- Storing cover URLs in the committed catalogue. They are Google's, they change,
  and a stale URL in the data module would be worse than no cover.

## 4. User stories

- As a visitor, I want to see covers while browsing, so that I can recognise a
  book without reading every title.
- As a visitor, I want the list to be usable immediately, so that a slow lookup
  does not stop me opening the book I already wanted.
- As a visitor, I do not want the page to jump under my thumb as images arrive.

## 5. User experience

**Entry point** — The catalogue page, at `/books` and `/categories/:slug`.

**Main flow**

1. The visitor opens a category. The cards appear at once with their text.
2. Each card shows a cover-shaped placeholder.
3. One request fetches the category's covers.
4. Covers replace their placeholders in place, without the cards moving.
5. A book Google has no cover for keeps a placeholder marked as such, rather than
   an empty gap or a broken image.

**States**

| State   | Behaviour                                                                                                       |
| ------- | --------------------------------------------------------------------------------------------------------------- |
| Loading | Cards are complete and clickable; each cover area shows a neutral placeholder. Nothing is blocked on the fetch. |
| Empty   | A category with no books is unchanged from today — the existing empty state, no cover involvement.              |
| Error   | The cover request failed. Cards keep their text and their placeholders. **No error banner.**                    |
| Success | Covers shown; books without one keep a placeholder.                                                             |

**Interaction details** — The cover is inside the existing card link, so tapping
it opens the book like tapping the title. It is decorative in the sense that the
card is already labelled by its title, so it must not add a second announcement of
the same book to a screen reader.

A failed cover fetch is deliberately silent. The list's job is to list books, and
it still does; an error banner for a missing decoration would be louder than the
problem.

**Accessibility** — The cover carries `alt=""`, because the card's own heading
already names the book and a screen reader should not hear the title twice.
Placeholders are not announced at all. Reserved space means no layout shift, which
matters most to anyone with motor difficulty aiming at a moving target.

## 6. Interface contract

No new endpoint. The list page uses the existing list form, which already returns
`thumbnailUrl` per ISBN.

| Operation                 | Trigger            | Purpose                      | Success result               |
| ------------------------- | ------------------ | ---------------------------- | ---------------------------- |
| Enrich several (existing) | Category page load | Covers for the visible books | One entry per requested ISBN |

**Inputs** — unchanged: `isbns`, comma-separated, capped.

**Outputs** — unchanged. Only `thumbnailUrl` is used here; the other fields are
ignored by this page.

**Errors** — unchanged shapes. This page renders none of them to the visitor; any
failure leaves placeholders in place.

## 7. Data model

No change to the committed catalogue. Cover URLs are never stored: they belong to
Google, they change, and a stale URL committed to the data module would be worse
than no cover at all. `coverAlt` already exists and stays, because the detail page
uses it.

**New or changed records**

| Field | Type | Required | Constraints / default |
| ----- | ---- | -------- | --------------------- |
| None  |      |          |                       |

**Access patterns** — One lookup by ISBN per rendered card, from the response
already held in memory.

**Migration impact** — None.

**Retention and growth** — Nothing is retained. A category larger than the request
cap would need paging; that is a follow-up, and the cap is well above any category
today.

## 8. Validation rules

| Rule                                              | Message | Enforced |
| ------------------------------------------------- | ------- | -------- |
| A cover URL must be https before it is rendered   | None    | Server   |
| A missing or unusable URL renders the placeholder | None    | Client   |

The first is already true — `normalizeVolume` upgrades Google's `http` thumbnails,
without which the browser blocks them as mixed content.

## 9. Background and scheduled work

None.

## 10. Security and access

No new credential, no new endpoint, no new user input. The only new thing reaching
the browser is an image URL from Google, rendered with explicit dimensions and
empty alt text. The key stays server-side, as before.

## 11. Performance and scale

One extra request per category view, carrying every visible book. It is the same
request the comparison page makes, so the cost is understood.

Covers are lazily loaded and carry explicit width and height, so they neither
block first paint nor shift the layout. A category at the request cap would need
paging before it needed a second request.

## 12. Testing

**Integration** — Opening a category issues exactly one cover request regardless
of the number of books. Switching category issues one more, not one per book.

**Unit** — A book with no `thumbnailUrl` renders the placeholder. A failed request
leaves every card intact with placeholders and shows no error.

**Frontend** — Covers carry `alt=""`, explicit width and height, and
`loading="lazy"`. Cards do not change height when covers arrive.

**Manual** — At phone width the card with a cover is still legible and the grid
does not overflow. Reading order in right-to-left is unchanged.

## 13. Acceptance criteria

- [ ] Every book card on `/books` and `/categories/:slug` shows a cover or a
      placeholder — never an empty gap and never a broken image icon.
- [ ] Opening a category makes exactly one request to `/api`, regardless of how
      many books it holds — verified in the network panel.
- [ ] With the network blocked, every card still renders with its text and a
      placeholder, and no error banner appears.
- [ ] Each cover element has `alt=""`, an explicit `width` and `height`, and
      `loading="lazy"`.
- [ ] Card height is identical before and after covers arrive — measured, not
      eyeballed.
- [ ] No horizontal overflow at 390px.
- [ ] The comparison page and the detail page are unchanged.
- [ ] `npm run typecheck`, `npm run build` and `npm test` all pass.
- [ ] `site-reviewer` reports no BLOCKING findings.

## 14. Open questions

| Question                                                      | Decision | Why                                                                                                                                                                                    |
| ------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Should the cover sit beside the text or above it on the card? | Beside   | A cover above the text adds roughly 190px per card, undoing the density just gained — three books per phone screen would drop to one and a half. Reversible: it is one flex-direction. |

None remain open.

## 15. Out of scope and follow-ups

- Paging a category that outgrows the request cap.
- A larger cover on hover or tap.
- Covers in any future search results.
- Caching covers between category switches within a session.
