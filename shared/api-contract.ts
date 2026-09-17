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
