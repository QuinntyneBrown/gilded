// Acceptance Test
// Traces to: L2-024
// Description: Material 3 theme tokens are applied globally and a Material button renders.

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

@Component({
  standalone: true,
  imports: [MatButtonModule],
  template: '<button mat-raised-button color="primary">Test</button>',
})
class ButtonFixtureComponent {}

describe('Material 3 theme', () => {
  let fixture: ComponentFixture<ButtonFixtureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonFixtureComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();
    fixture = TestBed.createComponent(ButtonFixtureComponent);
    fixture.detectChanges();
  });

  it('should render a Material button with MDC classes', () => {
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.classList.contains('mdc-button') || btn.classList.contains('mat-mdc-button')).toBeTrue();
  });

  it('should define --mat-sys-primary system token on the document root', () => {
    const token = getComputedStyle(document.documentElement)
      .getPropertyValue('--mat-sys-primary');
    expect(token.trim()).not.toBe('');
  });
});
