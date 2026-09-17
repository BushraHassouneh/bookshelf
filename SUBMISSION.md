# Submission

- **Site:** <https://bookshelf-drab-sigma.vercel.app>
- **Preview deployment from a feature branch:** **not available — see Outstanding below.**
  `vercel git connect` fails with "You need to add a Login Connection to your
  GitHub account first", so Vercel never builds a pushed branch. The branches are
  all on GitHub; nothing has ever built one.
- **Stack:** Angular 22.1.6, TypeScript 6.0.3, Node 24.x, deployed as a static SPA
  with one Vercel Function at `api/enrich.ts`.
- **External service and the variable that holds its key:** Google Books API /
  `GOOGLE_BOOKS_API_KEY`.

The interface is Arabic and right-to-left.

## The artifacts

- **Scaffold prompt:** `_prompts/scaffold-prompt.md` — written with ChatGPT, 3
  rounds. Round 2 replaced a vague Vercel section with an exact `vercel.json`;
  round 3 replaced caret ranges with exact pins, `typescript` at `6.0.3`.
- **Rule file:** `CLAUDE.md`, 115 lines. The three rules that earned their place,
  all three because they had already cost time once:
  - never add a `dev` script that runs `vercel dev` — Vercel executes
    `package.json`'s `dev` script as its dev command, so it invokes itself
  - never add a wildcard such as `.env*` to `.gitignore` — it also matches
    `.env.example` and silently stops it being committed, which `vercel link` did
    to this repository
  - confirm a new book's ISBN resolves **and** that the returned author is the
    real author — Google's Arabic metadata often credits a critical study
- **MCP:** `claude mcp list`, verbatim:

  ```
  context7: https://mcp.context7.com/mcp (HTTP) - ⏸ Pending approval (run `claude` to approve)
  playwright: npx -y @playwright/mcp@latest - ⏸ Pending approval (run `claude` to approve)

  [Contains warnings] Project config (shared via .mcp.json)
  Location: C:\Users\Bushra.Hassouneh\Desktop\bookshelf\.mcp.json
   └ [Warning] [context7] mcpServers.context7: Missing environment variables: CONTEXT7_API_KEY
  ```

  Both servers are configured at project scope and both are read from
  `.mcp.json`, but neither has been approved and no Context7 key has been set.
  This criterion is **not met**. The configuration is right — the
  `Authorization: Bearer` header was verified against context7.com/docs and the
  upstash/context7 README on 16 Sep 2026, and the course deck's older
  `CONTEXT7_API_KEY` header no longer works — but the server has never connected.

- **Skill:** `.claude/skills/house-style/`, with `SKILL.md` (59 lines),
  `references/rules.md` and `assets/page-header.html`.

  **It never fired on its own, and I cannot point to a transcript line where it
  did.** It was written during this session and loaded by being read, not by
  autonomous invocation. Recording that rather than inventing a line.

- **Reviewer:** `.claude/agents/site-reviewer.md`, read-only, six rules added
  after the starter checklist, each annotated with the incident that produced it:
  - 17 Sep — `vercel link` appended `.env*` to `.gitignore`
  - 17 Sep — `"dev": "vercel dev"` made `vercel dev` invoke itself
  - 16 Sep — `ng new --strict` did not emit `"strict": true`
  - 17 Sep — Google Books credited مدن الملح to a critic, not the novelist
  - 17 Sep — prices moved to dinar while the field was still `priceEur`
  - 17 Sep — RTL needs logical CSS properties and `dir="ltr"` around Latin runs
- **/add-category:** the two commits it produced —
  `a8693e5 content: add category تاريخي` and `f1ece12 content: add category ديني`.
  Its first real use also produced `085fc7a`, a fix to the command itself.

## The lifecycle

- **Feature A** — browse books by category. Path A, one session.
  Spec `4f94ba1`, plan `bba7070`, branch `claude/feature/browse-by-category`,
  merge `3c758b7`.
- **Feature B** — favourites and compare. Path B, **4 phases across 5 working
  sessions** (one per phase plus a review pass).
  Spec and plan `fc74c74`, branch `claude/feature/favourites-and-compare`,
  merge `ef8c8df`.

