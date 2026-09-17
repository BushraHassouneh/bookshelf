import { Injectable } from '@angular/core';
import type {
  ApiError,
  BatchEnrichment,
  Enrichment,
  EnrichmentEntry,
} from '../../../shared/api-contract';
import { MAX_BATCH_ISBNS } from '../../../shared/api-contract';

export type EnrichmentResult =
  | { readonly ok: true; readonly value: Enrichment }
  | { readonly ok: false; readonly error: ApiError };

export type BatchEnrichmentResult =
  | { readonly ok: true; readonly entries: readonly EnrichmentEntry[] }
  | { readonly ok: false; readonly error: ApiError };

/** Shown when the server is unreachable, so the UI never renders a raw exception. */
const UNREACHABLE: ApiError = {
  code: 'external_error',
  message: 'تعذّر الوصول إلى الخادم. تحقّق من اتصالك ثم أعد المحاولة.',
};

const MALFORMED: ApiError = {
  code: 'external_error',
  message: 'أرسل الخادم استجابة تعذّر على هذه الصفحة قراءتها.',
};

const TOO_MANY: ApiError = {
  code: 'invalid_request',
  message: `لا يمكن مقارنة أكثر من ${MAX_BATCH_ISBNS} كتابًا في وقت واحد.`,
};

function isEnrichment(value: unknown): value is Enrichment {
  return typeof value === 'object' && value !== null && 'isbn13' in value;
}

function readApiError(payload: unknown): ApiError | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const envelope = payload as { error?: unknown };
  if (typeof envelope.error !== 'object' || envelope.error === null) {
    return null;
  }
  const error = envelope.error as { code?: unknown; message?: unknown };
  if (typeof error.code !== 'string' || typeof error.message !== 'string') {
    return null;
  }
  return { code: error.code as ApiError['code'], message: error.message };
}

/**
 * The browser's only route to Google Books. It talks to our own /api/enrich and
 * never to Google, so the credential stays on the server.
 *
 * Failures come back as values rather than thrown exceptions, so a caller cannot
 * forget to render the error state.
 */
@Injectable({ providedIn: 'root' })
export class EnrichmentService {
  async load(isbn13: string): Promise<EnrichmentResult> {
    let response: Response;
    try {
      response = await fetch(`/api/enrich?isbn=${encodeURIComponent(isbn13)}`, {
        headers: { accept: 'application/json' },
      });
    } catch {
      return { ok: false, error: UNREACHABLE };
    }

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      return { ok: false, error: response.ok ? MALFORMED : UNREACHABLE };
    }

    if (!response.ok) {
      return { ok: false, error: readApiError(payload) ?? MALFORMED };
    }

    return isEnrichment(payload) ? { ok: true, value: payload } : { ok: false, error: MALFORMED };
  }

  /**
   * Detail for several books in one request. The comparison page uses this
   * instead of calling load() per book, so the number of requests does not grow
   * with the size of the shortlist.
   */
  async loadMany(isbn13s: readonly string[]): Promise<BatchEnrichmentResult> {
    if (isbn13s.length === 0) {
      return { ok: true, entries: [] };
    }
    // The spec enforces the cap on both sides. The server is the boundary that
    // matters, but without this a shortlist over the cap would fail the whole
    // page with a 400 instead of being caught here.
    if (isbn13s.length > MAX_BATCH_ISBNS) {
      return { ok: false, error: TOO_MANY };
    }

    const query = encodeURIComponent(isbn13s.join(','));
    let response: Response;
    try {
      response = await fetch(`/api/enrich?isbns=${query}`, {
        headers: { accept: 'application/json' },
      });
    } catch {
      return { ok: false, error: UNREACHABLE };
    }

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      return { ok: false, error: response.ok ? MALFORMED : UNREACHABLE };
    }

    if (!response.ok) {
      return { ok: false, error: readApiError(payload) ?? MALFORMED };
    }

    const results = (payload as Partial<BatchEnrichment>).results;
    return Array.isArray(results)
      ? { ok: true, entries: results as readonly EnrichmentEntry[] }
      : { ok: false, error: MALFORMED };
  }
}
