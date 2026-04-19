import { Component, inject, signal, AfterViewInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { passwordPolicy } from '../auth/validators';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss',
})
const TURNSTILE_SITE_KEY = '1x00000000000000000000AA';

export class SignupPageComponent implements AfterViewInit {
  private readonly http = inject(HttpClient);

  readonly form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, passwordPolicy]),
  });

  readonly submitting = signal(false);
  readonly confirmed = signal(false);
  readonly serverError = signal('');

  private captchaToken: string | null = null;

  ngAfterViewInit(): void {
    const turnstile = (window as Record<string, unknown>)['turnstile'] as { render(id: string, opts: unknown): void } | undefined;
    if (turnstile) {
      turnstile.render('#signup-captcha', {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => { this.captchaToken = token; },
        'expired-callback': () => { this.captchaToken = null; },
      });
    }
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.serverError.set('');
    const { email, password } = this.form.getRawValue();
    const body: Record<string, unknown> = { email, password };
    if (this.captchaToken) body['captchaToken'] = this.captchaToken;
    this.http.post('/api/auth/signup', body).subscribe({
      next: () => {
        this.confirmed.set(true);
        this.submitting.set(false);
      },
      error: () => {
        this.submitting.set(false);
        this.serverError.set('Something went wrong. Please try again.');
      },
    });
  }
}
