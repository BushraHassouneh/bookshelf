Written with ChatGPT on the web, in three rounds.
Round 1 was the first draft; round 2 replaced a vague Vercel section with an exact `vercel.json`; round 3 replaced caret ranges with exact version pins, `typescript` at `6.0.3`.

---

You are scaffolding a small book catalogue website in this empty folder.

IMPORTANT:
- Do not ask me questions unless you encounter a genuinely blocking ambiguity.
- Do not write a plan and stop. Execute the work in this folder.
- Do not add features beyond the requested vertical slice.
- Do not create a CLAUDE.md file. It will be created separately later with /init.
- Do not make any git commit until every item in the Definition of Done is green.
- Make exactly ONE initial git commit, and make it only after the build, typecheck, and tests all pass.

==================================================
1. START WITH GIT — BEFORE CREATING ANY FILE
==================================================

The first command you run must be:

git init -b main

Run this before creating any project files.

Do not create or modify any files before running that command.

==================================================
2. PROJECT SCOPE
==================================================

Build only this vertical slice:

- One book category.
- Four books in that category.
- A book list page.
- A book detail page.
- The detail page is enriched by one Google Books API call through a backend Vercel Serverless Function.
- The Google Books API key must never be exposed to the browser.
- The application must work locally through Vercel's development server.

Do NOT add:
- Search
- Cart
- Authentication
- User accounts
- Admin pages
- Pagination
- Favorites
- Reviews
- Database
- CMS
- CI/CD configuration
- Docker
- Extra categories
- Extra books
- Extra API integrations
- Any other feature not required for this vertical slice

Keep the implementation intentionally small and reviewable.

==================================================
3. EXACT STACK — PIN EVERY VERSION
==================================================

Use EXACTLY these versions. Do not use `latest`, `^`, `~`, ranges, or unpinned
versions for these packages.

Required versions:

- Angular CLI: 22.1.8
- @angular/core: 22.1.6
- TypeScript: 6.0.3
- Node: 24.19.0
- npm: 11.17.0
- Vercel CLI: 59.19.0
- Vitest: 4.0.8 or another exact version that satisfies Angular 22's
  `@angular/build` peer dependency `vitest ^4.0.8`

CRITICAL TYPESCRIPT REQUIREMENT:

The project MUST contain this exact dependency:

"typescript": "6.0.3"

Do NOT write:

"typescript": "^6.0.3"
"typescript": "~6.0.3"
"typescript": ">=6.0 <6.1"
"typescript": "latest"

It must be exactly:

"typescript": "6.0.3"

TypeScript 7.x is explicitly forbidden.

Angular 22's `@angular/build` requires TypeScript >=6.0 <6.1, and this project must use
the verified TypeScript version 6.0.3.

The final `package.json` must therefore show the exact pinned TypeScript version
`6.0.3`.

Also ensure `package-lock.json` resolves TypeScript to exactly `6.0.3`.

Do not allow npm to resolve TypeScript to another 6.x or 7.x version.

For the explicitly versioned Angular packages, pin the requested versions exactly
rather than using caret (`^`) or tilde (`~`) ranges.

After installation, verify the installed versions with appropriate commands, including:

npx tsc --version
ng version
vercel --version

The TypeScript check MUST report:

Version 6.0.3

If any required version differs from the versions above, fix the dependency declarations
and lockfile before continuing.

Do not commit until the exact versions have been verified.

==================================================
4. ANGULAR APPLICATION
==================================================

Create the Angular application as a static SPA.

Angular is NOT the Vercel backend.

The Angular build output must be:

dist/<project>/browser

Use the normal Angular application structure, with the Angular application code under its own project directory/files.

Use Angular's current standalone application architecture unless Angular CLI 22.1.8 requires otherwise.

Use Vitest for tests.

The browser must never contain the Google Books API key.

==================================================
5. REPOSITORY / FOLDER LAYOUT
==================================================

The repository root must contain the backend and deployment configuration as siblings of the Angular application source.

At minimum, the structure must clearly follow this model:

/
├── api/
│   └── enrich.ts
├── src/
│   └── ... Angular application source ...
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig...
└── vercel.json

If Angular CLI creates additional required configuration files, keep them where Angular expects them.

The important architectural rule is:

