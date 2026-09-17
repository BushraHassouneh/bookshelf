# The six rules in full

Each rule below gives the reasoning, the correct form, and the wrong version it
replaces. The wrong versions are all things a model produces by default, which is
why the rules exist.

---

## 1. The page header block

Every page opens with an eyebrow, an `h1`, and one muted sentence. No exceptions —
error pages and not-found pages included.

**Why.** A page without it reads as a fragment. The eyebrow tells the reader where
they are, the sentence tells them what the page is for. Error pages need this most,
because that is where a reader is most lost.

**Correct** — use the component, never hand-rolled markup:

```html
<app-page-header
  eyebrow="الفهرس"
  [heading]="category.name"
  [lede]="category.description"
/>
```

**Wrong** — an `h1` on its own, or a page that starts straight into content:

```html
<h1>{{ category.name }}</h1>
```

The component lives at `src/app/shared/page-header.ts`. Because it is a component
rather than a convention, a page cannot quietly ship without one.

---

## 2. The four states

Every list renders **loading, empty, error, success**. Model them as a
discriminated union in the component, so the template cannot show two at once and
adding a state is a compile error everywhere it is handled.

```ts
type ListState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'empty'; readonly category: Category }
  | { readonly kind: 'success'; readonly category: Category; readonly books: readonly Book[] };
```

**Loading** says what is loading: `جارٍ تحميل كتب هذا التصنيف…` not a spinner.

**Empty** says what to do next: *"أضف كتابًا إلى `src/app/core/catalogue.ts` وسيظهر
هنا"* — not *"لا توجد نتائج"* on its own.

**Error** says what failed **and** offers a retry that repeats the failed call, not
a page reload:

```html
<button type="button" class="button" (click)="loadEnrichment(book.isbn13)">
  أعد المحاولة
</button>
```

**A bare spinner is a defect.** So is an error state with no retry, and an empty
state that does not say what to do.

Use `role="status" aria-live="polite"` on loading, and `role="alert"` on error, so
the change is announced.

---

## 3. Dates

`15 Sep 2026`. Two-digit day, three-letter month, four-digit year.

- No ordinals: never `15th`
- No slashes: never `15/09/2026`
- No full month names: never `15 September 2026`
- Times are 24-hour

**Always** through `formatIsoDate` in `src/app/shared/formatters.ts`.

**Never** `toLocaleString`, `toLocaleDateString`, or Angular's `date` pipe. All
three vary with the visitor's locale; this site shows one form to everyone.

Read dates in **UTC**. A date-only ISO string parses as UTC midnight, so local-time
getters report the previous day for anyone west of Greenwich.

Unparseable input returns `Unknown` rather than `NaN` or `Invalid Date`.

---

## 4. Money

`12.50 JOD`. Exactly two decimals, one space, then the ISO code.

- Never a symbol: not `12.50 د.أ`, not `JD 12.50`
- Two decimals even for the dinar, which is conventionally quoted in three (1000
  fils). A house rule that bends per currency is not a rule.
- `13` renders `13.00 JOD`; `10.999` renders `11.00 JOD`

**Always** through `formatMoney`. Prices are stored as plain numbers
(`priceJod: 12.5`), never as preformatted strings.

---

## 5. External calls

All of them happen in the Vercel Function under `api/`, never in Angular.

- Five-second timeout, via `AbortController`
- Every failure returns the same envelope and nothing else:

```json
{ "error": { "code": "...", "message": "..." } }
```

- Codes in use: `missing_configuration`, `invalid_request`, `not_found`,
  `external_error`, `timeout`
- Never echo the credential, the upstream URL, or a raw exception into a message
- A missing credential fails loudly with `missing_configuration` rather than
  making an unauthenticated request that appears to work

`api/` holds exactly one file, because Vercel turns every file under it into a
separate Function. New logic goes in `server/`.

---

## 6. Images

- Every meaningful image has alt text describing the image, not the file
- Decorative images use `alt=""`
- Anything from an external URL has explicit `width` and `height`, so the layout
  does not shift when it loads

```html
<img
  [src]="enrichment.thumbnailUrl"
  [alt]="book.coverAlt"
  [width]="thumbnailWidth"
  [height]="thumbnailHeight"
  loading="lazy"
  decoding="async"
/>
```

External thumbnails arrive over `http` from Google and must be upgraded to `https`
before rendering, or the browser blocks them as mixed content. That happens in
`normalizeVolume`, server-side.

---

## Right-to-left

**Wrap Latin runs.** An ISBN, date, price or page count sitting in Arabic text
needs `<span dir="ltr">`, or the bidi algorithm moves its digits and punctuation:

```html
<dd><span dir="ltr">{{ formatMoney(book.priceJod) }}</span></dd>
```

**Logical properties only.** `margin-inline-start` not `margin-left`;
`inset-inline-start` not `left`; `text-align: end` not `text-align: right`;
`border-inline-start` not `border-left`. Physical properties do not flip and will
look correct in testing only if you never check the other direction.

**Typography.** Arabic needs more leading than Latin at the same size — the body is
`1.0625rem` at `line-height: 1.85`. The font stack puts Arabic faces first and
Latin serifs after them, for the values that stay in Latin script.

**Slugs stay ASCII.** `/books/awlad-haretna`, transliterated — not percent-encoded
Arabic.
