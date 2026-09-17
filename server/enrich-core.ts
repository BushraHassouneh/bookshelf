/**
 * All logic for the /api/enrich endpoint.
 *
 * This lives outside `api/` on purpose. Vercel turns every file under `api/`
 * into its own Function, and the slice is specified to have exactly one. Keeping
 * the logic here also makes it testable without a running server: `handleEnrich`
 * takes its key, its fetch and its timeout as arguments rather than reading
 * globals, so the tests never touch the network or a real API key.
 */

import type { ApiErrorCode, ApiErrorEnvelope, Enrichment } from '../shared/api-contract';

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

export async function handleEnrich(request: Request, deps: EnrichDeps): Promise<Response> {
  if (request.method !== 'GET') {
    return errorResponse('invalid_request', 'هذه النقطة تقبل طلبات GET فقط.', 405);
  }

  const isbn13 = (new URL(request.url).searchParams.get('isbn') ?? '').trim();
  if (!isValidIsbn13(isbn13)) {
    return errorResponse('invalid_request', 'أرسل معامل "isbn" يحتوي على رقم ردمك-13 صحيح.', 400);
  }

  // Fail loudly rather than quietly making a keyless request that Google
  // rate-limits to nothing.
  if (deps.apiKey === undefined || deps.apiKey === '') {
    return errorResponse(
      'missing_configuration',
      'بيانات اعتماد Google Books غير مضبوطة على الخادم، لذا تعذّر تحميل تفاصيل الكتاب.',
      500,
    );
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
