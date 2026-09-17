import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavouritesService } from '../core/favourites-service';
import { EnrichmentService } from '../core/enrichment-service';
import type { ApiError, Enrichment } from '../../../shared/api-contract';
import { PageHeader } from '../shared/page-header';
import { formatIsoDate, formatMoney } from '../shared/formatters';

/**
 * The favourites are known immediately; only their extra detail is fetched. So
 * `loading` and `error` describe the detail, not the page — in both, the books
 * themselves are already on screen with their local fields.
 *
 * `empty` is not in this union: it is a property of the shortlist, not of the
 * request, and the template branches on the favourites directly.
 */
type DetailState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly error: ApiError }
  | { readonly kind: 'ready' };

@Component({
  selector: 'app-compare',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeader],
  templateUrl: './compare.html',
})
export class ComparePage {
  private readonly enrichment = inject(EnrichmentService);

  protected readonly favourites = inject(FavouritesService);

  protected readonly detail = signal<DetailState>({ kind: 'loading' });

  protected readonly formatIsoDate = formatIsoDate;
  protected readonly formatMoney = formatMoney;

  /**
   * Detail already fetched, held across changes to the shortlist and read
   * directly by the template. Two things depend on it outliving a request:
   * removing a book must not re-request the ones that remain, and a column that
   * has been fetched once must not blank back to a dash while some later
   * request is in flight. Only ever grows, so it is bounded by the catalogue.
   */
  private readonly fetched = signal<ReadonlyMap<string, Enrichment | null>>(new Map());

  constructor() {
    // Re-runs when a book is removed, so the fetched columns stay in step with
    // the shortlist without the page being reloaded. The shortlist is the only
    // dependency: load() reads the cache, and tracking that too would make
    // every fetch schedule a further pass through this effect.
    effect(() => {
      const isbns = this.favourites.books().map((book) => book.isbn13);
      untracked(() => void this.load(isbns));
    });
  }

  protected async load(isbn13s: readonly string[] = this.currentIsbns()): Promise<void> {
    const missing = isbn13s.filter((isbn13) => !this.fetched().has(isbn13));
    if (missing.length === 0) {
      this.detail.set({ kind: 'ready' });
      return;
    }
    this.detail.set({ kind: 'loading' });
    const result = await this.enrichment.loadMany(missing);
    if (!result.ok) {
      this.detail.set({ kind: 'error', error: result.error });
      return;
    }
    const next = new Map(this.fetched());
    for (const entry of result.entries) {
      next.set(entry.isbn13, entry.found ? entry.enrichment : null);
    }
    this.fetched.set(next);
    this.detail.set({ kind: 'ready' });
  }

  protected currentIsbns(): readonly string[] {
    return this.favourites.books().map((book) => book.isbn13);
  }

  /** Null until a book's detail has arrived, and for one Google did not know. */
  protected enrichmentFor(isbn13: string): Enrichment | null {
    return this.fetched().get(isbn13) ?? null;
  }

  protected remove(slug: string): void {
    this.favourites.remove(slug);
  }
}
