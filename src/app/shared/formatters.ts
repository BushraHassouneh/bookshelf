/**
 * The house formatters.
 *
 * Dates and money are formatted here and nowhere else. `toLocaleString` and
 * Angular's `date`/`currency` pipes are deliberately not used: both vary with
 * the visitor's locale, and the house style fixes one presentation for everyone.
 */

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Shown when a value is present but unusable, so a page never renders "NaN". */
export const UNKNOWN = 'Unknown';

/**
 * House date format: `15 Sep 2026`. Two-digit day, three-letter month, four-digit
 * year. No ordinals, no slashes, no full month names.
 *
 * Read in UTC on purpose. A date-only ISO string parses as UTC midnight, so
 * local-time getters would show the previous day for anyone west of Greenwich.
 */
export function formatIsoDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return UNKNOWN;
  }
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  const month = MONTHS[parsed.getUTCMonth()];
  return `${day} ${month} ${parsed.getUTCFullYear()}`;
}

/**
 * House money format: `12.50 JOD`. Exactly two decimals, one space, ISO code.
 * Never a currency symbol.
 *
 * Two decimals even though the dinar is conventionally quoted in three (1000
 * fils). The house style fixes two, and a house rule that bends per currency is
 * not a rule — so the rule wins and prices are carried to two places.
 */
export function formatMoney(amount: number, currency = 'JOD'): string {
  if (!Number.isFinite(amount)) {
    return UNKNOWN;
  }
  return `${amount.toFixed(2)} ${currency}`;
}
