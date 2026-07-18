import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'aac-content-page',
  standalone: true,
  template: `
    <section class="page-shell">
      <p class="eyebrow">Aayu & Aura</p>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </section>
  `,
})
export class ContentPageComponent {
  private readonly route = inject(ActivatedRoute);

  protected get title(): string {
    return this.route.snapshot.data['title'] ?? this.route.snapshot.paramMap.get('slug') ?? 'Page';
  }

  protected get description(): string {
    return this.route.snapshot.data['description'] ?? 'This customer content page will be managed from storefront settings.';
  }
}
