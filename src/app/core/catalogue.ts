import type { Book, Category } from './models';

/**
 * The catalogue, committed as a TypeScript module. No database: the slice is
 * small enough that a file is the honest choice, and the data is typed at build
 * time rather than validated at runtime.
 *
 * Every ISBN-13 here is real, passes the checksum in server/enrich-core.ts, and
 * was verified against Google Books to resolve to the right author — Google's
 * Arabic metadata often credits a critical study rather than the novel itself,
 * so each one was checked by hand rather than taken from the first search hit.
 *
 * Slugs are transliterated so URLs stay ASCII.
 */

export const CATEGORIES: readonly Category[] = [
  {
    slug: 'arabic-literature',
    name: 'الأدب العربي',
    description: 'روايات عربية تستحق قراءة ثانية، اخترناها للغتها بقدر ما اخترناها لحكايتها.',
  },
  {
    slug: 'tarikhi',
    name: 'تاريخي',
    description: 'كتب التاريخ والسِّيَر التي ما زال يُرجَع إليها بعد قرون من كتابتها.',
  },
];

export const BOOKS: readonly Book[] = [
  {
    slug: 'awlad-haretna',
    categorySlug: 'arabic-literature',
    title: 'أولاد حارتنا',
    author: 'نجيب محفوظ',
    isbn13: '9789778616200',
    publishedDate: '2024-02-22',
    priceJod: 12.5,
    coverAlt: 'غلاف رواية أولاد حارتنا لنجيب محفوظ',
  },
  {
    slug: 'thakirat-al-jasad',
    categorySlug: 'arabic-literature',
    title: 'ذاكرة الجسد',
    author: 'أحلام مستغانمي',
    isbn13: '9786144381342',
    publishedDate: '2013-12-13',
    priceJod: 7.25,
    coverAlt: 'غلاف رواية ذاكرة الجسد لأحلام مستغانمي',
  },
  {
    slug: 'al-khubz-al-hafi',
    categorySlug: 'arabic-literature',
    title: 'الخبز الحافي',
    author: 'محمد شكري',
    isbn13: '9786144253816',
    publishedDate: '2017-03-21',
    priceJod: 5.5,
    coverAlt: 'غلاف رواية الخبز الحافي لمحمد شكري',
  },
  {
    slug: 'mawsim-al-hijra',
    categorySlug: 'arabic-literature',
    title: 'موسم الهجرة إلى الشمال',
    author: 'الطيب صالح',
    isbn13: '9786000080327',
    publishedDate: '1996-01-01',
    priceJod: 6.0,
    coverAlt: 'غلاف رواية موسم الهجرة إلى الشمال للطيب صالح',
  },
  {
    slug: 'muqaddimat-ibn-khaldun',
    categorySlug: 'tarikhi',
    title: 'مقدمة ابن خلدون',
    author: 'ابن خلدون',
    isbn13: '9789953780887',
    publishedDate: '2005-01-01',
    priceJod: 15.0,
    coverAlt: 'غلاف كتاب مقدمة ابن خلدون لابن خلدون',
  },
  {
    slug: 'al-bidaya-wal-nihaya',
    categorySlug: 'tarikhi',
    title: 'البداية والنهاية',
    author: 'ابن كثير',
    isbn13: '9786443438617',
    publishedDate: '2010-01-01',
    priceJod: 18.5,
    coverAlt: 'غلاف كتاب البداية والنهاية لابن كثير',
  },
  {
    slug: 'al-kamil-fi-al-tarikh',
    categorySlug: 'tarikhi',
    title: 'المختار من الكامل في التاريخ',
    author: 'ابن الأثير',
    isbn13: '9789770157268',
    publishedDate: '2000-01-01',
    priceJod: 9.5,
    coverAlt: 'غلاف كتاب المختار من الكامل في التاريخ لابن الأثير',
  },
  {
    slug: 'fajr-al-islam',
    categorySlug: 'tarikhi',
    title: 'فجر الإسلام',
    author: 'أحمد أمين',
    isbn13: '9781527303645',
    publishedDate: '2022-08-17',
    priceJod: 8.75,
    coverAlt: 'غلاف كتاب فجر الإسلام لأحمد أمين',
  },
];
