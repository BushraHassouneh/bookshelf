---
description: Add a book category and four verified books to the catalogue, then stop for review
argument-hint: <category name in Arabic, e.g. تاريخي>
allowed-tools: Read, Glob, Grep, Edit, WebFetch, Bash(git status:*), Bash(git diff:*), Bash(npm run typecheck:*)
---

Add a new category, and at least four books in it, to this repository's committed
catalogue.

Category name: $ARGUMENTS

You produce a diff and stop. You do not commit — `git commit` is not available to
you, and that is deliberate: the point of this command is that a person looks at
what it wrote before it enters the history.

## Step 1. Refuse on a dirty tree

Run `git status --porcelain`. If anything is uncommitted, unstaged or untracked,
stop immediately and tell the user to commit or stash first. Do not go any
further.

A dirty tree means your diff would be mixed with someone else's work, and the
whole value of this command is that its output is reviewable on its own.

## Step 2. Learn the shape before writing

Read `src/app/core/models.ts` and `src/app/core/catalogue.ts`. Follow the shape
that is actually there, not the one described below, if the two ever disagree.

Also read `CLAUDE.md`'s "Data shape" section and the `house-style` skill.

## Step 3. Derive the slug

From `$ARGUMENTS`, produce:

- `name` — the Arabic category name exactly as given
- `slug` — transliterated ASCII, lowercase, kebab-case, `a-z0-9-` only. For
  example تاريخي becomes `tarikhi`, ديني becomes `dini`, عملي becomes `amali`.
- `description` — one Arabic sentence saying what belongs in this category, in the
  voice of the existing category's description

If the slug already exists in `CATEGORIES`, stop and say so rather than creating a
duplicate.

## Step 4. Choose four books, and verify each one

Pick four real, well-known Arabic books that genuinely belong in this category.

**Do not guess an ISBN.** Find it by searching, then use the one the search
returns. On this command's first real use, four guessed ISBNs for well-known
titles all resolved to unrelated books — a children's book, a short-story
collection. Search like this, and take `industryIdentifiers` from the result whose
author matches:

```
https://www.googleapis.com/books/v1/volumes?q=intitle:<title>+inauthor:<author>&langRestrict=ar&maxResults=20&key=<key>
```

Then confirm two things about the ISBN you took:

1. it resolves to a record, and
2. the author returned is the book's real author

Either of these sources is acceptable, and if the first is unreachable use the
other rather than skipping the check:

- Google Books `?q=isbn:<isbn13>&key=...` — needs `GOOGLE_BOOKS_API_KEY`
- Open Library `https://openlibrary.org/api/books?bibkeys=ISBN:<isbn13>&format=json&jscmd=data`
  — no key

<!-- 17 Sep: this step named Open Library alone, and Open Library began
     returning 404 for every ISBN mid-run, including ones it had resolved an
     hour before. A verification step with one source is a verification step
     that can be skipped by accident. -->

**This check is not optional.** Searching for مدن الملح once returned an edition
credited to a critic rather than to عبد الرحمن منيف, and it nearly shipped. If an
ISBN fails either test, discard it and choose another edition — do not keep it and
note the problem.

Every `isbn13` must also pass the checksum in `server/enrich-core.ts`: thirteen
digits, alternating weights of 1 and 3 across the first twelve, check digit last.

## Step 5. Write the entries

Append the category to `CATEGORIES` and the four books to `BOOKS` in
`src/app/core/catalogue.ts`. Every book needs every field:

`slug`, `categorySlug`, `title`, `author`, `isbn13`, `publishedDate` (ISO
`YYYY-MM-DD`), `priceJod` (plain number, two decimals' worth of value), `coverAlt`
(Arabic alt text naming the book and author).

`coverAlt` is what satisfies the house style's image rule — the cover image itself
arrives from Google Books at runtime, so the alt text is the part that lives in the
data and it must be written, never left empty.

Match the surrounding formatting exactly: the file is Prettier-formatted at 100
columns with single quotes.

## Step 6. Typecheck

Run `npm run typecheck`. If it fails, fix what you wrote until it passes.

## Step 7. Stop and report

Run `git diff` and report:

- the category name and slug you added
- the four books, each with its ISBN and the author Open Library returned for it
- the typecheck result

Then tell the user the diff is ready for review and that nothing has been
committed.

Mention, once, that the list page currently shows only the first category — adding
a category does not by itself surface it in the interface, and doing so is a
separate change.
