import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The house page header: an uppercase letter-spaced eyebrow naming the section,
 * an h1, and one muted sentence underneath.
 *
 * Every page uses this, including the error page. Because it is a component
 * rather than a convention, a page cannot quietly ship without one.
 */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <p class="page-header__eyebrow">{{ eyebrow() }}</p>
      <h1 class="page-header__heading">{{ heading() }}</h1>
      <p class="page-header__lede">{{ lede() }}</p>
    </header>
  `,
  styles: `
    .page-header {
      margin-block-end: 2rem;
      padding-block-end: 1.25rem;
      border-block-end: 3px solid transparent;
      border-image: linear-gradient(90deg, var(--c-violet), var(--c-rose) 55%, var(--c-amber)) 1;
    }

    .page-header__eyebrow {
      display: inline-block;
      margin: 0 0 0.6rem;
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      background: var(--c-violet);
      color: #ffffff;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .page-header__heading {
      margin: 0;
      font-size: clamp(1.75rem, 1.2rem + 2vw, 2.5rem);
      line-height: 1.15;
      letter-spacing: -0.02em;
    }

    .page-header__lede {
      margin: 0.5rem 0 0;
      max-width: 60ch;
      color: var(--muted);
    }
  `,
})
export class PageHeader {
  readonly eyebrow = input.required<string>();
  readonly heading = input.required<string>();
  readonly lede = input.required<string>();
}