- `api/` is at repository root.
- `api/` is NOT inside Angular `src/`.
- `api/` is NOT compiled as part of the Angular browser application.
- `.env.example` is at repository root.
- `vercel.json` is at repository root.

Do not create a nested repository.

==================================================
6. VERCEL BACKEND FUNCTION
==================================================

Create exactly one backend Vercel Serverless Function:

api/enrich.ts

Use Vercel's current documented handler shape for a non-framework project:

export default {
  async fetch(request: Request) {
    return Response.json({ ok: true });
  },
};

Use a web-standard `Request` and `Response`.

DO NOT use the older Node-style:

(req, res)

signature.

The function is responsible for the only external API call in the application.

The browser calls our `/api/enrich` endpoint.

The serverless function calls Google Books.

The Google Books API key must exist only on the server.

==================================================
7. GOOGLE BOOKS API
==================================================

Use Google Books API.

Endpoint:

https://www.googleapis.com/books/v1/volumes?q=isbn:<isbn>&key=<key>

The key is passed as the documented `key=` query parameter.

Read the key from exactly this environment variable:

GOOGLE_BOOKS_API_KEY

The function must fail loudly when this variable is missing.

Do NOT silently make a keyless Google Books request.

When the environment variable is missing, return the standard application error envelope with:

code: "missing_configuration"

The API key must NEVER:
- appear in Angular/client code
- appear in browser-exposed environment variables
- use an `NG_APP_`-prefixed variable
- be hard-coded
- be committed
- appear in `.env.example`

`.env.example` must contain the variable name only, for example:

GOOGLE_BOOKS_API_KEY=

The real `.env` file must be gitignored.

==================================================
8. API CONTRACT
==================================================

Create a small, explicit API contract between Angular and `/api/enrich`.

The browser should send the ISBN needed to enrich the selected book.

Validate the incoming request.

Do not trust arbitrary input.

The backend should perform the Google Books request and return only the data needed by the detail page.

All backend/external-call failures must use exactly this envelope shape:

{
  "error": {
    "code": "...",
    "message": "..."
  }
}

Use meaningful error codes.

At minimum, support:
- missing_configuration
- invalid_request
- external_error
- timeout

Do not expose the Google API key or unnecessary upstream response details.

==================================================
9. FIVE-SECOND EXTERNAL REQUEST TIMEOUT
==================================================

The Google Books request must have a five-second timeout.

Use AbortController or the appropriate web-standard mechanism.

If the external request exceeds five seconds:
- abort it
- return the standard error envelope
- use code `timeout`

Do not allow the request to hang indefinitely.

Every external-call failure must return the same error envelope shape.

==================================================
10. DATA
==================================================

Use a committed TypeScript data module.

Do NOT create a database.

The data model is:

Category:
- slug
- name
- one-line description

Book:
- slug
- categorySlug
- title
- author
- isbn13
- publishedDate (ISO)
- priceEur (number)
- coverAlt (string)

Ship exactly:
- one category
- four books
- all four books belong to that category

Nothing more.

Choose sensible book data and valid ISBN-13 values so the Google Books enrichment can be tested.

Keep the data committed in TypeScript.

==================================================
11. ROUTES / PAGES
==================================================

Create:

1. Book list page
2. Book detail page

Use a clean route structure, for example:

/books
/books/:slug

The exact route names may be adjusted only if Angular's conventions make another equivalent structure more appropriate.

The list page must display the four books.

Each book should provide navigation to its detail page.

The detail page must:
- display the local book information
- call `/api/enrich` using the selected book's ISBN
- display the enrichment returned by the backend
- handle loading
- handle errors
- allow retry

Do not call Google Books directly from Angular.

==================================================
12. HOUSE STYLE — NON-NEGOTIABLE
==================================================

The scaffold must already comply with all of the following.

A. PAGE HEADER BLOCK

Every page must open with:

1. An uppercase, letter-spaced eyebrow naming the section.
2. An h1.
3. One muted sentence underneath.

This applies to:
- list page
- detail page
- error pages

B. FOUR STATES

Every list must explicitly render:

1. Loading
2. Empty
3. Error
4. Success

A bare spinner is a defect.

The loading state must communicate what is loading.

The empty state must tell the user what to do next.

The error state must:
- explain what failed
- offer a retry action

C. DATES

