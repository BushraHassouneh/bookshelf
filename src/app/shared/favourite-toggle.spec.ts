import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FavouriteToggle } from './favourite-toggle';
import { FavouritesService } from '../core/favourites-service';
import { BOOKS } from '../core/catalogue';

const BOOK = BOOKS[0]!;

function render(): { button: HTMLButtonElement; detect: () => void } {
  const fixture = TestBed.createComponent(FavouriteToggle);
  fixture.componentRef.setInput('book', BOOK);
  fixture.detectChanges();
  const button = (fixture.nativeElement as HTMLElement).querySelector('button');
  if (button === null) {
    throw new Error('the toggle rendered no button');
  }
  return { button, detect: () => fixture.detectChanges() };
}

describe('FavouriteToggle', () => {
  beforeEach(async () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [FavouriteToggle] }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('is a real button, not a styled div', () => {
    expect(render().button.tagName).toBe('BUTTON');
  });

  it('names the book in its accessible name, not just "favourite"', () => {
    const { button } = render();
    expect(button.getAttribute('aria-label')).toContain(BOOK.title);
  });

  it('exposes its pressed state, and flips it on click', () => {
    const { button, detect } = render();
    expect(button.getAttribute('aria-pressed')).toBe('false');

    button.click();
    detect();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-label')).toContain('إزالة');

    button.click();
    detect();
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('marks the book in the shared store, so other views agree', () => {
    const { button, detect } = render();
    button.click();
    detect();
    expect(TestBed.inject(FavouritesService).has(BOOK.slug)).toBe(true);
  });

  it('does not let the click reach the card link wrapping it', () => {
    const { button } = render();
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    button.dispatchEvent(event);
    // The book card is one big link; an un-prevented click would navigate away
    // instead of marking the book.
    expect(event.defaultPrevented).toBe(true);
  });
});
