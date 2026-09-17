import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { BookListPage } from './book-list';
import { CatalogueService } from '../core/catalogue-service';
import { BOOKS, CATEGORIES } from '../core/catalogue';

/**
 * The three routing cases the spec calls out: no slug means the default
 * category, a known slug means that category only, and an unknown slug is
 * not-found rather than empty or a silent fallback.
 */
describe('BookListPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookListPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  /** Reads the private state signal without widening the component's API. */
  function stateOf(fixture: { componentInstance: BookListPage }): {
    kind: string;
    category?: { slug: string };
    books?: readonly unknown[];
    slug?: string;
  } {
    return (fixture.componentInstance as unknown as { state: () => never }).state();
  }

  it('shows the first category when no slug is given, so /books is unchanged', async () => {
    const fixture = TestBed.createComponent(BookListPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const state = stateOf(fixture);
    expect(state.kind).toBe('success');
    expect(state.category?.slug).toBe(CATEGORIES[0]?.slug);
  });

  it('shows only the requested category when a slug is given', async () => {
    const fixture = TestBed.createComponent(BookListPage);
    fixture.componentRef.setInput('slug', 'tarikhi');
    fixture.detectChanges();
    await fixture.whenStable();

    const state = stateOf(fixture);
    expect(state.kind).toBe('success');
    expect(state.category?.slug).toBe('tarikhi');
    expect(state.books).toHaveLength(BOOKS.filter((b) => b.categorySlug === 'tarikhi').length);
  });

  it('reports an unknown slug as missing, not as empty and not as the default', async () => {
    const fixture = TestBed.createComponent(BookListPage);
    fixture.componentRef.setInput('slug', 'does-not-exist');
    fixture.detectChanges();
    await fixture.whenStable();

    const state = stateOf(fixture);
    expect(state.kind).toBe('missing');
    expect(state.kind).not.toBe('empty');
    expect(state.slug).toBe('does-not-exist');
  });

  it('renders a category link for every category, in every state', async () => {
    const fixture = TestBed.createComponent(BookListPage);
    fixture.componentRef.setInput('slug', 'does-not-exist');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const links = element.querySelectorAll('.category-nav__link');
    expect(links).toHaveLength(CATEGORIES.length);
  });

  it('falls back to the error state, with a retry, when the catalogue itself fails', async () => {
    // The reviewer's point: once CategoryNotFoundError routes to `missing`, the
    // error branch is only reachable by some other failure. If that branch is
    // never exercised it quietly becomes dead code.
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [BookListPage],
      providers: [
        provideRouter([]),
        {
          provide: CatalogueService,
          useValue: {
            defaultCategorySlug: 'arabic-literature',
            listCategory: () => Promise.reject(new Error('disk on fire')),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(BookListPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(stateOf(fixture).kind).toBe('error');
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.state--error')).not.toBeNull();
    expect(element.querySelector('.state--error button')?.textContent?.trim()).toBe('أعد المحاولة');
  });

  it('marks the current category with aria-current', async () => {
    const fixture = TestBed.createComponent(BookListPage);
    fixture.componentRef.setInput('slug', 'dini');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const current = element.querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0]?.textContent?.trim()).toBe(CATEGORIES.find((c) => c.slug === 'dini')?.name);
  });
});
