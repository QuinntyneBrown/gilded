import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatExpansionModule } from '@angular/material/expansion';
import { CounsellorAvatarComponent } from './counsellor-avatar.component';

interface CounsellorProfile {
  id: string;
  name: string;
  denomination: string;
  credentials: string[];
  specialties: string[];
  address: string;
  phone: string;
  email: string;
  website: string | null;
  bookingLink: string | null;
  source: string;
  verified: boolean;
  photoUrl: string | null;
  rating: number | null;
  reviewCount: number;
}

interface Review {
  id: string;
  counsellorId: string;
  authorId: string | null;
  body: string;
  createdAt: string;
}

interface Comment {
  id: string;
  reviewId: string;
  authorId: string | null;
  body: string;
  createdAt: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <mat-dialog-content>Are you sure you want to delete this?</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true">Confirm</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {}

@Component({
  selector: 'app-counsellor-profile',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatDialogModule,
    MatPaginatorModule,
    MatExpansionModule,
    CounsellorAvatarComponent,
    DatePipe,
  ],
  templateUrl: './counsellor-profile.component.html',
  styleUrl: './counsellor-profile.component.scss',
})
export class CounsellorProfilePageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);

  readonly counsellor = signal<CounsellorProfile | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly reviews = signal<Review[]>([]);
  readonly comments = signal<Record<string, Comment[]>>({});
  readonly reviewBody = signal('');
  readonly commentBodies = signal<Record<string, string>>({});
  readonly pageIndex = signal(0);
  readonly pageSize = 10;
  readonly stars = [1, 2, 3, 4, 5] as const;
  readonly ratingPick = signal(0);
  readonly ratingHover = signal(0);
  readonly userId = signal<string | null>(null);

  readonly pagedReviews = computed(() => {
    const start = this.pageIndex() * this.pageSize;
    return this.reviews().slice(start, start + this.pageSize);
  });

  readonly reviewCharCount = computed(() => this.reviewBody().length);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.http.get<CounsellorProfile>(`/api/counsellors/${id}`).subscribe({
      next: (c) => { this.counsellor.set(c); this.loading.set(false); },
      error: () => { this.notFound.set(true); this.loading.set(false); },
    });
    this.loadReviews(id);
    this.http.get<{ userId: string; email: string }>('/api/auth/me').subscribe({
      next: (me) => this.userId.set(me.userId),
      error: () => {},
    });
  }

  private loadReviews(id: string): void {
    this.http.get<Review[]>(`/api/counsellors/${id}/reviews`).subscribe({
      next: (r) => this.reviews.set(r),
      error: () => {},
    });
  }

  submitRating(stars: number): void {
    const id = this.counsellor()?.id;
    if (!id) return;
    this.ratingPick.set(stars);
    this.http.put<{ ok: boolean; rating: number; reviewCount: number }>(`/api/counsellors/${id}/rating`, { stars }).subscribe({
      next: (result) => {
        this.counsellor.update(c => c ? { ...c, rating: result.rating, reviewCount: result.reviewCount } : c);
      },
      error: () => {},
    });
  }

  submitReview(): void {
    const id = this.counsellor()?.id;
    const body = this.reviewBody().trim();
    if (!id || !body) return;
    this.http.post<Review>(`/api/counsellors/${id}/reviews`, { body }).subscribe({
      next: (review) => {
        this.reviews.update(r => [review, ...r]);
        this.reviewBody.set('');
        this.counsellor.update(c => c ? { ...c, reviewCount: c.reviewCount + 1 } : c);
      },
      error: () => {},
    });
  }

  deleteReview(reviewId: string): void {
    const ref = this.dialog.open(ConfirmDialogComponent);
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.http.delete<{ ok: boolean }>(`/api/reviews/${reviewId}`).subscribe({
        next: () => {
          this.reviews.update(rs => rs.map(r =>
            r.id === reviewId ? { ...r, authorId: null, body: '[removed by author]' } : r
          ));
        },
        error: () => {},
      });
    });
  }

  loadComments(reviewId: string): void {
    if (this.comments()[reviewId]) return;
    this.http.get<Comment[]>(`/api/reviews/${reviewId}/comments`).subscribe({
      next: (cs) => this.comments.update(m => ({ ...m, [reviewId]: cs })),
      error: () => {},
    });
  }

  commentsFor(reviewId: string): Comment[] {
    return this.comments()[reviewId] ?? [];
  }

  onCommentInput(reviewId: string, event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.commentBodies.update(m => ({ ...m, [reviewId]: val }));
  }

  submitComment(reviewId: string): void {
    const body = (this.commentBodies()[reviewId] ?? '').trim();
    if (!body) return;
    this.http.post<Comment>(`/api/reviews/${reviewId}/comments`, { body }).subscribe({
      next: (comment) => {
        this.comments.update(m => ({ ...m, [reviewId]: [...(m[reviewId] ?? []), comment] }));
        this.commentBodies.update(m => ({ ...m, [reviewId]: '' }));
      },
      error: () => {},
    });
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
  }

  readonly bookingExpanded = signal(false);
  readonly intentCreated = signal(false);

  makeAppointment(): void {
    const id = this.counsellor()?.id;
    if (!id) return;
    this.bookingExpanded.set(true);
    this.http.post('/api/appointment-intent', { counsellorId: id }).subscribe({
      next: () => this.intentCreated.set(true),
      error: () => this.intentCreated.set(true),
    });
  }

  shortlist(): void {
    // T-035
  }
}
