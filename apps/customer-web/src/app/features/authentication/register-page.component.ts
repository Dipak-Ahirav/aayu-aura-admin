import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CustomerSessionStore } from '../../state/session/customer-session.store';
import { CustomerAuthService } from './customer-auth.service';

@Component({
  selector: 'aac-register-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth-shell customer-auth-shell">
      <p class="eyebrow">Create account</p>
      <h1>Register with Aayu & Aura</h1>
      <form [formGroup]="form" (ngSubmit)="submit()">
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
        @if (error()) {
          <p class="form-error">{{ error() }}</p>
        }
        <button class="button primary" type="submit" [disabled]="loading()">
          {{ loading() ? 'Creating account...' : 'Create account' }}
        </button>
      </form>

      <div class="auth-divider"><span>or</span></div>
      <button class="button secondary social-auth-button" type="button" (click)="googleRegister()">
        Continue with Google
      </button>
      <p class="auth-note">Google sign-up is supported by the API after Google Client ID token wiring.</p>
      <a routerLink="/login">Already have an account? Login</a>
    </section>
  `,
})
export class RegisterPageComponent {
  private readonly auth = inject(CustomerAuthService);
  private readonly session = inject(CustomerSessionStore);
  private readonly router = inject(Router);
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
    mobile: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    termsAccepted: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
    marketingConsent: new FormControl(false, { nonNullable: true }),
  });

  constructor() {
    if (this.session.isAuthenticated()) {
      queueMicrotask(() => void this.router.navigate(['/account']));
    }
  }

  protected submit(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Complete all required fields and use a password of at least 8 characters.');
      return;
    }
    this.loading.set(true);
    this.auth.register(this.form.getRawValue()).subscribe((response) => {
      this.loading.set(false);
      if (!response) {
        this.error.set('Could not create account. Email or mobile may already be registered.');
        return;
      }
      void this.router.navigate(['/account']);
    });
  }

  protected googleRegister(): void {
    this.error.set(
      'Google sign-up is ready in API/DB, but requires Google Identity Services Client ID and token integration.',
    );
  }
}
