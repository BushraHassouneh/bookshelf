import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('creates the shell', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders a skip link as the first focusable element', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const skip = (fixture.nativeElement as HTMLElement).querySelector('.skip-link');
    expect(skip?.textContent?.trim()).toBe('تخطَّ إلى المحتوى');
  });
});
