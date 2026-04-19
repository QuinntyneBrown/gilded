import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

const PASSWORD_RE = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;

function passwordPolicy(control: AbstractControl): ValidationErrors | null {
  return PASSWORD_RE.test(control.value ?? '') ? null : { passwordPolicy: true };
}

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
export class SignupPageComponent {
  private readonly http = inject(HttpClient);

  readonly form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, passwordPolicy]),
  });

  readonly submitting = signal(false);
  readonly confirmed = signal(false);
  readonly serverError = signal('');

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.serverError.set('');
    const { email, password } = this.form.getRawValue();
    this.http.post('/api/auth/signup', { email, password }).subscribe({
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
