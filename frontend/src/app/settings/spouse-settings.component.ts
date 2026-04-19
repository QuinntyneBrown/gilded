import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-unlink-confirm-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <mat-dialog-content>Are you sure you want to unlink from your spouse?</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true">Confirm</button>
    </mat-dialog-actions>
  `,
})
export class UnlinkConfirmDialogComponent {}

interface MeResponse {
  coupleId: string | null;
  spouseId: string | null;
  spouseEmail: string | null;
}

@Component({
  selector: 'app-spouse-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './spouse-settings.component.html',
  styleUrl: './spouse-settings.component.scss',
})
export class SpouseSettingsPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly state = signal<'loading' | 'unlinked' | 'pending_accept' | 'linked'>('loading');
  readonly spouseEmail = signal<string | null>(null);
  readonly inviting = signal(false);
  readonly accepting = signal(false);
  readonly inviteMessage = signal('');
  readonly errorMessage = signal('');

  readonly inviteForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  private get token(): string {
    return this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  ngOnInit(): void {
    this.http.get<MeResponse>('/api/auth/me').subscribe({
      next: (me) => {
        if (me.coupleId) {
          this.spouseEmail.set(me.spouseEmail);
          this.state.set('linked');
        } else if (this.token) {
          this.state.set('pending_accept');
        } else {
          this.state.set('unlinked');
        }
      },
      error: () => this.state.set('unlinked'),
    });
  }

  invite(): void {
    this.inviteForm.markAllAsTouched();
    if (this.inviteForm.invalid || this.inviting()) return;
    this.inviting.set(true);
    this.errorMessage.set('');
    const { email } = this.inviteForm.getRawValue();
    this.http.post('/api/couple/invite', { email }).subscribe({
      next: () => {
        this.inviting.set(false);
        this.inviteMessage.set('Invitation sent!');
      },
      error: (err: HttpErrorResponse) => {
        this.inviting.set(false);
        this.errorMessage.set(err.error?.error ?? 'Could not send invitation.');
      },
    });
  }

  accept(): void {
    if (this.accepting()) return;
    this.accepting.set(true);
    this.errorMessage.set('');
    this.http.post('/api/couple/accept', { token: this.token }).subscribe({
      next: () => {
        this.http.get<MeResponse>('/api/auth/me').subscribe({
          next: (me) => {
            this.accepting.set(false);
            this.spouseEmail.set(me.spouseEmail);
            this.state.set('linked');
            this.snackBar.open('Couple linked!', 'OK', { duration: 3000 });
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.accepting.set(false);
        this.errorMessage.set(err.error?.error ?? 'Could not accept invitation.');
      },
    });
  }

  unlink(): void {
    const ref = this.dialog.open(UnlinkConfirmDialogComponent);
    ref.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) return;
      this.http.post('/api/couple/unlink', {}).subscribe({
        next: () => {
          this.spouseEmail.set(null);
          this.state.set('unlinked');
          this.snackBar.open('Couple unlinked.', 'OK', { duration: 3000 });
        },
        error: () => this.errorMessage.set('Could not unlink.'),
      });
    });
  }
}
