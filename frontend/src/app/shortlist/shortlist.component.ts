import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { CounsellorAvatarComponent } from '../counsellors/counsellor-avatar.component';

interface ShortlistEntry {
  counsellorId: string;
  addedAt: string;
}

interface CounsellorSummary {
  id: string;
  name: string;
  denomination: string;
  specialties: string[];
  credentials: string[];
  address: string;
  rating: number | null;
  reviewCount: number;
  verified: boolean;
  photoUrl: string | null;
  chosen?: boolean;
}

@Component({
  selector: 'app-shortlist',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    CounsellorAvatarComponent,
  ],
  templateUrl: './shortlist.component.html',
  styleUrl: './shortlist.component.scss',
})
export class ShortlistPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly breakpoints = inject(BreakpointObserver);

  readonly loading = signal(true);
  readonly counsellors = signal<CounsellorSummary[]>([]);

  readonly isDesktop = toSignal(
    this.breakpoints.observe([Breakpoints.Large, Breakpoints.XLarge, Breakpoints.Medium]).pipe(
      map(r => r.matches)
    ),
    { initialValue: false }
  );

  readonly displayedColumns = ['avatar', 'name', 'denomination', 'specialties', 'rating', 'actions'];

  ngOnInit(): void {
    this.http.get<ShortlistEntry[]>('/api/shortlist').subscribe({
      next: (entries) => {
        if (entries.length === 0) { this.loading.set(false); return; }
        let remaining = entries.length;
        const results: CounsellorSummary[] = new Array(entries.length);
        entries.forEach((entry, idx) => {
          this.http.get<CounsellorSummary>(`/api/counsellors/${entry.counsellorId}`).subscribe({
            next: (c) => {
              results[idx] = c;
              if (--remaining === 0) { this.counsellors.set(results.filter(Boolean)); this.loading.set(false); }
            },
            error: () => { if (--remaining === 0) { this.counsellors.set(results.filter(Boolean)); this.loading.set(false); } },
          });
        });
      },
      error: () => this.loading.set(false),
    });
  }

  choose(id: string): void {
    this.counsellors.update(cs => cs.map(c => ({ ...c, chosen: c.id === id ? !c.chosen : c.chosen })));
  }

  remove(id: string): void {
    this.http.delete(`/api/shortlist/${id}`).subscribe({
      next: () => this.counsellors.update(cs => cs.filter(c => c.id !== id)),
      error: () => {},
    });
  }
}
