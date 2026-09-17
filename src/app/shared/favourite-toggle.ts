import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FavouritesService } from '../core/favourites-service';
import type { Book } from '../core/models';

/**
 * Marks a book as a favourite, from wherever the visitor already is.
 *
 * The accessible name names the book. Without that, a list page is a row of
 * identical "add to favourites" buttons to anyone not looking at the screen.
 */
@Component({
  selector: 'app-favourite-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="favourite-toggle"
      [class.favourite-toggle--on]="isFavourite()"
      [attr.aria-pressed]="isFavourite()"
      [attr.aria-label]="label()"
      (click)="onClick($event)"
    >
      <span class="favourite-toggle__mark" aria-hidden="true">{{ isFavourite() ? '★' : '☆' }}</span>
      <span class="favourite-toggle__text">{{
        isFavourite() ? 'في المفضّلة' : 'أضف إلى المفضّلة'
      }}</span>
    </button>
  `,
})
export class FavouriteToggle {
  readonly book = input.required<Book>();

  private readonly favourites = inject(FavouritesService);

  protected readonly isFavourite = computed(() => this.favourites.has(this.book().slug));

  /**
   * Starts with the button's visible wording, so the accessible name contains
   * the visible label (WCAG 2.5.3). Someone using speech input says what they
   * can see; a name that paraphrases it does not respond to them.
   */
  protected readonly label = computed(() =>
    this.isFavourite()
      ? `في المفضّلة: ${this.book().title} — اضغط للإزالة`
      : `أضف إلى المفضّلة: ${this.book().title}`,
  );

  /**
   * The book card is one big link — `.book-card__link::after` covers it — so a
   * click here would otherwise navigate to the book instead of marking it.
   */
  protected onClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.favourites.toggle(this.book().slug);
  }
}
