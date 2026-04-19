import { AsyncPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map } from 'rxjs';
import { LayoutState } from '../layout/layout-state';

interface AppointmentIntent {
  id: string;
  counsellorId: string;
  status: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    AsyncPipe,
    RouterLink,
    RouterOutlet,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit {
  private readonly layout = inject(LayoutState);
  private readonly http = inject(HttpClient);
  readonly isHandset$ = this.layout.state$.pipe(map(s => s.isHandset));
  readonly pendingIntent = signal<AppointmentIntent | null>(null);

  ngOnInit(): void {
    this.http.get<AppointmentIntent | null>('/api/me/appointment-intent/current').subscribe({
      next: (intent) => this.pendingIntent.set(intent),
      error: () => {},
    });
  }

  dismissIntent(status: 'booked' | 'cancelled'): void {
    const id = this.pendingIntent()?.id;
    if (!id) return;
    this.http.post(`/api/appointment-intent/${id}/${status}`, {}).subscribe({
      next: () => this.pendingIntent.set(null),
      error: () => {},
    });
  }
}
