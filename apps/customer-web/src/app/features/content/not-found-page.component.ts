import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'aac-not-found-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="page-shell">
      <p class="eyebrow">404</p>
      <h1>Page not found</h1>
      <p>The page you opened is not available.</p>
      <a class="button primary" routerLink="/">Go home</a>
    </section>
  `,
})
export class NotFoundPageComponent {}
