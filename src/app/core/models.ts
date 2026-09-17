/** The catalogue's own shapes. The API wire shapes live in shared/api-contract.ts. */

export interface Category {
  slug: string;
  name: string;
  /** One line, shown under the heading on the list page. */
  description: string;
}

export interface Book {
  slug: string;
  categorySlug: string;
  title: string;
  author: string;
  isbn13: string;
  /** ISO 8601 date. Rendered through formatIsoDate, never inline. */
  publishedDate: string;
  /** Jordanian dinars, as a plain number. Rendered through formatMoney, never inline. */
  priceJod: number;
  /** Alt text for the book's cover image. */
  coverAlt: string;
}
