import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { firstValueFrom } from 'rxjs';
import { RejectDialogComponent } from './dialogs/reject-dialog.component';

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
  selector: 'app-moderation-queue',
  standalone: true,
  imports: [MatButtonModule, MatTableModule],
  templateUrl: './moderation-queue.component.html',
  styleUrl: './moderation-queue.component.scss',
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
