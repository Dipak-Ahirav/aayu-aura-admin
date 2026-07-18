import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'aac-auth-placeholder-page',
  standalone: true,
  template: `
    <section class="page-shell">
      <p class="eyebrow">Authentication</p>
      <h1>{{ route.snapshot.data['title'] }}</h1>
      <p>Customer authentication endpoints and verification workflows are planned for Phase 4.</p>
    </section>
  `,
})
export class AuthPlaceholderPageComponent {
  protected readonly route = inject(ActivatedRoute);
}
