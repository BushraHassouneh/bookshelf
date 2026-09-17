import { describe, expect, it, vi } from 'vitest';
import type { ApiErrorEnvelope, BatchEnrichment } from '../shared/api-contract';
import { MAX_BATCH_ISBNS } from '../shared/api-contract';
import { EXTERNAL_TIMEOUT_MS, handleEnrich, type EnrichDeps } from './enrich-core';

const A = '9789778616200'; // أولاد حارتنا
const B = '9786144381342'; // ذاكرة الجسد
const C = '9780307387899'; // The Road
const FAKE_KEY = 'test-key-not-a-real-credential';

/** A fetch that must never be called: proves validation happens before the network. */
const forbiddenFetch = (() => {
  throw new Error('fetch must not be called');
}) as unknown as typeof fetch;

/** Answers per ISBN, so one lookup can be made to fail while others succeed. */
function fetchByIsbn(map: Record<string, unknown | null>): typeof fetch {
  return vi.fn(async (input: unknown) => {
    const url = new URL(String(input));
    const isbn = (url.searchParams.get('q') ?? '').replace('isbn:', '');
    const body = map[isbn];
    if (body === null || body === undefined) {
      return new Response(JSON.stringify({ totalItems: 0 }), { status: 200 });
    }
    return new Response(JSON.stringify(body), { status: 200 });
  }) as unknown as typeof fetch;
}

function volume(pageCount: number): unknown {
  return { items: [{ volumeInfo: { pageCount } }] };
}

const hangingFetch = ((_input: unknown, init?: { signal?: AbortSignal }) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
  })) as unknown as typeof fetch;

function deps(overrides: Partial<EnrichDeps> = {}): EnrichDeps {
  return {
    apiKey: FAKE_KEY,
    fetchImpl: fetchByIsbn({}),
    timeoutMs: EXTERNAL_TIMEOUT_MS,
    ...overrides,
  };
}

function get(query: string): Request {
  return new Request(`https://example.test/api/enrich?${query}`);
}

async function envelope(response: Response): Promise<ApiErrorEnvelope> {
  return (await response.json()) as ApiErrorEnvelope;
}

