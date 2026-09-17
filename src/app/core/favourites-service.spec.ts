import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FavouritesService } from './favourites-service';
import { BOOKS } from './catalogue';

const STORAGE_KEY = 'bookshelf:favourites';

/** Two real slugs, from different categories, so ordering is observable. */
const LITERARY = 'awlad-haretna';
const HISTORICAL = 'fajr-al-islam';

function makeService(): FavouritesService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  return TestBed.inject(FavouritesService);
}

describe('FavouritesService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('starts empty when nothing is stored', () => {
    const service = makeService();
    expect(service.count()).toBe(0);
    expect(service.books()).toHaveLength(0);
  });

  it('toggling twice returns to the starting state', () => {
    const service = makeService();
    service.toggle(LITERARY);
    expect(service.has(LITERARY)).toBe(true);
    expect(service.count()).toBe(1);

    service.toggle(LITERARY);
    expect(service.has(LITERARY)).toBe(false);
    expect(service.count()).toBe(0);
  });

  it('persists across a new instance, which is what surviving a reload means', () => {
    makeService().toggle(LITERARY);
    expect(makeService().has(LITERARY)).toBe(true);
  });

  it('returns favourites in catalogue order, not the order they were marked', () => {
    const service = makeService();
    // Marked historical first, but it comes later in the catalogue.
    service.toggle(HISTORICAL);
    service.toggle(LITERARY);

    const order = service.books().map((book) => book.slug);
    const catalogueOrder = BOOKS.filter((book) => order.includes(book.slug)).map((b) => b.slug);
    expect(order).toEqual(catalogueOrder);
    expect(order[0]).toBe(LITERARY);
  });

  it('refuses a slug that is not in the catalogue', () => {
    const service = makeService();
    service.toggle('no-such-book');
    expect(service.count()).toBe(0);
  });

  it.each([
    ['not json at all', 'not json'],
    ['an object', '{}'],
    ['a list of numbers', '[1,2,3]'],
    ['a list of unknown slugs', '["no-such-book","also-not-real"]'],
    ['a bare string', '"awlad-haretna"'],
    ['null', 'null'],
  ])('discards stored %s without throwing', (_label, stored) => {
    localStorage.setItem(STORAGE_KEY, stored);
    const service = makeService();
    expect(service.count()).toBe(0);
    expect(service.books()).toHaveLength(0);
  });

  it('keeps the known slugs out of a partly corrupt list', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([LITERARY, 'no-such-book', 42, null]));
    const service = makeService();
    expect(service.books().map((b) => b.slug)).toEqual([LITERARY]);
  });

  it('deduplicates a stored list', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([LITERARY, LITERARY, LITERARY]));
    expect(makeService().count()).toBe(1);
  });

  it('survives localStorage throwing on read, as in a private window', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('access denied');
    });
    const service = makeService();
    expect(service.count()).toBe(0);
  });

  it('survives localStorage throwing on write, and still works in memory', () => {
    const service = makeService();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(() => service.toggle(LITERARY)).not.toThrow();
    expect(service.has(LITERARY)).toBe(true);
  });

  it('remove takes a book out, and is safe on one that is not held', () => {
    const service = makeService();
    service.toggle(LITERARY);
    service.remove(LITERARY);
    expect(service.count()).toBe(0);
    expect(() => service.remove(LITERARY)).not.toThrow();
  });
});
