import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeader } from '../shared/page-header';

/** The error page follows the house header rule too — that is the point of the rule. */
@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeader],
  template: `
    <app-page-header
      eyebrow="غير موجود"
      heading="هذه الصفحة غير موجودة"
      lede="العنوان الذي وصلت منه لا يطابق شيئًا على الرفّ."
    />
    <div class="state state--empty">
      <p class="state__title">لا شيء على هذا العنوان.</p>
      <p class="state__detail">الفهرس صغير، والكتاب الذي تبحث عنه على بعد نقرة واحدة غالبًا.</p>
      <a class="button" routerLink="/books">العودة إلى كل الكتب</a>
    </div>
  `,
})
export class NotFoundPage {}
