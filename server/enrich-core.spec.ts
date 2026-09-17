import { describe, expect, it, vi } from 'vitest';
import type { ApiErrorEnvelope, Enrichment } from '../shared/api-contract';
import {
  buildGoogleBooksUrl,
  EXTERNAL_TIMEOUT_MS,
  handleEnrich,
  isValidIsbn13,
  normalizeVolume,
  type EnrichDeps,
} from './enrich-core';

const VALID_ISBN = '9780307387899';
const FAKE_KEY = 'test-key-not-a-real-credential';

/** A fetch that must never be called. Used to prove we fail before the network. */
const forbiddenFetch = (() => {
  throw new Error('fetch must not be called');
}) as unknown as typeof fetch;

function jsonFetch(body: unknown, status = 200): typeof fetch {
  return vi.fn(
    async () => new Response(JSON.stringify(body), { status }),
  ) as unknown as typeof fetch;
}

/** Never resolves; only ever settles when its AbortSignal fires. */
const hangingFetch = ((_input: unknown, init?: { signal?: AbortSignal }) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
  })) as unknown as typeof fetch;

function deps(overrides: Partial<EnrichDeps> = {}): EnrichDeps {
  return {
    apiKey: FAKE_KEY,
    fetchImpl: jsonFetch({ items: [{ volumeInfo: {} }] }),
    timeoutMs: EXTERNAL_TIMEOUT_MS,
    ...overrides,
  };
}

function get(isbn: string): Request {
  return new Request(`https://example.test/api/enrich?isbn=${isbn}`);
}

async function envelopeOf(response: Response): Promise<ApiErrorEnvelope> {
  return (await response.json()) as ApiErrorEnvelope;
}

describe('isValidIsbn13', () => {
  it.each(['9780307387899', '9781400033416', '9781400078776', '9781984822185'])(
    'accepts the real ISBN %s',
    (isbn) => {
      expect(isValidIsbn13(isbn)).toBe(true);
    },
  );

  it('rejects a 13-digit string with a wrong check digit', () => {
    expect(isValidIsbn13('9780307387890')).toBe(false);
  });

  it.each(['', '978030738789', '97803073878991', '978-0-307-38789-9', 'abcdefghijklm'])(
    'rejects the malformed input %j',
    (value) => {
      expect(isValidIsbn13(value)).toBe(false);
    },
  );
});

describe('buildGoogleBooksUrl', () => {
  it('asks Google for the ISBN and passes the key as the documented query parameter', () => {
    const url = new URL(buildGoogleBooksUrl(VALID_ISBN, FAKE_KEY));
    expect(url.origin + url.pathname).toBe('https://www.googleapis.com/books/v1/volumes');
    expect(url.searchParams.get('q')).toBe(`isbn:${VALID_ISBN}`);
    expect(url.searchParams.get('key')).toBe(FAKE_KEY);
  });
});

describe('normalizeVolume', () => {
  it('keeps only the fields the detail page needs', () => {
    const result = normalizeVolume(
      {
        items: [
          {
            volumeInfo: {
              title: 'The Road',
              description: 'A father and son walk south.',
              pageCount: 287,
              publisher: 'Vintage',
              averageRating: 4.5,
              ratingsCount: 120,
              imageLinks: { thumbnail: 'http://books.google.com/thumb.jpg' },
              infoLink: 'https://books.google.com/info',
              industryIdentifiers: [{ type: 'ISBN_13', identifier: VALID_ISBN }],
            },
          },
        ],
      },
      VALID_ISBN,
    );

    expect(result).toEqual<Enrichment>({
      isbn13: VALID_ISBN,
      description: 'A father and son walk south.',
      pageCount: 287,
      publisher: 'Vintage',
      averageRating: 4.5,
      ratingsCount: 120,
      thumbnailUrl: 'https://books.google.com/thumb.jpg',
      infoUrl: 'https://books.google.com/info',
    });
    // The upstream payload had more than this; none of it leaked through.
    expect(Object.keys(result ?? {})).toHaveLength(8);
  });

  it('upgrades the thumbnail to https so a secure page can load it', () => {
    const result = normalizeVolume(
      { items: [{ volumeInfo: { imageLinks: { thumbnail: 'http://example.test/t.jpg' } } }] },
      VALID_ISBN,
    );
    expect(result?.thumbnailUrl).toBe('https://example.test/t.jpg');
  });

  it('nulls fields Google did not supply rather than inventing them', () => {
    const result = normalizeVolume({ items: [{ volumeInfo: { title: 'x' } }] }, VALID_ISBN);
    expect(result).toMatchObject({
      description: null,
      pageCount: null,
      publisher: null,
      thumbnailUrl: null,
    });
  });

  it.each([{}, { items: [] }, { items: [{}] }, null, 'nonsense'])(
    'returns null for the unusable payload %j',
    (payload) => {
      expect(normalizeVolume(payload, VALID_ISBN)).toBeNull();
    },
  );
});

