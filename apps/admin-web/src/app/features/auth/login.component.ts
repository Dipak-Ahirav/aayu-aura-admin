import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'aa-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <main class="login-page">
      <section class="brand-panel" aria-label="Aayu and Aura brand">
        <div class="brand-mark">A&A</div>
        <h1>Aayu & Aura</h1>
        <p>Elegant operations for saree catalogues, orders, invoices, and inventory.</p>
      </section>

      <mat-card class="login-card">
        <h2>Admin sign in</h2>
        <p class="muted">Use your authorized business account.</p>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" autocomplete="email" type="email" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input
              matInput
              formControlName="password"
              autocomplete="current-password"
              type="password"
            />
          </mat-form-field>

          @if (error()) {
            <p class="error" role="alert">{{ error() }}</p>
          }

          <button mat-flat-button color="primary" type="submit">Sign in</button>
        </form>
      </mat-card>
    </main>
  `,
  styles: [
    `
      .login-page {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 32px;
        padding: 32px;
        align-items: stretch;
      }

      .brand-panel {
        border-radius: 8px;
        padding: clamp(32px, 7vw, 88px);
        background:
          linear-gradient(135deg, rgba(123, 31, 53, 0.94), rgba(74, 31, 69, 0.94)),
          radial-gradient(circle at 18% 20%, rgba(189, 139, 58, 0.55), transparent 34%);
        color: #fffaf2;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        box-shadow: var(--aa-shadow);
      }

      .brand-mark {
        width: 76px;
        height: 76px;
        border: 1px solid rgba(255, 255, 255, 0.48);
        display: grid;
        place-items: center;
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 1.6rem;
        margin-bottom: auto;
      }

      h1 {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: clamp(3rem, 7vw, 6rem);
        line-height: 0.95;
        margin: 0 0 20px;
        letter-spacing: 0;
      }

      .brand-panel p {
        max-width: 560px;
        font-size: 1.1rem;
        line-height: 1.7;
        margin: 0;
      }

      .login-card {
        align-self: center;
        width: min(100%, 440px);
        justify-self: center;
        border-radius: 8px;
        padding: 32px;
        box-shadow: var(--aa-shadow);
      }

      h2 {
        margin: 0 0 8px;
        font-size: 1.6rem;
      }

      form {
        display: grid;
        gap: 14px;
        margin-top: 24px;
      }

      .error {
        margin: 0;
        color: #a12424;
        font-weight: 600;
      }

      button {
        min-height: 44px;
      }

      @media (max-width: 840px) {
        .login-page {
          grid-template-columns: 1fr;
          padding: 16px;
        }

        .brand-panel {
          min-height: 320px;
        }
      }
    `,
  ],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });
  readonly submitDisabled = computed(() => this.loading() || this.form.invalid);

  submit(): void {
    console.log('true:', this.submitDisabled());
    // if (this.submitDisabled()) {
    //   return;
    // }

    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => void this.router.navigateByUrl('/dashboard'),
      error: () => {
        this.error.set('The email or password is incorrect.');
        this.loading.set(false);
      },
    });
  }
}
