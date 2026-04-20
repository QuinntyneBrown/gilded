import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

interface CounsellorSearchItem {
  id: string;
  name: string;
  denomination: string;
  specialties: string[];
  address: string;
  distanceKm: number;
  rating: number | null;
  reviewCount: number;
  photoUrl: string | null;
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
})
export class SearchPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = new FormGroup({
    postal: new FormControl('', [Validators.required]),
    radiusKm: new FormControl(25),
  });

  readonly results = signal<CounsellorSearchItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly submitted = signal(false);
  readonly shortlistedIds = signal<Record<string, boolean>>({});

  readonly PAGE_SIZE = 20;
  readonly radiusOptions = [10, 25, 50, 100];

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const postal = params.get('postal');
      const radiusKm = Number(params.get('radiusKm') ?? 25);
      const page = Math.max(1, Number(params.get('page') ?? 1));
      if (postal) {
        this.form.patchValue({ postal, radiusKm });
        this.page.set(page);
        this.fetchResults(postal, radiusKm, page);
      }
    });
  }

  search(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { postal, radiusKm } = this.form.getRawValue();
    this.router.navigate(['/search'], { queryParams: { postal, radiusKm, page: 1 } });
  }

  onPageChange(event: PageEvent): void {
    const { postal, radiusKm } = this.form.getRawValue();
    this.router.navigate(['/search'], { queryParams: { postal, radiusKm, page: event.pageIndex + 1 } });
  }

  formatDistance(km: number): string {
    return km.toFixed(1) + ' km';
  }

  openProfileAt(index: number): void {
    const counsellor = this.results()[index];
    if (counsellor) this.router.navigate(['/counsellors', counsellor.id]);
  }

  shortlistAt(index: number): void {
    const counsellor = this.results()[index];
    if (!counsellor) return;
    this.http.post(`/api/shortlist/${counsellor.id}`, {}).subscribe({
      next: () => {
        this.shortlistedIds.update(ids => ({ ...ids, [counsellor.id]: true }));
      },
      error: () => void 0,
    });
  }

  private fetchResults(postal: string, radiusKm: number, page: number): void {
    this.loading.set(true);
    this.form.controls.postal.setErrors(null);
    this.http.get<{ items: CounsellorSearchItem[]; total: number }>(
      `/api/counsellors?postal=${encodeURIComponent(postal)}&radiusKm=${radiusKm}&page=${page}`,
    ).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.submitted.set(true);
        this.results.set(res.items);
        this.total.set(res.total);
        this.page.set(page);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.submitted.set(true);
        this.results.set([]);
        this.total.set(0);
        if (err.status === 400) {
          this.form.controls.postal.markAsTouched();
          this.form.controls.postal.setErrors({ serverError: err.error?.error ?? 'Invalid postal code.' });
        }
      },
    });
  }
}
