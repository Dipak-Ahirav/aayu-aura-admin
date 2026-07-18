import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'aac-register-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="auth-shell">
      <p class="eyebrow">Create account</p>
      <h1>Register with Aayu & Aura</h1>
      <form [formGroup]="form">
        <label class="field">
          <span>Full name</span>
          <input formControlName="name" autocomplete="name">
        </label>
        <label class="field">
          <span>Email</span>
          <input formControlName="email" type="email" autocomplete="email">
        </label>
        <label class="field">
          <span>Mobile number</span>
          <input formControlName="mobile" autocomplete="tel">
        </label>
        <label class="field">
          <span>Password</span>
          <input formControlName="password" type="password" autocomplete="new-password">
        </label>
        <label class="check">
          <input formControlName="termsAccepted" type="checkbox">
          <span>I accept the terms and privacy policy.</span>
        </label>
        <label class="check">
          <input formControlName="marketingConsent" type="checkbox">
          <span>Send me offers and collection updates.</span>
        </label>
        <button class="button primary" type="button">Create account</button>
      </form>
    </section>
  `,
})
export class RegisterPageComponent {
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
    mobile: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    termsAccepted: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
    marketingConsent: new FormControl(false, { nonNullable: true }),
  });
}