describe('handleEnrich, list form', () => {
  it('rejects both parameters at once rather than guessing which is meant', async () => {
    const response = await handleEnrich(
      get(`isbn=${A}&isbns=${B}`),
      deps({ fetchImpl: forbiddenFetch }),
    );
    expect(response.status).toBe(400);
    expect((await envelope(response)).error.code).toBe('invalid_request');
  });

  it.each(['isbns=', 'isbns=,,,', 'isbns=%20'])(
    'rejects an empty list (%s) without calling upstream',
    async (query) => {
      const response = await handleEnrich(get(query), deps({ fetchImpl: forbiddenFetch }));
      expect(response.status).toBe(400);
      expect((await envelope(response)).error.code).toBe('invalid_request');
    },
  );

  it('rejects the whole request if any member is malformed, before any fetch', async () => {
    const response = await handleEnrich(
      get(`isbns=${A},not-an-isbn,${B}`),
      deps({ fetchImpl: forbiddenFetch }),
    );
    expect(response.status).toBe(400);
    expect((await envelope(response)).error.code).toBe('invalid_request');
  });

  it('caps the batch, and calls nothing upstream when the cap is exceeded', async () => {
    const tooMany = Array.from({ length: MAX_BATCH_ISBNS + 1 }, () => A).join(',');
    const response = await handleEnrich(
      get(`isbns=${tooMany}`),
      deps({ fetchImpl: forbiddenFetch }),
    );
    expect(response.status).toBe(400);
    expect((await envelope(response)).error.code).toBe('invalid_request');
  });

  it('accepts exactly the cap', async () => {
    const atCap = Array.from({ length: MAX_BATCH_ISBNS }, () => A).join(',');
    const response = await handleEnrich(
      get(`isbns=${atCap}`),
      deps({ fetchImpl: fetchByIsbn({ [A]: volume(708) }) }),
    );
    expect(response.status).toBe(200);
    expect(((await response.json()) as BatchEnrichment).results).toHaveLength(MAX_BATCH_ISBNS);
  });

  it('fails loudly with missing_configuration, and never calls Google', async () => {
    const response = await handleEnrich(
      get(`isbns=${A},${B}`),
      deps({ apiKey: undefined, fetchImpl: forbiddenFetch }),
    );
    expect(response.status).toBe(500);
    expect((await envelope(response)).error.code).toBe('missing_configuration');
  });

  it('returns one entry per requested ISBN, in request order', async () => {
    const response = await handleEnrich(
      get(`isbns=${A},${B},${C}`),
      deps({ fetchImpl: fetchByIsbn({ [A]: volume(708), [B]: volume(270), [C]: volume(287) }) }),
    );
    expect(response.status).toBe(200);

    const body = (await response.json()) as BatchEnrichment;
    expect(body.results.map((entry) => entry.isbn13)).toEqual([A, B, C]);
    expect(body.results.every((entry) => entry.found)).toBe(true);
    expect(body.results[0]?.enrichment?.pageCount).toBe(708);
  });

  it('reports one unknown ISBN as absent without failing the others', async () => {
    const response = await handleEnrich(
      get(`isbns=${A},${B}`),
      // B resolves to nothing.
      deps({ fetchImpl: fetchByIsbn({ [A]: volume(708) }) }),
    );
    expect(response.status).toBe(200);

    const body = (await response.json()) as BatchEnrichment;
    expect(body.results[0]).toMatchObject({ isbn13: A, found: true });
    expect(body.results[1]).toMatchObject({ isbn13: B, found: false, enrichment: null });
  });

  it('one failing lookup does not fail the request', async () => {
    const flaky = vi.fn(async (input: unknown) => {
      if (String(input).includes(B)) {
        throw new Error('connection reset');
      }
      return new Response(JSON.stringify(volume(708)), { status: 200 });
    }) as unknown as typeof fetch;

    const response = await handleEnrich(get(`isbns=${A},${B}`), deps({ fetchImpl: flaky }));
    expect(response.status).toBe(200);

    const body = (await response.json()) as BatchEnrichment;
    expect(body.results[0]?.found).toBe(true);
    expect(body.results[1]?.found).toBe(false);
  });

  it('returns external_error when every lookup fails, rather than a table of blanks', async () => {
    // A revoked or over-quota key fails every entry. Reporting that as "found:
    // false" for all of them would render a full comparison of dashes that
    // reads as "Google has no record of any of these books".
    const allFail = (async () =>
      new Response('forbidden', { status: 403 })) as unknown as typeof fetch;

    const response = await handleEnrich(get(`isbns=${A},${B}`), deps({ fetchImpl: allFail }));
    expect(response.status).toBe(502);
    expect((await envelope(response)).error.code).toBe('external_error');
  });

  it('one failing lookup among successes is still not fatal', async () => {
    const oneFails = vi.fn(async (input: unknown) => {
      if (String(input).includes(B)) {
        return new Response('nope', { status: 500 });
      }
      return new Response(JSON.stringify(volume(708)), { status: 200 });
    }) as unknown as typeof fetch;

    const response = await handleEnrich(get(`isbns=${A},${B}`), deps({ fetchImpl: oneFails }));
    expect(response.status).toBe(200);
    const body = (await response.json()) as BatchEnrichment;
    expect(body.results[0]?.found).toBe(true);
    expect(body.results[1]?.found).toBe(false);
  });

  it('a genuinely unknown book is not treated as a failure', async () => {
    // Every lookup "succeeds" but finds nothing: that is an answer, not an
    // outage, so it must not become external_error.
    const response = await handleEnrich(
      get(`isbns=${A},${B}`),
      deps({ fetchImpl: fetchByIsbn({}) }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as BatchEnrichment;
    expect(body.results.every((entry) => !entry.found)).toBe(true);
  });

  it('times out the batch as a whole rather than per book', async () => {
    const response = await handleEnrich(
      get(`isbns=${A},${B},${C}`),
      deps({ fetchImpl: hangingFetch, timeoutMs: 5 }),
    );
    expect(response.status).toBe(504);
    expect((await envelope(response)).error.code).toBe('timeout');
  });

  it('never echoes the API key into a response body', async () => {
    const responses = await Promise.all([
      handleEnrich(get(`isbns=${A},${B}`), deps({ fetchImpl: fetchByIsbn({ [A]: volume(1) }) })),
      handleEnrich(get(`isbns=${A},bad`), deps({ fetchImpl: forbiddenFetch })),
      handleEnrich(get(`isbns=${A}`), deps({ fetchImpl: hangingFetch, timeoutMs: 5 })),
    ]);
    for (const response of responses) {
      expect(await response.text()).not.toContain(FAKE_KEY);
    }
  });
});