Render dates exactly like:

15 Sep 2026

Rules:
- day
- three-letter month
- four-digit year
- no ordinal
- no slashes
- no full month names

Times, if displayed, must use 24-hour format.

D. MONEY

Render money exactly like:

12.50 EUR

Rules:
- exactly two decimal places
- one space
- ISO currency code
- never a currency symbol
- never use `toLocaleString`

E. SHARED FORMATTERS

Date formatting and money formatting must live in shared formatter functions.

Do NOT inline date or money formatting at individual call sites.

F. EXTERNAL CALLS

All external calls must:
- happen only in the Vercel Serverless Function
- have a five-second timeout
- return the same error envelope on failure

G. IMAGES

Every meaningful image must have alt text.

Decorative images must use:

alt=""

Nothing may render from a raw external URL without explicit width and height.

==================================================
13. GOOGLE BOOKS ENRICHMENT
==================================================

The detail page should make one enrichment request for the selected book.

Flow:

Browser:
  GET/POST /api/enrich with ISBN
        |
        v
Vercel Serverless Function
        |
        v
Google Books API
        |
        v
Normalized enrichment response
        |
        v
Angular detail page

Keep the enrichment model small.

Only expose the fields actually needed by the detail page.

Do not proxy the entire upstream Google response unnecessarily.

If Google Books returns no matching volume, handle this as a controlled application error using the standard error envelope.

==================================================
14. ERROR HANDLING
==================================================

Use a consistent error model in both backend and frontend.

The frontend must distinguish at least:
- loading
- success
- empty/not-found where applicable
- error

Do not display raw exceptions to users.

User-facing error messages should be clear and useful.

Retry must actually repeat the failed operation.

If a book slug does not exist, the detail page must render an appropriate error/not-found page while still following the required page-header block.

==================================================
15. VERCEL CONFIGURATION — EXACT CONFIGURATION
==================================================

Create `vercel.json` at the REPOSITORY ROOT.

Do not invent or simplify the Vercel configuration.

Use this exact configuration:

{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}

The purpose of this configuration is:

1. `/api/*` must remain API routes.
   Example:
   `/api/enrich`
   must reach:
   `api/enrich.ts`

2. All non-API routes must be served by the Angular SPA.
   Examples:
   `/books`
   `/books/some-book`
   `/anything-else`

   must fall back to:
   `/index.html`

3. The API rewrite MUST appear before the SPA catch-all rewrite.

4. Do not rewrite `/api/*` to `/index.html`.

5. Do not use a Vercel framework preset for Angular.

6. Do not configure `api/enrich.ts` as a Node `(req, res)` function.
   It must continue to use the web-standard handler:

   export default {
     async fetch(request: Request) {
       ...
     }
   };

7. Angular is a static SPA. The production browser build is:

   dist/<project>/browser

The Vercel deployment must therefore serve the Angular browser output as static files while preserving `/api/*` for the root-level Serverless Function.

If the Angular/Vercel CLI version requires an explicit build configuration in `vercel.json` for the `dist/<project>/browser` output, add ONLY the minimum required Vercel configuration and keep the two rewrite rules above unchanged.

Do not add unrelated Vercel configuration.

After creating `vercel.json`, inspect the generated project and verify that the actual Angular project name matches the `dist/<project>/browser` path used by the Vercel configuration.

==================================================
16. LOCAL DEVELOPMENT
==================================================

`vercel dev` must serve both:
- the Angular application
- the `/api/enrich` function

on one origin.

The intended local flow is:

vercel dev

Then the browser can call:

/api/enrich

without requiring a separate production-like origin.

If the direct `vercel dev` setup does not work correctly with Angular's development server, implement the required Angular `proxy.conf.json` fallback so `/api` is proxied to the appropriate local port.

Do not leave local API routing broken.

The final Definition of Done must verify the local setup.

==================================================
17. ENVIRONMENT FILES
==================================================

Create:

.env.example

It must contain variable names only.

For example:

GOOGLE_BOOKS_API_KEY=

Do not put a real key anywhere.

Create `.gitignore` BEFORE the first commit.

It must ignore at minimum:

.env
node_modules
dist
.vercel

Do not commit secrets.

==================================================
18. UI / STYLING
==================================================

Keep the visual design simple, clean, and restrained.

