/**
 * All logic for the /api/enrich endpoint.
 *
 * This lives outside `api/` on purpose. Vercel turns every file under `api/`
 * into its own Function, and the slice is specified to have exactly one. Keeping
 * the logic here also makes it testable without a running server: `handleEnrich`
 * takes its key, its fetch and its timeout as arguments rather than reading
 * globals, so the tests never touch the network or a real API key.
 */

import type {
  ApiErrorCode,
  ApiErrorEnvelope,
  BatchEnrichment,
  Enrichment,
  EnrichmentEntry,
} from '../shared/api-contract.js';
// Extension required: Node resolves this at runtime in the deployed Function,
// and it does not guess extensions.
import { MAX_BATCH_ISBNS } from '../shared/api-contract.js';

export const GOOGLE_BOOKS_ENDPOINT = 'https://www.googleapis.com/books/v1/volumes';

/** House style: every external call is capped at five seconds. */
export const EXTERNAL_TIMEOUT_MS = 5_000;

export interface EnrichDeps {
  /** Undefined when GOOGLE_BOOKS_API_KEY is not configured on the server. */
  apiKey: string | undefined;
  fetchImpl: typeof fetch;
  timeoutMs: number;
}

/** The one failure path. Every error the endpoint returns goes through here. */
export function errorResponse(code: ApiErrorCode, message: string, status: number): Response {
  const body: ApiErrorEnvelope = { error: { code, message } };
  return Response.json(body, { status });
}

/**
 * Full ISBN-13 check, not just a length test — the ISBN reaches an outbound URL,
 * so it is validated rather than trusted.
 */
