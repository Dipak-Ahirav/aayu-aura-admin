import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'aac-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth-shell">
      <p class="eyebrow">Customer login</p>
      <h1>Access your account</h1>
      <form [formGroup]="form">
        <label class="field">
          <span>Email or mobile</span>
          <input formControlName="identifier" autocomplete="username">
        </label>
        <label class="field">
          <span>Password</span>
          <input formControlName="password" type="password" autocomplete="current-password">
        </label>
        <button class="button primary" type="button">Continue</button>
      </form>
      <a routerLink="/forgot-password">Forgot password?</a>
    </section>
  `,
})
export class LoginPageComponent {
  readonly form = new FormGroup({
    identifier: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
}
