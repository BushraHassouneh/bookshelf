import { Injectable } from '@angular/core';
import { BOOKS, CATEGORIES } from './catalogue';
import type { Book, Category } from './models';

export class CategoryNotFoundError extends Error {
  constructor(readonly slug: string) {
    super(`No category with the slug "${slug}".`);
    this.name = 'CategoryNotFoundError';
  }
}

export interface CategoryListing {
  category: Category;
  books: readonly Book[];
}

/**
 * Reads the committed catalogue.
 *
 * The methods are async even though the data is a local module. That is the
 * boundary this app will actually have once the catalogue moves behind an API,
 * and it keeps the pages' loading and error states real code paths rather than
 * branches that can never be reached.
 */
@Injectable({ providedIn: 'root' })
export class CatalogueService {
  async listCategory(slug: string): Promise<CategoryListing> {
    const category = CATEGORIES.find((candidate) => candidate.slug === slug);
    if (category === undefined) {
      throw new CategoryNotFoundError(slug);
    }
    return {
      category,
      books: BOOKS.filter((book) => book.categorySlug === slug),
    };
  }

  async findBook(slug: string): Promise<Book | null> {
    return BOOKS.find((book) => book.slug === slug) ?? null;
  }

  /** The category the slice ships. The list page has no category picker yet. */
  get defaultCategorySlug(): string {
    const first = CATEGORIES[0];
    if (first === undefined) {
      throw new Error('The catalogue must contain at least one category.');
    }
    return first.slug;
  }
}
