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
      <aside class="auth-visual-panel register-panel">
        <p class="eyebrow">Join Aayu & Aura</p>
        <h1>Create a personal saree shopping account.</h1>
        <p>Save your wishlist, keep your cart synced, track orders, download invoices, and manage returns from one place.</p>
        <div class="auth-benefit-grid" aria-label="Account benefits">
          <span>Saved looks</span>
          <span>COD checks</span>
          <span>Easy returns</span>
        </div>
      </aside>

      <article class="auth-card">
        <p class="eyebrow">Create account</p>
        <h2>Register with Aayu & Aura</h2>
        <p class="auth-intro">Complete every required line below to create your customer profile.</p>
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label class="field auth-field" [class.is-invalid]="isInvalid('name')">
            <span>Full name</span>
            <input formControlName="name" autocomplete="name" placeholder="Your full name">
            @if (fieldError('name')) {
              <small class="field-error">{{ fieldError('name') }}</small>
            }
          </label>
          <label class="field auth-field" [class.is-invalid]="isInvalid('email')">
            <span>Email</span>
            <input formControlName="email" type="email" autocomplete="email" placeholder="name@email.com">
            @if (fieldError('email')) {
              <small class="field-error">{{ fieldError('email') }}</small>
            }
          </label>
          <label class="field auth-field" [class.is-invalid]="isInvalid('mobile')">
            <span>Mobile number</span>
            <input formControlName="mobile" autocomplete="tel" inputmode="tel" placeholder="9876543210">
            @if (fieldError('mobile')) {
              <small class="field-error">{{ fieldError('mobile') }}</small>
            }
          </label>
          <label class="field auth-field" [class.is-invalid]="isInvalid('password')">
            <span>Password</span>
            <div class="password-input-row">
              <input
                formControlName="password"
                [type]="showPassword() ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Minimum 8 characters"
              >
              <button type="button" (click)="togglePassword()">
                {{ showPassword() ? 'Hide' : 'Show' }}
              </button>
            </div>
            <div class="password-strength" aria-label="Password strength">
              <span [class.is-active]="passwordScore() >= 1"></span>
              <span [class.is-active]="passwordScore() >= 2"></span>
              <span [class.is-active]="passwordScore() >= 3"></span>
              <small>{{ passwordHint() }}</small>
            </div>
            @if (fieldError('password')) {
              <small class="field-error">{{ fieldError('password') }}</small>
            }
          </label>
          <label class="field auth-field" [class.is-invalid]="isInvalid('confirmPassword') || confirmPasswordMismatch()">
            <span>Confirm password</span>
            <div class="password-input-row">
              <input
                formControlName="confirmPassword"
                [type]="showConfirmPassword() ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Re-enter password"
              >
              <button type="button" (click)="toggleConfirmPassword()">
                {{ showConfirmPassword() ? 'Hide' : 'Show' }}
              </button>
            </div>
            @if (fieldError('confirmPassword')) {
              <small class="field-error">{{ fieldError('confirmPassword') }}</small>
            }
          </label>
          <label class="check auth-check" [class.is-invalid]="isInvalid('termsAccepted')">
            <input formControlName="termsAccepted" type="checkbox">
            <span>I accept the terms and privacy policy.</span>
          </label>
          @if (fieldError('termsAccepted')) {
            <small class="field-error standalone-error">{{ fieldError('termsAccepted') }}</small>
          }
          <label class="check auth-check">
            <input formControlName="marketingConsent" type="checkbox">
            <span>Send me offers and collection updates.</span>
          </label>
          @if (error()) {
            <p class="form-error auth-status">{{ error() }}</p>
          }
          <button class="button primary auth-submit-button" type="submit" [disabled]="loading()">
            {{ loading() ? 'Creating account...' : 'Create account' }}
          </button>
        </form>

        <div class="auth-divider"><span>or</span></div>
        <button class="button secondary social-auth-button" type="button" (click)="googleRegister()">
          Continue with Google
        </button>
        <p class="auth-note">Google OAuth endpoint is available; add the Google Client ID token on the storefront to enable live sign-up.</p>
        <a class="auth-switch-link" routerLink="/login">Already have an account? Login</a>
      </article>
    </section>
  `,
})
export class RegisterPageComponent {
  private readonly auth = inject(CustomerAuthService);
  private readonly session = inject(CustomerSessionStore);
  private readonly router = inject(Router);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    mobile: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
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
    if (this.form.invalid || this.confirmPasswordMismatch()) {
      this.form.markAllAsTouched();
      this.error.set('Complete all required fields and use a password of at least 8 characters.');
      return;
    }
    const { confirmPassword: _confirmPassword, ...payload } = this.form.getRawValue();
    this.loading.set(true);
    this.auth.register(payload).subscribe((response) => {
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

  protected togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  protected toggleConfirmPassword(): void {
    this.showConfirmPassword.update((value) => !value);
  }

  protected isInvalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  protected fieldError(name: keyof typeof this.form.controls): string {
    const control = this.form.controls[name];
    if (!(control.touched || control.dirty)) return '';
    if (name === 'confirmPassword' && this.confirmPasswordMismatch()) return 'Passwords do not match.';
    if (control.hasError('required') || control.hasError('requiredTrue')) {
      const labels: Record<keyof typeof this.form.controls, string> = {
        name: 'Enter your full name.',
        email: 'Enter your email address.',
        mobile: 'Enter your mobile number.',
        password: 'Create a password.',
        confirmPassword: 'Confirm your password.',
        termsAccepted: 'Accept the terms and privacy policy to continue.',
        marketingConsent: '',
      };
      return labels[name];
    }
    if (control.hasError('email')) return 'Enter a valid email address.';
    if (control.hasError('minlength')) {
      return name === 'password' ? 'Use at least 8 characters.' : 'This value is too short.';
    }
    return '';
  }

  protected confirmPasswordMismatch(): boolean {
    const confirmControl = this.form.controls.confirmPassword;
    if (!(confirmControl.touched || confirmControl.dirty)) return false;
    return this.form.controls.password.value !== confirmControl.value;
  }

  protected passwordScore(): number {
    const password = this.form.controls.password.value;
    if (!password) return 0;
    let score = password.length >= 8 ? 1 : 0;
    if (/[A-Z]/.test(password) || /\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password) || (/[A-Z]/.test(password) && /\d/.test(password))) score += 1;
    return Math.min(score, 3);
  }

  protected passwordHint(): string {
    const score = this.passwordScore();
    if (score === 0) return 'Use 8+ characters';
    if (score === 1) return 'Add a number or uppercase letter';
    if (score === 2) return 'Good password';
    return 'Strong password';
  }
}
