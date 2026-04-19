import { inject, Injectable } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map, shareReplay } from 'rxjs';

export type Viewport = 'xs' | 's' | 'm' | 'l' | 'xl';

export interface LayoutStateSnapshot {
  viewport: Viewport;
  isHandset: boolean;
}

@Injectable({ providedIn: 'root' })
export class LayoutState {
  private readonly breakpoints = inject(BreakpointObserver);

  readonly state$ = this.breakpoints
    .observe([
      Breakpoints.XSmall,
      Breakpoints.Small,
      Breakpoints.Medium,
      Breakpoints.Large,
      Breakpoints.XLarge,
      Breakpoints.HandsetPortrait,
      Breakpoints.HandsetLandscape,
    ])
    .pipe(
      map(({ breakpoints: bp }) => {
        let viewport: Viewport = 'xs';
        if (bp[Breakpoints.XLarge]) viewport = 'xl';
        else if (bp[Breakpoints.Large]) viewport = 'l';
        else if (bp[Breakpoints.Medium]) viewport = 'm';
        else if (bp[Breakpoints.Small]) viewport = 's';
        const isHandset = !!(bp[Breakpoints.HandsetPortrait] || bp[Breakpoints.HandsetLandscape]);
        return { viewport, isHandset };
      }),
      shareReplay(1),
    );
}
