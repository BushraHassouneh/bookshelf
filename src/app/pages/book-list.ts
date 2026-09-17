import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogueService, CategoryNotFoundError } from '../core/catalogue-service';
import { CATEGORIES } from '../core/catalogue';
import type { Book, Category } from '../core/models';
import { PageHeader } from '../shared/page-header';
import { FavouriteToggle } from '../shared/favourite-toggle';
import { formatIsoDate, formatMoney } from '../shared/formatters';

/**
 * The states this page can be in. `missing` is separate from `error` on purpose:
 * a slug nobody stocks is a different thing from a catalogue that failed to load,
 * and offering a retry for the first would be a lie.
 */
type ListState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'missing'; readonly slug: string }
  | { readonly kind: 'empty'; readonly category: Category }
  | { readonly kind: 'success'; readonly category: Category; readonly books: readonly Book[] };

@Component({
  selector: 'app-book-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeader, FavouriteToggle],
  templateUrl: './book-list.html',
})
export class BookListPage {
  private readonly catalogue = inject(CatalogueService);

  /**
   * Bound from /categories/:slug by withComponentInputBinding(). Absent at
   * /books, which is what keeps that route rendering the first category.
   */
  readonly slug = input<string | undefined>(undefined);

  protected readonly categories = CATEGORIES;
  protected readonly state = signal<ListState>({ kind: 'loading' });

  // Exposed for the template; formatting never happens inline.
  protected readonly formatIsoDate = formatIsoDate;
  protected readonly formatMoney = formatMoney;

  constructor() {
    // Keyed on the input, so switching category re-loads without a remount.
    // The constructor must not also load, or every visit would load twice.
    effect(() => {
      const slug = this.slug();
      void this.load(slug);
    });
  }

  /**
   * The slug currently being shown, for marking the active navigation link.
   *
   * Must not throw: the template calls it from the nav, which renders above the
   * switch in every state. `defaultCategorySlug` throws on an empty catalogue,
   * so reading it here would paint nothing at all — not even the header block.
   */
  protected activeSlug(): string {
    const explicit = this.slug();
    if (explicit !== undefined) {
      return explicit;
    }
    const first = this.categories[0];
    return first === undefined ? '' : first.slug;
  }

  /**
   * The header block's heading and sentence, for every state. Computed here
   * rather than as nested ternaries in the template, which a five-member union
   * makes unreadable.
   */
  protected heading(): string {
    const current = this.state();
    if (current.kind === 'success' || current.kind === 'empty') {
      return current.category.name;
    }
    return current.kind === 'missing' ? 'تصنيف غير موجود' : 'الكتب';
  }

  protected lede(): string {
    const current = this.state();
    if (current.kind === 'success' || current.kind === 'empty') {
      return current.category.description;
    }
    return current.kind === 'missing' ? 'لا يوجد تصنيف بهذا العنوان على الرفّ.' : 'تصفَّح الرفّ.';
  }

  protected async load(slug = this.slug()): Promise<void> {
    this.state.set({ kind: 'loading' });
    // Resolved inside the try: defaultCategorySlug throws on an empty catalogue,
    // and outside it that throw escapes into the effect() as an unhandled
    // rejection, leaving the page on the loading state for good.
    let wanted = slug ?? '';
    try {
      wanted = slug ?? this.catalogue.defaultCategorySlug;
      const { category, books } = await this.catalogue.listCategory(wanted);
      this.state.set(
        books.length === 0 ? { kind: 'empty', category } : { kind: 'success', category, books },
      );
    } catch (cause) {
      this.state.set(
        cause instanceof CategoryNotFoundError
          ? { kind: 'missing', slug: wanted }
          : { kind: 'error', message: 'تعذّر تحميل الفهرس.' },
      );
    }
  }
}
