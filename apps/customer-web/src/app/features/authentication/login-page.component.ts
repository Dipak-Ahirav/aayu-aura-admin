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
      <aside class="auth-visual-panel">
        <p class="eyebrow">Welcome back</p>
        <h1>Continue your boutique saree shopping.</h1>
        <p>Sign in to restore wishlist, cart, delivery details, order tracking, returns, and checkout preferences.</p>
        <div class="auth-benefit-grid" aria-label="Account benefits">
          <span>Wishlist sync</span>
          <span>Fast checkout</span>
          <span>Order tracking</span>
        </div>
      </aside>

      <article class="auth-card">
        <p class="eyebrow">Customer login</p>
        <h2>Access your account</h2>
        <p class="auth-intro">Use your registered email or mobile number to continue.</p>
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label class="field auth-field" [class.is-invalid]="isInvalid('identifier')">
            <span>Email or mobile</span>
            <input
              formControlName="identifier"
              autocomplete="username"
              placeholder="name@email.com or 9876543210"
              aria-describedby="login-identifier-error"
            >
            @if (fieldError('identifier')) {
              <small id="login-identifier-error" class="field-error">{{ fieldError('identifier') }}</small>
            }
          </label>
          <label class="field auth-field" [class.is-invalid]="isInvalid('password')">
            <span>Password</span>
            <div class="password-input-row">
              <input
                formControlName="password"
                [type]="showPassword() ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Enter your password"
                aria-describedby="login-password-error"
              >
              <button type="button" (click)="togglePassword()">
                {{ showPassword() ? 'Hide' : 'Show' }}
              </button>
            </div>
            @if (fieldError('password')) {
              <small id="login-password-error" class="field-error">{{ fieldError('password') }}</small>
            }
          </label>
          @if (error()) {
            <p class="form-error auth-status">{{ error() }}</p>
          }
          <button class="button primary auth-submit-button" type="submit" [disabled]="loading()">
            {{ loading() ? 'Signing in...' : 'Sign in and continue' }}
          </button>
        </form>

        <div class="auth-divider"><span>or</span></div>
        <button class="button secondary social-auth-button" type="button" (click)="googleLogin()">
          Continue with Google
        </button>
        <p class="auth-note">Google OAuth endpoint is available; add the Google Client ID token on the storefront to enable live sign-in.</p>

        <div class="auth-links">
          <a routerLink="/forgot-password">Forgot password?</a>
          <a routerLink="/register">Create account</a>
        </div>
      </article>
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
  protected readonly showPassword = signal(false);

  readonly form = new FormGroup({
    identifier: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(4)] }),
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

  protected togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  protected isInvalid(name: 'identifier' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  protected fieldError(name: 'identifier' | 'password'): string {
    const control = this.form.controls[name];
    if (!(control.touched || control.dirty)) return '';
    if (control.hasError('required')) {
      return name === 'identifier' ? 'Enter your email or mobile number.' : 'Enter your password.';
    }
    if (control.hasError('minlength')) return 'Enter at least 4 characters.';
    return '';
  }
}
