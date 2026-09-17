/**
 * Tests the deployed Function itself, not just the logic behind it.
 *
 * enrich-core.spec.ts takes its key as an argument, so it can never catch a
 * mistake in how api/enrich.ts reads the environment. This file exercises the
 * real default export, which is the thing Vercel runs.
 *
 * It lives in server/ rather than api/ because Vercel turns every file under
 * api/ into its own Function — a spec file there would be deployed.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiErrorEnvelope, Enrichment } from '../shared/api-contract';
import handler from '../api/enrich';

const VALID_ISBN = '9780307387899';
const ORIGINAL_KEY = process.env['GOOGLE_BOOKS_API_KEY'];

function get(isbn = VALID_ISBN): Request {
  return new Request(`https://example.test/api/enrich?isbn=${isbn}`);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env['GOOGLE_BOOKS_API_KEY'];
  } else {
    process.env['GOOGLE_BOOKS_API_KEY'] = ORIGINAL_KEY;
  }
});

describe('api/enrich', () => {
  it('returns the missing_configuration envelope when GOOGLE_BOOKS_API_KEY is unset', async () => {
    delete process.env['GOOGLE_BOOKS_API_KEY'];
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const response = await handler.fetch(get());
    const body = (await response.json()) as ApiErrorEnvelope;

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: {
        code: 'missing_configuration',
        message: 'بيانات اعتماد Google Books غير مضبوطة على الخادم، لذا تعذّر تحميل تفاصيل الكتاب.',
      },
    });
    // The whole point: it fails loudly instead of calling Google without a key.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reads the key from the environment and sends it to Google', async () => {
    process.env['GOOGLE_BOOKS_API_KEY'] = 'env-key-not-a-real-credential';
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ items: [{ volumeInfo: { pageCount: 287 } }] })),
      );

    const response = await handler.fetch(get());
    const body = (await response.json()) as Enrichment;

    expect(response.status).toBe(200);
    expect(body.pageCount).toBe(287);

    const requestedUrl = String(fetchSpy.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain('key=env-key-not-a-real-credential');
    expect(requestedUrl).toContain(`q=isbn%3A${VALID_ISBN}`);
  });

  it('rejects an invalid ISBN without reading the environment or the network', async () => {
    process.env['GOOGLE_BOOKS_API_KEY'] = 'env-key-not-a-real-credential';
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const response = await handler.fetch(get('not-an-isbn'));

    expect(response.status).toBe(400);
    expect(((await response.json()) as ApiErrorEnvelope).error.code).toBe('invalid_request');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