The objective is a polished scaffold, not a design showcase.

Use semantic HTML.

Ensure:
- readable typography
- clear hierarchy
- usable spacing
- accessible buttons/links
- visible focus states
- reasonable responsive behavior

Do not add a large UI library unless it is genuinely required.

Prefer the simplest implementation that satisfies the requirements.

==================================================
19. TESTS
==================================================

Use Vitest.

Add focused tests for the important behavior.

At minimum cover:

- shared date formatter
- shared money formatter
- API request validation
- missing GOOGLE_BOOKS_API_KEY behavior
- external timeout/error behavior
- successful enrichment normalization
- relevant Angular page/service behavior

Tests should be deterministic.

Do not make tests depend on a real Google API key or live Google Books responses.

Mock the external request.

==================================================
20. TYPE SAFETY
==================================================

Use strict TypeScript.

Do not use `any` unless there is a very specific and justified boundary case.

Define explicit types/interfaces for:
- Category
- Book
- enrichment response
- API error envelope

Keep frontend and backend contracts explicit.

==================================================
21. IMPLEMENTATION DISCIPLINE
==================================================

Before finishing:

- Inspect the generated project.
- Remove anything unnecessary from the scaffold.
- Verify the actual Angular output directory.
- Verify the Vercel configuration.
- Verify that `/api/enrich` is not included in the Angular browser bundle.
- Search the repository to ensure GOOGLE_BOOKS_API_KEY is not hard-coded anywhere.
- Search the repository to ensure there is no client-side Google Books URL.
- Confirm `.env` is ignored.
- Confirm `CLAUDE.md` does not exist.
- Confirm there is exactly one category and exactly four books.
- Confirm there are no extra features.

Do not create unnecessary abstraction layers.

Do not over-engineer.

==================================================
22. REQUIRED COMMANDS / DEFINITION OF DONE
==================================================

The project is NOT done until all of these are true.

First, install dependencies successfully with the exact pinned versions.

Then verify:

1. Git repository exists and was initialized with:
   git init -b main

2. Typecheck succeeds.

3. Angular production build succeeds.

4. All Vitest tests succeed.

5. The Angular production output exists under:
   dist/<project>/browser

6. `vercel dev` starts successfully.

7. The local Angular application is reachable through `vercel dev`.

8. The `/api/enrich` endpoint is reachable through the same local origin.

9. With a valid local `GOOGLE_BOOKS_API_KEY`, a book detail page can successfully request enrichment through `/api/enrich`.

10. Without `GOOGLE_BOOKS_API_KEY`, the endpoint fails with:
    {
      "error": {
        "code": "missing_configuration",
        "message": "..."
      }
    }

11. The external Google Books request is aborted after five seconds.

12. External/API failures use the common error envelope.

13. The browser never directly calls Google Books.

14. The API key never appears in client-side source or committed files.

15. `.gitignore` ignores:
    - .env
    - node_modules
    - dist
    - .vercel

16. `.env.example` contains the variable name only.

17. Every page has the required eyebrow + h1 + muted sentence header.

18. Lists explicitly implement loading, empty, error, and success states.

19. Dates use:
    DD Mon YYYY
    such as `15 Sep 2026`.

20. Money uses:
    `12.50 EUR`

21. Date and money formatting are implemented through shared formatter functions.

22. Images have appropriate alt text and explicit width/height whenever rendered from an external URL.

23. There is exactly:
    - 1 category
    - 4 books
    - 1 list page
    - 1 detail page
    - 1 Vercel API function

24. No database, auth, search, cart, CI, Docker, or unrelated feature was added.

25. `CLAUDE.md` does not exist.

Only after ALL of the above are green:

- Create exactly ONE git commit.
- Do not create any earlier commits.
- Do not create any later commits as part of this task.

Use a clear commit message such as:

feat: scaffold book catalogue

After committing, verify the working tree is clean.

==================================================
23. FINAL RESPONSE AFTER IMPLEMENTATION
==================================================

When the implementation is complete, report briefly:

- what was created
- the exact commands used to verify it
- whether build/typecheck/tests passed
- how local `vercel dev` works
- the final commit hash
- whether the working tree is clean

Do not include a long explanation.

Most importantly: execute the scaffold in the empty folder rather than merely describing how it could be built.
