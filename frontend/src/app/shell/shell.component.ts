import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map, shareReplay } from 'rxjs';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    AsyncPipe,
    RouterLink,
    RouterOutlet,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly breakpoints = inject(BreakpointObserver);

  readonly isHandset$ = this.breakpoints
    .observe(Breakpoints.Handset)
    .pipe(map(r => r.matches), shareReplay(1));
}
