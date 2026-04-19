import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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
  ],
  templateUrl: './counsellor-profile.component.html',
  styleUrl: './counsellor-profile.component.scss',
})
export class CounsellorProfilePageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  readonly counsellor = signal<CounsellorProfile | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.http.get<CounsellorProfile>(`/api/counsellors/${id}`).subscribe({
      next: (c) => { this.counsellor.set(c); this.loading.set(false); },
      error: () => { this.notFound.set(true); this.loading.set(false); },
    });
  }

  shortlist(): void {
    // T-035
  }
}
