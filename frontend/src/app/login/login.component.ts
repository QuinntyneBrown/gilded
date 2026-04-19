import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginPageComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  readonly submitting = signal(false);
  readonly errorMessage = signal('');

  submit(): void {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.errorMessage.set('');
    const { email, password } = this.form.getRawValue();
    this.http.post('/api/auth/login', { email, password }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/search']);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        if (err.status === 429) {
          const retryAfter = err.headers.get('Retry-After');
          const minutes = retryAfter ? Math.ceil(Number(retryAfter) / 60) : 15;
          this.errorMessage.set(`Too many attempts. Try again in ${minutes} minutes.`);
        } else {
          this.errorMessage.set('Invalid email or password.');
        }
      },
    });
  }
}
