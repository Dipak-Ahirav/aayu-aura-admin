import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'aac-track-order-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="auth-shell support-shell">
      <p class="eyebrow">Track order</p>
      <h1>Secure tracking</h1>
      <form [formGroup]="form">
        <label class="field">
          <span>Order number</span>
          <input formControlName="orderNumber">
        </label>
        <label class="field">
          <span>Email or mobile</span>
          <input formControlName="identifier">
        </label>
        <button class="button primary" type="button">Continue</button>
      </form>
      <a class="button whatsapp" href="https://wa.me/" target="_blank" rel="noreferrer">Get WhatsApp order help</a>
    </section>
  `,
})
export class TrackOrderPageComponent {
  readonly form = new FormGroup({
    orderNumber: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    identifier: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
}
