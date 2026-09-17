import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'books' },
  {
    path: 'books',
    title: 'الكتب · رفّ الكتب',
    loadComponent: () => import('./pages/book-list').then((m) => m.BookListPage),
  },
  {
    path: 'books/:slug',
    title: 'كتاب · رفّ الكتب',
    loadComponent: () => import('./pages/book-detail').then((m) => m.BookDetailPage),
  },
  {
    path: '**',
    title: 'غير موجود · رفّ الكتب',
    loadComponent: () => import('./pages/not-found').then((m) => m.NotFoundPage),
  },
];
