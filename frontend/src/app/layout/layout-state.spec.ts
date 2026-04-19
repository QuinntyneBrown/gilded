// Acceptance Test
// Traces to: L2-017, L2-024
// Description: LayoutState maps CDK breakpoints to viewport + isHandset snapshot.

import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { BreakpointObserver, Breakpoints, BreakpointState } from '@angular/cdk/layout';
import { of } from 'rxjs';
import { LayoutState, LayoutStateSnapshot } from './layout-state';

function mockBreakpoints(active: string[]): Partial<BreakpointObserver> {
  const bp: Record<string, boolean> = {};
  [Breakpoints.XSmall, Breakpoints.Small, Breakpoints.Medium,
   Breakpoints.Large, Breakpoints.XLarge,
   Breakpoints.HandsetPortrait, Breakpoints.HandsetLandscape].forEach(b => {
    bp[b] = active.includes(b);
  });
  return { observe: () => of({ matches: active.length > 0, breakpoints: bp } as BreakpointState) };
}

function setup(active: string[]): LayoutState {
  TestBed.configureTestingModule({
    providers: [
      LayoutState,
      { provide: BreakpointObserver, useValue: mockBreakpoints(active) },
    ],
  });
  return TestBed.inject(LayoutState);
}

describe('LayoutState', () => {
  let result: LayoutStateSnapshot;

  it('emits xs + isHandset=true for XSmall + HandsetPortrait', fakeAsync(() => {
    setup([Breakpoints.XSmall, Breakpoints.HandsetPortrait]).state$.subscribe(s => (result = s));
    tick();
    expect(result.viewport).toBe('xs');
    expect(result.isHandset).toBeTrue();
  }));

  it('emits s for Small', fakeAsync(() => {
    setup([Breakpoints.Small]).state$.subscribe(s => (result = s));
    tick();
    expect(result.viewport).toBe('s');
    expect(result.isHandset).toBeFalse();
  }));

  it('emits m for Medium', fakeAsync(() => {
    setup([Breakpoints.Medium]).state$.subscribe(s => (result = s));
    tick();
    expect(result.viewport).toBe('m');
    expect(result.isHandset).toBeFalse();
  }));

  it('emits l for Large', fakeAsync(() => {
    setup([Breakpoints.Large]).state$.subscribe(s => (result = s));
    tick();
    expect(result.viewport).toBe('l');
    expect(result.isHandset).toBeFalse();
  }));

  it('emits xl for XLarge', fakeAsync(() => {
    setup([Breakpoints.XLarge]).state$.subscribe(s => (result = s));
    tick();
    expect(result.viewport).toBe('xl');
    expect(result.isHandset).toBeFalse();
  }));
});
