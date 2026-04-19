import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-reset-request',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './reset-request.component.html',
  styleUrl: './reset-request.component.scss',
})
export class ResetRequestPageComponent {
  private readonly http = inject(HttpClient);

  readonly form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  readonly submitting = signal(false);
  readonly confirmed = signal(false);

  submit(): void {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    const { email } = this.form.getRawValue();
    this.http.post('/api/auth/reset-request', { email }).subscribe({
      next: () => { this.confirmed.set(true); this.submitting.set(false); },
      error: () => { this.confirmed.set(true); this.submitting.set(false); },
    });
  }
}