describe('handleEnrich', () => {
  it('rejects a method other than GET', async () => {
    const response = await handleEnrich(
      new Request('https://example.test/api/enrich?isbn=' + VALID_ISBN, { method: 'POST' }),
      deps(),
    );
    expect(response.status).toBe(405);
    expect((await envelopeOf(response)).error.code).toBe('invalid_request');
  });

  it.each(['', 'abc', '9780307387890'])(
    'rejects the untrusted isbn %j before reaching the network',
    async (isbn) => {
      const response = await handleEnrich(get(isbn), deps({ fetchImpl: forbiddenFetch }));
      expect(response.status).toBe(400);
      expect((await envelopeOf(response)).error.code).toBe('invalid_request');
    },
  );

  it.each([undefined, ''])(
    'fails loudly with missing_configuration when the key is %j, and never calls Google',
    async (apiKey) => {
      const response = await handleEnrich(
        get(VALID_ISBN),
        deps({ apiKey, fetchImpl: forbiddenFetch }),
      );
      expect(response.status).toBe(500);
      expect((await envelopeOf(response)).error.code).toBe('missing_configuration');
    },
  );

  it('returns timeout when Google does not answer in time', async () => {
    const response = await handleEnrich(
      get(VALID_ISBN),
      deps({ fetchImpl: hangingFetch, timeoutMs: 5 }),
    );
    expect(response.status).toBe(504);
    expect((await envelopeOf(response)).error.code).toBe('timeout');
  });

  it('caps the external call at five seconds', () => {
    expect(EXTERNAL_TIMEOUT_MS).toBe(5000);
  });

  it('returns external_error when the network call fails outright', async () => {
    const failing = (() => Promise.reject(new Error('DNS'))) as unknown as typeof fetch;
    const response = await handleEnrich(get(VALID_ISBN), deps({ fetchImpl: failing }));
    expect(response.status).toBe(502);
    expect((await envelopeOf(response)).error.code).toBe('external_error');
  });

  it('returns external_error when Google answers with a failure status', async () => {
    const response = await handleEnrich(
      get(VALID_ISBN),
      deps({ fetchImpl: jsonFetch({ error: { code: 429 } }, 429) }),
    );
    expect(response.status).toBe(502);
    expect((await envelopeOf(response)).error.code).toBe('external_error');
  });

  it('returns not_found when Google knows no such volume', async () => {
    const response = await handleEnrich(
      get(VALID_ISBN),
      deps({ fetchImpl: jsonFetch({ totalItems: 0 }) }),
    );
    expect(response.status).toBe(404);
    expect((await envelopeOf(response)).error.code).toBe('not_found');
  });

  it('returns the normalized enrichment on success', async () => {
    const response = await handleEnrich(
      get(VALID_ISBN),
      deps({
        fetchImpl: jsonFetch({
          items: [{ volumeInfo: { description: 'A father and son walk south.', pageCount: 287 } }],
        }),
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as Enrichment;
    expect(body.isbn13).toBe(VALID_ISBN);
    expect(body.description).toBe('A father and son walk south.');
    expect(body.pageCount).toBe(287);
  });

  it('never echoes the API key into a response body', async () => {
    const responses = await Promise.all([
      handleEnrich(get(VALID_ISBN), deps({ fetchImpl: jsonFetch({ totalItems: 0 }) })),
      handleEnrich(get(VALID_ISBN), deps({ fetchImpl: jsonFetch({}, 500) })),
      handleEnrich(get(VALID_ISBN), deps({ fetchImpl: hangingFetch, timeoutMs: 5 })),
      handleEnrich(get(VALID_ISBN), deps()),
    ]);
    for (const response of responses) {
      expect(await response.text()).not.toContain(FAKE_KEY);
    }
  });
});
