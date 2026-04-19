import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';

function postalCodeValidator(control: AbstractControl): ValidationErrors | null {
  const v = String(control.value ?? '').trim().toUpperCase().replace(/\s/g, '');
  if (!v) return null;
  const ca = /^[A-CEGHJ-NPRSTVXY]\d[A-CEGHJ-NPRSTV-Z]\d[A-CEGHJ-NPRSTV-Z]\d$/.test(v);
  const us = /^\d{5}$/.test(v);
  return ca || us ? null : { postalCode: true };
}

@Component({
  selector: 'app-duplicate-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, RouterModule],
  template: `
    <h2 mat-dialog-title>Duplicate Counsellor</h2>
    <mat-dialog-content>
      <p>A matching counsellor already exists.</p>
      <a [routerLink]="['/counsellors', existingId]" mat-button color="primary" mat-dialog-close data-role="existing-profile-link">View Existing Profile</a>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Dismiss</button>
    </mat-dialog-actions>
  `,
})
export class DuplicateDialogComponent {
  existingId = '';
}

@Component({
  selector: 'app-add-counsellor',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  templateUrl: './add-counsellor.component.html',
})
export class AddCounsellorPageComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly submitted = signal(false);

  readonly form = this.fb.group({
    name: ['', Validators.required],
    denomination: ['', Validators.required],
    credentials: [''],
    specialties: [''],
    phone: [''],
    email: ['', Validators.email],
    address: ['', Validators.required],
    postalCode: ['', postalCodeValidator],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.value;
    const body = {
      name: v.name,
      denomination: v.denomination,
      credentials: v.credentials ? v.credentials.split(',').map(s => s.trim()).filter(Boolean) : [],
      specialties: v.specialties ? v.specialties.split(',').map(s => s.trim()).filter(Boolean) : [],
      phone: v.phone ?? '',
      email: v.email ?? '',
      address: v.address,
    };

    try {
      await firstValueFrom(this.http.post<{ id: string }>('/api/counsellors', body));
      this.snackBar.open('Submission received — pending review.', 'OK', { duration: 5000 });
      this.submitted.set(true);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 409) {
        const existingId = ((err as { error?: { existingId?: string } }).error?.existingId) ?? '';
        const ref = this.dialog.open(DuplicateDialogComponent);
        ref.componentInstance.existingId = existingId;
      } else {
        this.snackBar.open('Submission failed. Please try again.', 'Dismiss', { duration: 5000 });
      }
    }
  }
}
