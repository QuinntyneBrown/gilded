// Acceptance Test
// Traces to: L2-024, L2-017
// Description: App shell renders toolbar and sidenav; sidenav collapses on handset, pins on desktop.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LayoutState, LayoutStateSnapshot } from '../layout/layout-state';
import { ShellComponent } from './shell.component';

function stubLayout(isHandset: boolean): Partial<LayoutState> {
  const snapshot: LayoutStateSnapshot = { viewport: isHandset ? 'xs' : 'xl', isHandset };
  return { state$: of(snapshot) };
}

describe('ShellComponent', () => {
  async function setup(handset: boolean): Promise<ComponentFixture<ShellComponent>> {
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: LayoutState, useValue: stubLayout(handset) },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('should render a MatToolbar', async () => {
    const f = await setup(false);
    expect(f.nativeElement.querySelector('mat-toolbar')).toBeTruthy();
  });

  it('should render a MatSidenav', async () => {
    const f = await setup(false);
    expect(f.nativeElement.querySelector('mat-sidenav')).toBeTruthy();
  });

  it('should show brand title in toolbar', async () => {
    const f = await setup(false);
    const toolbar = f.nativeElement.querySelector('mat-toolbar') as HTMLElement;
    expect(toolbar.textContent).toContain('Gilded');
  });

  it('mobile: shows hamburger button, sidenav closed', async () => {
    const f = await setup(true);
    const hamburger = f.nativeElement.querySelector(
      'button[aria-label="Toggle navigation"]',
    ) as HTMLElement;
    expect(hamburger).toBeTruthy();
    const sidenav = f.nativeElement.querySelector('mat-sidenav') as HTMLElement;
    expect(sidenav.classList.contains('mat-drawer-opened')).toBeFalse();
  });

  it('desktop: sidenav is pinned open, no hamburger', async () => {
    const f = await setup(false);
    const hamburger = f.nativeElement.querySelector('button[aria-label="Toggle navigation"]');
    expect(hamburger).toBeNull();
    const sidenav = f.nativeElement.querySelector('mat-sidenav') as HTMLElement;
    expect(sidenav.classList.contains('mat-drawer-opened')).toBeTrue();
  });
});
