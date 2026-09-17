import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogueService } from '../core/catalogue-service';
import { EnrichmentService } from '../core/enrichment-service';
import type { Book } from '../core/models';
import type { ApiError, Enrichment } from '../../../shared/api-contract';
import { THUMBNAIL_HEIGHT, THUMBNAIL_WIDTH } from '../../../shared/api-contract';
import { PageHeader } from '../shared/page-header';
import { FavouriteToggle } from '../shared/favourite-toggle';
import { formatIsoDate, formatMoney } from '../shared/formatters';

type BookState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'missing' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'ready'; readonly book: Book };

type EnrichmentState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly error: ApiError }
  | { readonly kind: 'ready'; readonly enrichment: Enrichment };

@Component({
  selector: 'app-book-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeader, FavouriteToggle],
  templateUrl: './book-detail.html',
})
export class BookDetailPage {
  private readonly catalogue = inject(CatalogueService);
  private readonly enrichmentService = inject(EnrichmentService);

  /** Bound from the :slug route parameter by withComponentInputBinding(). */
  readonly slug = input.required<string>();

  protected readonly bookState = signal<BookState>({ kind: 'loading' });
  protected readonly enrichmentState = signal<EnrichmentState>({ kind: 'idle' });

  protected readonly thumbnailWidth = THUMBNAIL_WIDTH;
  protected readonly thumbnailHeight = THUMBNAIL_HEIGHT;

  protected readonly formatIsoDate = formatIsoDate;
  protected readonly formatMoney = formatMoney;

  constructor() {
    // Re-runs if the router reuses this component for a different slug.
    effect(() => {
      const slug = this.slug();
      void this.loadBook(slug);
    });
  }

  private async loadBook(slug: string): Promise<void> {
    this.bookState.set({ kind: 'loading' });
    this.enrichmentState.set({ kind: 'idle' });
    try {
      const book = await this.catalogue.findBook(slug);
      if (book === null) {
        this.bookState.set({ kind: 'missing' });
        return;
      }
      this.bookState.set({ kind: 'ready', book });
      await this.loadEnrichment(book.isbn13);
    } catch {
      this.bookState.set({ kind: 'error', message: 'تعذّر تحميل هذا الكتاب.' });
    }
  }

  /** Protected rather than private so the error state's retry button can repeat the call. */
  protected async loadEnrichment(isbn13: string): Promise<void> {
    this.enrichmentState.set({ kind: 'loading' });
    const result = await this.enrichmentService.load(isbn13);
    this.enrichmentState.set(
      result.ok
        ? { kind: 'ready', enrichment: result.value }
        : { kind: 'error', error: result.error },
    );
  }
}
