import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CustomerSessionStore } from '../../state/session/customer-session.store';
import { CustomerAuthService } from './customer-auth.service';

@Component({
  selector: 'aac-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth-shell customer-auth-shell">
      <p class="eyebrow">Customer login</p>
      <h1>Access your account</h1>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label class="field">
          <span>Email or mobile</span>
          <input formControlName="identifier" autocomplete="username">
        </label>
        <label class="field">
          <span>Password</span>
          <input formControlName="password" type="password" autocomplete="current-password">
        </label>
        @if (error()) {
          <p class="form-error">{{ error() }}</p>
        }
        <button class="button primary" type="submit" [disabled]="loading()">
          {{ loading() ? 'Signing in...' : 'Continue' }}
        </button>
      </form>

      <div class="auth-divider"><span>or</span></div>
      <button class="button secondary social-auth-button" type="button" (click)="googleLogin()">
        Continue with Google
      </button>
      <p class="auth-note">Google sign-in needs a Google Client ID token configured on the storefront.</p>

      <div class="auth-links">
        <a routerLink="/forgot-password">Forgot password?</a>
        <a routerLink="/register">Create account</a>
      </div>
    </section>
  `,
})
export class LoginPageComponent {
  private readonly auth = inject(CustomerAuthService);
  private readonly session = inject(CustomerSessionStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  readonly form = new FormGroup({
    identifier: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    if (this.session.isAuthenticated()) {
      queueMicrotask(() =>
        void this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') ?? '/account'),
      );
    }
  }

  protected submit(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Enter email/mobile and password.');
      return;
    }
    this.loading.set(true);
    this.auth.login(this.form.getRawValue()).subscribe((response) => {
      this.loading.set(false);
      if (!response) {
        this.error.set('Invalid email/mobile or password.');
        return;
      }
      void this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') ?? '/account');
    });
  }

  protected googleLogin(): void {
    this.error.set(
      'Google login is ready in API/DB, but requires Google Identity Services Client ID and token integration.',
    );
  }
}
