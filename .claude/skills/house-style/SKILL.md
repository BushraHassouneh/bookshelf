---
name: house-style
description: The conventions every page of this Arabic RTL catalogue follows - the page header block, the four list states, date and money formatting, how external calls fail, image requirements, and right-to-left handling. Use when adding or changing any page, list, formatter, or the Vercel Function, and when reviewing a diff that touches app/ or data. Not needed for build config, dependency, or CI changes.
---

# House style

Six rules. They are deliberately not the framework defaults, so no model will
guess them. If a page comes out wrong, **the skill is wrong — fix this file, not
the page.**

## The six rules

1. **Page header.** Every page opens with the same block: an uppercase,
   letter-spaced eyebrow naming the section; an `h1`; one muted sentence
   underneath. Every page, including error and not-found pages.

2. **Four states.** Every list renders loading, empty, error and success. The
   empty state tells the user what to do next. The error state says what failed
   and offers a retry that repeats the failed call. **A bare spinner is a defect.**

3. **Dates** render as `15 Sep 2026` — two-digit day, three-letter month,
   four-digit year. No ordinals, no slashes, no full month names. Times are
   24-hour.

4. **Money** renders as `12.50 JOD` — exactly two decimals, one space, then the
   ISO code. Never a currency symbol. Two decimals for the dinar too, even though
   it is conventionally quoted in three.

5. **External calls** happen only in the Vercel Function, with a five-second
   timeout, and every failure returns the same envelope:
   `{ "error": { "code": "...", "message": "..." } }`

6. **Images** always have alt text; decorative ones use `alt=""`. Nothing renders
   from an external URL without explicit `width` and `height`.

Rules 3 and 4 live in shared formatters in `src/app/shared/formatters.ts`. Never
inline them, and never use `toLocaleString` or Angular's `date` / `currency`
pipes — both vary with the visitor's locale, and this site fixes one presentation
for everyone.

## Right-to-left

The interface is Arabic. `<html lang="ar" dir="rtl">`.

- Latin-script values inside Arabic text are wrapped in `<span dir="ltr">` —
  ISBNs, dates, prices, page counts, ratings. Without it the bidi algorithm
  reorders them.
- Use CSS logical properties: `margin-inline-start`, `inset-inline`,
  `padding-block`, `text-align: end`. Never `left` or `right`.
- Slugs and URLs stay transliterated ASCII.

## Going further

- `references/rules.md` — each rule with the reasoning, a correct example and the
  wrong version it replaces. Read it when a rule's edge case is unclear, or before
  reviewing a diff.
- `assets/page-header.html` — the page header markup to copy. Copy it rather than
  re-inventing it; rule 1 is the one most often got subtly wrong.
