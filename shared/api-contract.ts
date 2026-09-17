/**
 * The wire contract between the Angular client and the Vercel Function.
 *
 * This file is the single source of truth for both sides. It is included by
 * `tsconfig.app.json` (browser) and `tsconfig.api.json` (server), so a change
 * here breaks the typecheck on whichever side has not been updated.
 *
 * It must stay free of imports so neither side drags the other's runtime in.
 */

/** Every failure the API can report. */
export type ApiErrorCode =
  'missing_configuration' | 'invalid_request' | 'not_found' | 'external_error' | 'timeout';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
}

/** The one failure shape the API ever returns. */
export interface ApiErrorEnvelope {
  error: ApiError;
}

/**
 * The only fields the detail page needs from Google Books.
 *
 * Deliberately narrow: the upstream volume payload is large and we do not
 * proxy it. Every field is nullable because Google populates them unevenly.
 */
export interface Enrichment {
  isbn13: string;
  description: string | null;
  pageCount: number | null;
  publisher: string | null;
  averageRating: number | null;
  ratingsCount: number | null;
  /** Always https. Google serves thumbnails over http, which the browser blocks. */
  thumbnailUrl: string | null;
  infoUrl: string | null;
}

/** Intrinsic size of a Google Books thumbnail, used for explicit width/height. */
export const THUMBNAIL_WIDTH = 128;
export const THUMBNAIL_HEIGHT = 193;

/**
 * The most ISBNs one request may carry.
 *
 * This is a security boundary, not a nicety. Each ISBN costs one upstream call,
 * so without a cap a crafted URL turns a single request into an unbounded
 * fan-out on our credential. Twice the current catalogue, so it cannot be
 * reached honestly.
 */
export const MAX_BATCH_ISBNS = 24;

/**
 * One requested ISBN's outcome. `found: false` covers both "Google has no such
 * volume" and "that one lookup failed", because neither is worth failing the
 * whole request over — the page still has the book's local fields to show.
 */
export interface EnrichmentEntry {
  isbn13: string;
  found: boolean;
  enrichment: Enrichment | null;
}

/** The response to the list form. One entry per requested ISBN, in request order. */
export interface BatchEnrichment {
  results: readonly EnrichmentEntry[];
}
