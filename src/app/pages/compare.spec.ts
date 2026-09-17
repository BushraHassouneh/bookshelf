import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ComparePage } from './compare';
import { FavouritesService } from '../core/favourites-service';
import { BOOKS } from '../core/catalogue';

const THREE = BOOKS.slice(0, 3);

function batchResponse(isbns: readonly string[]): Response {
  return new Response(
    JSON.stringify({
      results: isbns.map((isbn13) => ({
        isbn13,
        found: true,
        enrichment: { isbn13, publisher: 'Diwan', pageCount: 708, averageRating: 4 },
      })),
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

async function render(): Promise<{ element: HTMLElement; detect: () => void }> {
  const fixture = TestBed.createComponent(ComparePage);
  fixture.detectChanges();
  await fixture.whenStable();
  // The load is started from an effect and not awaited by the component, and in
  // a zoneless application whenStable() does not track a floating promise
  // chain. A macrotask lets fetch and its .json() settle before we assert.
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
  return { element: fixture.nativeElement as HTMLElement, detect: () => fixture.detectChanges() };
}

describe('ComparePage', () => {
  beforeEach(async () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ComparePage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('shows the empty state, and says how to add a book, when nothing is marked', async () => {
    const calls = vi.spyOn(globalThis, 'fetch');
    const { element } = await render();

    expect(element.querySelector('.state--empty')).not.toBeNull();
    expect(element.querySelector('table')).toBeNull();
    expect(element.textContent).toContain('أضف إلى المفضّلة');
    // Nothing to enrich, so nothing is requested.
    expect(calls).not.toHaveBeenCalled();
  });

  it('still renders the house header block when empty', async () => {
    const { element } = await render();
    expect(element.querySelector('.page-header__eyebrow')?.textContent?.trim()).toBe('المقارنة');
    expect(element.querySelector('h1')).not.toBeNull();
    expect(element.querySelector('.page-header__lede')).not.toBeNull();
  });

  it('makes exactly one request regardless of how many books are compared', async () => {
    const favourites = TestBed.inject(FavouritesService);
    for (const book of THREE) {
      favourites.toggle(book.slug);
    }

    const calls = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => batchResponse(THREE.map((b) => b.isbn13)));

    await render();

    expect(calls).toHaveBeenCalledTimes(1);
    const url = String(calls.mock.calls[0]?.[0]);
    expect(url).toContain('/api/enrich?isbns=');
    // One request carrying every ISBN, not one request per book.
    for (const book of THREE) {
      expect(decodeURIComponent(url)).toContain(book.isbn13);
    }
  });

  it('renders a column per favourite and the fetched rows', async () => {
    const favourites = TestBed.inject(FavouritesService);
    for (const book of THREE) {
      favourites.toggle(book.slug);
    }
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      batchResponse(THREE.map((b) => b.isbn13)),
    );

    const { element } = await render();

    const headers = element.querySelectorAll('thead th');
    // One label column plus one per book.
    expect(headers).toHaveLength(THREE.length + 1);
    expect(element.textContent).toContain('Diwan');
    expect(element.textContent).toContain('708');
  });

  it('keeps the books on screen when the detail request fails, and offers a retry', async () => {
    TestBed.inject(FavouritesService).toggle(THREE[0]!.slug);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      throw new Error('offline');
    });

    const { element } = await render();

    expect(element.querySelector('.state--error')).not.toBeNull();
    expect(element.querySelector('.state--error button')).not.toBeNull();
    // The point of the error state here: the table is still there.
    expect(element.querySelector('table')).not.toBeNull();
    expect(element.textContent).toContain(THREE[0]!.title);
  });

  it('removing the last favourite leaves the empty state, not a blank page', async () => {
    const favourites = TestBed.inject(FavouritesService);
    favourites.toggle(THREE[0]!.slug);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => batchResponse([THREE[0]!.isbn13]));

    const { element, detect } = await render();
    expect(element.querySelector('table')).not.toBeNull();

    favourites.remove(THREE[0]!.slug);
    detect();

    expect(element.querySelector('table')).toBeNull();
    expect(element.querySelector('.state--empty')).not.toBeNull();
  });

  it('removing one book does not re-request the detail of those that remain', async () => {
    const favourites = TestBed.inject(FavouritesService);
    for (const book of THREE) {
      favourites.toggle(book.slug);
    }
    const calls = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => batchResponse(THREE.map((b) => b.isbn13)));

    const { element, detect } = await render();
    expect(calls).toHaveBeenCalledTimes(1);

    favourites.remove(THREE[0]!.slug);
    detect();
    await new Promise((resolve) => setTimeout(resolve, 0));
    detect();

    // Still one request in total: the remaining books were already fetched.
    expect(calls).toHaveBeenCalledTimes(1);
    // And their fetched columns did not blank out while that was established.
    expect(element.textContent).toContain('Diwan');
    expect(element.textContent).not.toContain(THREE[0]!.title);
  });

  it('shows a dash rather than a gap for a book Google does not know', async () => {
    TestBed.inject(FavouritesService).toggle(THREE[0]!.slug);
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            results: [{ isbn13: THREE[0]!.isbn13, found: false, enrichment: null }],
          }),
          { status: 200 },
        ),
    );

    const { element } = await render();
    expect(element.querySelector('table')).not.toBeNull();
    expect(element.textContent).toContain('—');
  });
});
