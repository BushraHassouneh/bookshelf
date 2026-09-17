import { Injectable, computed, signal } from '@angular/core';
import { BOOKS } from './catalogue';
import type { Book } from './models';

/**
 * The visitor's shortlist, held in their own browser.
 *
 * Nothing here is sent to the server. The stored value is the only input to this
 * application that a visitor can edit by hand, so every read treats it as
 * hostile: anything that is not a list of slugs this catalogue recognises is
 * discarded rather than repaired.
 *
 * localStorage is also the only API here that throws rather than returning null
 * — in a private window, with site data blocked, or over quota. A throw from the
 * constructor would take the whole application down, so every access is guarded
 * and the service degrades to an in-memory list.
 */
const STORAGE_KEY = 'bookshelf:favourites';

@Injectable({ providedIn: 'root' })
export class FavouritesService {
  private readonly slugs = signal<readonly string[]>([]);

  /** For the masthead. */
  readonly count = computed(() => this.slugs().length);

  /**
   * The favourite books in catalogue order, not the order they were marked in.
   * Ordering lives here so every view of the shortlist agrees.
   */
  readonly books = computed<readonly Book[]>(() => {
    const chosen = new Set(this.slugs());
    return BOOKS.filter((book) => chosen.has(book.slug));
  });

  constructor() {
    this.slugs.set(FavouritesService.read());
  }

  has(slug: string): boolean {
    return this.slugs().includes(slug);
  }

  toggle(slug: string): void {
    if (!BOOKS.some((book) => book.slug === slug)) {
      return;
    }
    this.commit(
      this.has(slug) ? this.slugs().filter((held) => held !== slug) : [...this.slugs(), slug],
    );
  }

  remove(slug: string): void {
    this.commit(this.slugs().filter((held) => held !== slug));
  }

  private commit(next: readonly string[]): void {
    this.slugs.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable or full. The signal is still correct for this
      // session; only persistence is lost, which is not worth an error to the
      // visitor.
    }
  }

  /** Static so the constructor cannot accidentally depend on instance state. */
  private static read(): readonly string[] {
    let raw: string | null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      return [];
    }
    if (raw === null) {
      return [];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) {
      return [];
    }

    const known = new Set(BOOKS.map((book) => book.slug));
    const seen = new Set<string>();
    const kept: string[] = [];
    for (const entry of parsed) {
      if (typeof entry !== 'string' || !known.has(entry) || seen.has(entry)) {
        continue;
      }
      seen.add(entry);
      kept.push(entry);
    }
    return kept;
  }
}
