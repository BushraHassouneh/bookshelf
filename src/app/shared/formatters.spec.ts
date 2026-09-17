import { describe, expect, it } from 'vitest';
import { formatIsoDate, formatMoney, UNKNOWN } from './formatters';

describe('formatIsoDate', () => {
  it('renders the house format: two-digit day, three-letter month, four-digit year', () => {
    expect(formatIsoDate('2026-09-15')).toBe('15 Sep 2026');
  });

  it('pads a single-digit day', () => {
    expect(formatIsoDate('2020-02-08')).toBe('08 Feb 2020');
  });

  it('reads the date in UTC so the day does not shift in western timezones', () => {
    // Parsed as UTC midnight. Local-time getters would report the 14th
    // anywhere west of Greenwich.
    expect(formatIsoDate('2026-09-15T00:00:00Z')).toBe('15 Sep 2026');
  });

  it('never uses ordinals, slashes or full month names', () => {
    const rendered = formatIsoDate('2006-09-26');
    expect(rendered).toBe('26 Sep 2006');
    expect(rendered).not.toMatch(/\//);
    expect(rendered).not.toMatch(/th|st|nd|rd/);
    expect(rendered).not.toMatch(/September/);
  });

  it('returns a readable fallback rather than NaN for an unparseable date', () => {
    expect(formatIsoDate('not a date')).toBe(UNKNOWN);
  });
});

describe('formatMoney', () => {
  it('renders the house format: two decimals, a space, then the ISO code', () => {
    expect(formatMoney(12.5)).toBe('12.50 JOD');
  });

  it('keeps exactly two decimals when the number has more', () => {
    expect(formatMoney(10.999)).toBe('11.00 JOD');
  });

  it('keeps exactly two decimals when the number has none', () => {
    expect(formatMoney(13)).toBe('13.00 JOD');
  });

  it('keeps two decimals for the dinar, not the conventional three', () => {
    expect(formatMoney(5.5)).toBe('5.50 JOD');
  });

  it('never emits a currency symbol', () => {
    expect(formatMoney(11.99)).not.toMatch(/[€$£]/);
  });

  it('accepts a different ISO code', () => {
    expect(formatMoney(13.25, 'USD')).toBe('13.25 USD');
  });

  it('returns a readable fallback rather than NaN for a non-finite amount', () => {
    expect(formatMoney(Number.NaN)).toBe(UNKNOWN);
  });
});
