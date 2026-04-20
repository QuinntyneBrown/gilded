import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-unlink-confirm-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  templateUrl: './unlink-confirm-dialog.component.html',
  styleUrl: './unlink-confirm-dialog.component.scss',
})
export class UnlinkConfirmDialogComponent {}