export function isValidIsbn13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) {
    return false;
  }
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += Number(value[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(value[12]);
}

export function buildGoogleBooksUrl(isbn13: string, apiKey: string): string {
  const url = new URL(GOOGLE_BOOKS_ENDPOINT);
  url.searchParams.set('q', `isbn:${isbn13}`);
  url.searchParams.set('key', apiKey);
  return url.toString();
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

/** Google serves thumbnails over http, which a https page refuses to load. */
function toHttps(url: string | null): string | null {
  return url === null ? null : url.replace(/^http:\/\//, 'https://');
}

/**
 * Reduce an upstream volume payload to the handful of fields the detail page
 * shows. Returns null when the payload contains no usable volume, which the
 * caller turns into a `not_found` error rather than an empty success.
 */
export function normalizeVolume(payload: unknown, isbn13: string): Enrichment | null {
  const items = asRecord(payload)['items'];
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }
  const volumeInfo = asRecord(asRecord(items[0])['volumeInfo']);
  if (Object.keys(volumeInfo).length === 0) {
    return null;
  }
  const imageLinks = asRecord(volumeInfo['imageLinks']);
  return {
    isbn13,
    description: asString(volumeInfo['description']),
    pageCount: asNumber(volumeInfo['pageCount']),
    publisher: asString(volumeInfo['publisher']),
    averageRating: asNumber(volumeInfo['averageRating']),
    ratingsCount: asNumber(volumeInfo['ratingsCount']),
    thumbnailUrl: toHttps(asString(imageLinks['thumbnail'])),
    infoUrl: asString(volumeInfo['infoLink']),
  };
}

/** Shared by both forms, so a missing key fails identically either way. */
function missingKeyResponse(): Response {
  return errorResponse(
    'missing_configuration',
    'بيانات اعتماد Google Books غير مضبوطة على الخادم، لذا تعذّر تحميل تفاصيل الكتاب.',
    500,
  );
}

/**
 * One ISBN's lookup, for the list form. Never throws: a failure here is that
 * entry's outcome, not the whole request's, because the page can still show the
 * book's local fields.
 *
 * An abort is the exception — the caller checks the signal afterwards and turns
 * it into a timeout for the request as a whole.
 */
/**
 * `failed` separates "that lookup failed" from "Google has no such volume".
 * Both leave the entry absent, but only the first means something is wrong: if
 * every lookup fails — a revoked key, an outage — the request must say so rather
 * than return a full table of blanks that reads as "none of these books exist".
 */
interface EntryOutcome {
  entry: EnrichmentEntry;
  failed: boolean;
}

async function fetchEntry(
  isbn13: string,
  apiKey: string,
  deps: EnrichDeps,
  signal: AbortSignal,
): Promise<EntryOutcome> {
  const absent: EnrichmentEntry = { isbn13, found: false, enrichment: null };
  try {
    const upstream = await deps.fetchImpl(buildGoogleBooksUrl(isbn13, apiKey), {
      signal,
      headers: { accept: 'application/json' },
    });
    if (!upstream.ok) {
      return { entry: absent, failed: true };
    }
    const enrichment = normalizeVolume(await upstream.json(), isbn13);
    return enrichment === null
      ? { entry: absent, failed: false }
      : { entry: { isbn13, found: true, enrichment }, failed: false };
  } catch {
    return { entry: absent, failed: true };
  }
}

async function handleBatch(raw: string, deps: EnrichDeps): Promise<Response> {
  const isbns = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');

  if (isbns.length === 0) {
    return errorResponse(
      'invalid_request',
      'أرسل معامل "isbns" يحتوي على رقم ردمك-13 واحد على الأقل.',
      400,
    );
  }
  if (isbns.length > MAX_BATCH_ISBNS) {
    return errorResponse(
      'invalid_request',
      `لا يمكن طلب أكثر من ${MAX_BATCH_ISBNS} كتابًا في الطلب الواحد.`,
      400,
    );
  }
  // Validated before anything is fetched, so one bad member cannot smuggle a
  // value into an outbound URL.
  if (!isbns.every(isValidIsbn13)) {
    return errorResponse('invalid_request', 'أحد أرقام الردمك المُرسلة غير صحيح.', 400);
  }
  if (deps.apiKey === undefined || deps.apiKey === '') {
    return missingKeyResponse();
  }
  const apiKey = deps.apiKey;

  // One controller for the batch: the five-second cap is on the request as a
  // whole, so many books cannot hold the Function open longer than one can.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs);
  let outcomes: readonly EntryOutcome[];
  try {
    outcomes = await Promise.all(
      isbns.map((isbn13) => fetchEntry(isbn13, apiKey, deps, controller.signal)),
    );
  } finally {
    clearTimeout(timer);
  }

  if (controller.signal.aborted) {
    return errorResponse('timeout', 'لم يستجب Google Books خلال خمس ثوانٍ.', 504);
  }

  // One flaky book stays non-fatal; everything failing is an outage, and saying
  // so is the difference between an error the reader can retry and a table of
  // blanks that looks like an answer.
  if (outcomes.every((outcome) => outcome.failed)) {
    return errorResponse('external_error', 'تعذّر الوصول إلى Google Books.', 502);
  }

  const results: readonly EnrichmentEntry[] = outcomes.map((outcome) => outcome.entry);
  const body: BatchEnrichment = { results };
  return Response.json(body, { headers: { 'cache-control': 'public, max-age=3600' } });
}

export async function handleEnrich(request: Request, deps: EnrichDeps): Promise<Response> {
  if (request.method !== 'GET') {
    return errorResponse('invalid_request', 'هذه النقطة تقبل طلبات GET فقط.', 405);
  }

  const params = new URL(request.url).searchParams;
  const many = params.get('isbns');
  const one = params.get('isbn');

  if (many !== null && one !== null) {
    return errorResponse('invalid_request', 'أرسل "isbn" أو "isbns"، لا كليهما.', 400);
  }
  if (many !== null) {
    return handleBatch(many, deps);
  }

  const isbn13 = (one ?? '').trim();
  if (!isValidIsbn13(isbn13)) {
    return errorResponse('invalid_request', 'أرسل معامل "isbn" يحتوي على رقم ردمك-13 صحيح.', 400);
  }

  // Fail loudly rather than quietly making a keyless request that Google
  // rate-limits to nothing.
  if (deps.apiKey === undefined || deps.apiKey === '') {
    return missingKeyResponse();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs);

  let upstream: Response;
  try {
    upstream = await deps.fetchImpl(buildGoogleBooksUrl(isbn13, deps.apiKey), {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
  } catch {
    // The key is never echoed into an error message.
    return controller.signal.aborted
      ? errorResponse('timeout', 'لم يستجب Google Books خلال خمس ثوانٍ.', 504)
      : errorResponse('external_error', 'تعذّر الوصول إلى Google Books.', 502);
  } finally {
    clearTimeout(timer);
  }

  if (!upstream.ok) {
    return errorResponse('external_error', `أعاد Google Books الحالة ${upstream.status}.`, 502);
  }

  let payload: unknown;
  try {
    payload = await upstream.json();
  } catch {
    return errorResponse('external_error', 'أعاد Google Books استجابة غير صالحة.', 502);
  }

  const enrichment = normalizeVolume(payload, isbn13);
  if (enrichment === null) {
    return errorResponse('not_found', 'لا يملك Google Books سجلًا لهذا الردمك.', 404);
  }

  return Response.json(enrichment, {
    headers: { 'cache-control': 'public, max-age=3600' },
  });
}
