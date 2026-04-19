import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

interface PendingCounsellor {
  id: string;
  name: string;
  denomination: string;
  address: string;
  phone: string;
  email: string;
  credentials: string[];
  submittedBy: string | null;
}

@Component({
  selector: 'app-reject-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatInputModule, MatFormFieldModule, FormsModule],
  template: `
    <h2 mat-dialog-title>Reject Submission</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Reason</mat-label>
        <textarea matInput [(ngModel)]="reason" data-role="rejection-reason" rows="4"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="reason" data-action="confirm-reject">Reject</button>
    </mat-dialog-actions>
  `,
})
export class RejectDialogComponent {
  reason = '';
}

@Component({
  selector: 'app-moderation-queue',
  standalone: true,
  imports: [MatButtonModule, MatTableModule],
  template: `
    <div class="queue-wrapper">
      <h1>Pending Counsellor Submissions</h1>
      @if (pending().length === 0) {
        <p class="no-pending">No pending submissions.</p>
      } @else {
        <table mat-table [dataSource]="pending()">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let row" data-pending>{{ row.name }}</td>
          </ng-container>
          <ng-container matColumnDef="denomination">
            <th mat-header-cell *matHeaderCellDef>Denomination</th>
            <td mat-cell *matCellDef="let row">{{ row.denomination }}</td>
          </ng-container>
          <ng-container matColumnDef="address">
            <th mat-header-cell *matHeaderCellDef>Address</th>
            <td mat-cell *matCellDef="let row">{{ row.address }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let row">
              <button mat-raised-button color="primary" (click)="approve(row.id)" data-action="approve">Approve</button>
              <button mat-raised-button color="warn" (click)="reject(row.id)" data-action="reject" style="margin-left:8px">Reject</button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" [attr.data-pending]="true"></tr>
        </table>
      }
    </div>
  `,
  styles: [`.queue-wrapper { padding: 24px; }`],
})
export class ModerationQueueComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly dialog = inject(MatDialog);

  readonly pending = signal<PendingCounsellor[]>([]);
  readonly displayedColumns = ['name', 'denomination', 'address', 'actions'];

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.http.get<PendingCounsellor[]>('/api/admin/counsellors/pending').subscribe({
      next: (items) => this.pending.set(items),
      error: () => this.pending.set([]),
    });
  }

  approve(id: string): void {
    this.http.post(`/api/admin/counsellors/${id}/approve`, {}).subscribe({ next: () => this.load() });
  }

  reject(id: string): void {
    const ref = this.dialog.open(RejectDialogComponent);
    firstValueFrom(ref.afterClosed()).then((reason: string | undefined) => {
      if (!reason) return;
      this.http.post(`/api/admin/counsellors/${id}/reject`, { reason }).subscribe({ next: () => this.load() });
    });
  }
}