**One deviation from the plan and why.** The plan's phase 3 said to extend
`server/enrich-core.spec.ts` with the batch tests. They went into a new file,
`server/enrich-batch.spec.ts`, instead. The phase's first Done-when was that the
single-ISBN path behaves exactly as before, and the strongest evidence for that
is `enrich-core.spec.ts` being untouched by the commit with all 35 of its tests
still passing. Editing it to add batch tests would have thrown that proof away.

Six further deviations are recorded in the two plan files, including a real bug
in `vercel.json` found during the browser pass: the SPA catch-all rewrite
swallows the dev server's virtual assets, so `vercel dev` serves the shell but
Angular never boots. Production is unaffected, because there the built assets are
real files the filesystem check matches first.

## What went wrong

**The reviewer caught two blocking bugs in Feature A that my own tests missed.**
`CatalogueService.defaultCategorySlug` throws on an empty catalogue, and I
resolved it outside the `try`, so the throw escaped into an `effect()` as an
unhandled rejection and left the page on the loading state permanently. The same
getter was read from the template in every state, so the page would have rendered
nothing at all — not even the house header block — in exactly the situation where
a reader is most lost. Both fixed in `22c98af`, which also added a sixth test,
because the review showed the error branch had become unreachable and an untested
branch quietly becomes dead code.

**The reviewer then caught a blocking bug in Feature B.** The batch endpoint
collapsed "Google has no such volume" and "that lookup failed" into the same
absent entry, so a revoked or over-quota key would have rendered a full
comparison table of dashes — reading as "Google has no record of any of these
books" — with no error state and no retry. Fixed in `828f7ac`: entries now carry
whether they failed, one flaky book stays non-fatal, and every lookup failing
returns `502 external_error`.

**Four ISBNs I guessed for well-known Arabic titles all resolved to unrelated
books** — a children's book, a short-story collection. That is what turned
`/add-category`'s verification step from a formality into the reason the command
is worth having, and it is now written into both the command and `CLAUDE.md`.

**Open Library returned 404 for every ISBN partway through the first real run of
`/add-category`**, including one it had resolved an hour earlier. The command had
named it as the only verification source, so the check could only be skipped or
worked around by hand. Fixed in `085fc7a`: either Google Books or Open Library is
acceptable, and the command says to use the other when one is unreachable.

## Secrets check

```
$ git check-ignore -v .env .env.example
.gitignore:50:.env      .env
```

One line, naming `.env` only, and silent on `.env.example` — which is committed
and holds variable names with no values.

**History scanned** with `git log -p --all | grep -ciE "AIzaSy[A-Za-z0-9_-]{20,}"`
across all branches: **0 matches**. No credential has ever been committed to this
repository, on any branch, at any point in its history.

**A key was never committed, but `GOOGLE_BOOKS_API_KEY` was exposed in a
development chat transcript.** It has not been rotated at the time of writing.
Rotating it means: regenerate in Google Cloud Console, update `.env` locally,
update the Vercel environment variable for Production and Preview, and redeploy.

## Outstanding

Honest list of what is not finished:

1. **No preview deployment exists.** Vercel needs GitHub added as a login
   connection before `vercel git connect` will work and branches will build.
2. **Deployment Protection is enabled** on the Vercel project, so the production
   URL asks for authentication. A marker cannot open the site until it is
   disabled in Settings → Deployment Protection.
3. **Neither MCP server has been approved**, and `CONTEXT7_API_KEY` is unset.
4. **`site-reviewer` was never invoked as a registered subagent.** Claude Code
   loads `.claude/agents/` at startup and the file was created mid-session, so
   both reviews ran its checklist through a general-purpose agent pointed at the
   definition file. Same checklist, same findings; not the same mechanism.
5. **The browser pass used Playwright directly, not the Playwright MCP server**,
   for the same reason. 24 checks against a real Chromium, all passing.

## Verification

- `npm run typecheck` — clean across all three TypeScript projects
- `npm run build` — clean
- `npm test` — **100 tests**: 49 Angular, 51 server
- Browser pass — 24 of 24, including all twelve books reachable by clicking,
  exactly one `/api` request for three compared books, favourites surviving a
  real reload, the current-category marker under forced greyscale, and no
  horizontal scroll at 390px
