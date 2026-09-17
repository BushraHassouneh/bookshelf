import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogueService } from '../core/catalogue-service';
import type { Book, Category } from '../core/models';
import { PageHeader } from '../shared/page-header';
import { formatIsoDate, formatMoney } from '../shared/formatters';

/**
 * The four states the house style requires of every list. Modelled as a
 * discriminated union so the template cannot render two of them at once, and so
 * adding a state is a compile error everywhere it is handled.
 */
type ListState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'empty'; readonly category: Category }
  | { readonly kind: 'success'; readonly category: Category; readonly books: readonly Book[] };

@Component({
  selector: 'app-book-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeader],
  templateUrl: './book-list.html',
})
export class BookListPage {
  private readonly catalogue = inject(CatalogueService);

  protected readonly state = signal<ListState>({ kind: 'loading' });

  // Exposed for the template; formatting never happens inline.
  protected readonly formatIsoDate = formatIsoDate;
  protected readonly formatMoney = formatMoney;

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.state.set({ kind: 'loading' });
    try {
      const { category, books } = await this.catalogue.listCategory(
        this.catalogue.defaultCategorySlug,
      );
      this.state.set(
        books.length === 0 ? { kind: 'empty', category } : { kind: 'success', category, books },
      );
    } catch {
      this.state.set({
        kind: 'error',
        message: 'تعذّر تحميل الفهرس.',
      });
    }
  }
}
