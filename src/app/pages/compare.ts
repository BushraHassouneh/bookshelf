import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
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
  | { readonly kind: 'ready'; readonly byIsbn: ReadonlyMap<string, Enrichment | null> };

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
   * Detail already fetched, held across changes to the shortlist. Removing a
   * book must not re-request the ones that remain: that would blank their
   * columns while the second request ran, and spend another upstream call per
   * removal. Only ever grows, and is bounded by the size of the catalogue.
   */
  private readonly fetched = new Map<string, Enrichment | null>();

  constructor() {
    // Re-runs when a book is removed, so the fetched columns stay in step with
    // the shortlist without the page being reloaded.
    effect(() => {
      const isbns = this.favourites.books().map((book) => book.isbn13);
      void this.load(isbns);
    });
  }

  protected async load(isbn13s: readonly string[] = this.currentIsbns()): Promise<void> {
    const missing = isbn13s.filter((isbn13) => !this.fetched.has(isbn13));
    if (missing.length === 0) {
      this.detail.set({ kind: 'ready', byIsbn: new Map(this.fetched) });
      return;
    }
    this.detail.set({ kind: 'loading' });
    const result = await this.enrichment.loadMany(missing);
    if (!result.ok) {
      this.detail.set({ kind: 'error', error: result.error });
      return;
    }
    for (const entry of result.entries) {
      this.fetched.set(entry.isbn13, entry.found ? entry.enrichment : null);
    }
    this.detail.set({ kind: 'ready', byIsbn: new Map(this.fetched) });
  }

  protected currentIsbns(): readonly string[] {
    return this.favourites.books().map((book) => book.isbn13);
  }

  /** Null while loading, on error, and for a book Google did not recognise. */
  protected enrichmentFor(isbn13: string): Enrichment | null {
    const current = this.detail();
    return current.kind === 'ready' ? (current.byIsbn.get(isbn13) ?? null) : null;
  }

  protected remove(slug: string): void {
    this.favourites.remove(slug);
  }
}
