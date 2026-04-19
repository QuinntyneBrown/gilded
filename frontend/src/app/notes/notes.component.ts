import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface NoteBase { id: string; body: string; visibility: string; createdAt: string; updatedAt: string; }
interface PrivateNote extends NoteBase { visibility: 'private'; }
interface SpouseNote extends NoteBase { visibility: 'spouse'; }
interface PublicNote extends NoteBase { visibility: 'public'; authorId: string; authorDisplay: string; }
interface CurrentUser { userId: string; coupleId: string | null; }

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [MatTabsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './notes.component.html',
  styleUrl: './notes.component.scss',
})
export class NotesPageComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly user = signal<CurrentUser | null>(null);
  readonly privateNotes = signal<PrivateNote[]>([]);
  readonly spouseNotes = signal<SpouseNote[]>([]);
  readonly publicNotes = signal<PublicNote[]>([]);

  readonly privateBody = signal('');
  readonly spouseBody = signal('');
  readonly publicBody = signal('');
  readonly editingId = signal<string | null>(null);
  readonly editBody = signal('');

  ngOnInit(): void {
    this.http.get<CurrentUser>('/api/auth/me').subscribe({ next: u => this.user.set(u) });
    this.loadPrivate();
    this.loadPublic();
  }

  private loadPrivate(): void {
    this.http.get<PrivateNote[]>('/api/notes').subscribe({ next: ns => this.privateNotes.set(ns) });
  }

  loadSpouse(): void {
    this.http.get<SpouseNote[]>('/api/notes?visibility=spouse').subscribe({ next: ns => this.spouseNotes.set(ns) });
  }

  private loadPublic(): void {
    this.http.get<PublicNote[]>('/api/notes/public').subscribe({ next: ns => this.publicNotes.set(ns) });
  }

  onTabChange(index: number): void {
    this.editingId.set(null);
    if (index === 1 && this.user()?.coupleId) this.loadSpouse();
    if (index === 2) this.loadPublic();
  }

  createPrivate(): void {
    const body = this.privateBody().trim();
    if (!body) return;
    this.http.post<PrivateNote>('/api/notes', { body }).subscribe({
      next: n => { this.privateNotes.update(ns => [n, ...ns]); this.privateBody.set(''); },
    });
  }

  createSpouse(): void {
    const body = this.spouseBody().trim();
    if (!body) return;
    this.http.post<SpouseNote>('/api/notes?visibility=spouse', { body }).subscribe({
      next: n => { this.spouseNotes.update(ns => [n, ...ns]); this.spouseBody.set(''); },
    });
  }

  createPublic(): void {
    const body = this.publicBody().trim();
    if (!body) return;
    this.http.post<PublicNote>('/api/notes?visibility=public', { body }).subscribe({
      next: n => { this.publicNotes.update(ns => [n, ...ns]); this.publicBody.set(''); },
    });
  }

  startEdit(note: NoteBase): void {
    this.editingId.set(note.id);
    this.editBody.set(note.body);
  }

  cancelEdit(): void { this.editingId.set(null); this.editBody.set(''); }

  saveEdit(note: NoteBase): void {
    const body = this.editBody().trim();
    if (!body) return;
    this.http.put<NoteBase>(`/api/notes/${note.id}`, { body }).subscribe({
      next: updated => {
        this.editingId.set(null);
        if (note.visibility === 'private') {
          this.privateNotes.update(ns => ns.map(n => n.id === updated.id ? (updated as PrivateNote) : n));
        } else {
          this.spouseNotes.update(ns => ns.map(n => n.id === updated.id ? (updated as SpouseNote) : n));
        }
      },
    });
  }

  deletePrivate(id: string): void {
    this.http.delete(`/api/notes/${id}`).subscribe({ next: () => this.privateNotes.update(ns => ns.filter(n => n.id !== id)) });
  }

  deleteSpouse(id: string): void {
    this.http.delete(`/api/notes/${id}`).subscribe({ next: () => this.spouseNotes.update(ns => ns.filter(n => n.id !== id)) });
  }

  deletePublic(id: string): void {
    this.http.delete(`/api/notes/${id}`).subscribe({ next: () => this.publicNotes.update(ns => ns.filter(n => n.id !== id)) });
  }

  isOwn(note: PublicNote): boolean {
    return note.authorId === this.user()?.userId;
  }
}
