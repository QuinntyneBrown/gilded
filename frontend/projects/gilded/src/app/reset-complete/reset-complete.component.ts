import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { passwordPolicy } from '../auth/validators';

@Component({
  selector: 'app-reset-complete',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './reset-complete.component.html',
  styleUrl: './reset-complete.component.scss',
})
export class ResetCompletePageComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  private get token(): string {
    return this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  readonly form = new FormGroup({
    newPassword: new FormControl('', [Validators.required, passwordPolicy]),
  });

  readonly submitting = signal(false);
  readonly errorMessage = signal('');

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.errorMessage.set('');
    const { newPassword } = this.form.getRawValue();
    this.http.post('/api/auth/reset-complete', { token: this.token, newPassword }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.snackBar.open('Password updated. You can now sign in.', 'OK', { duration: 5000 });
        this.router.navigate(['/login']);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        const msg = err.error?.error ?? 'Invalid or expired token.';
        this.errorMessage.set(msg);
      },
    });
  }
}
