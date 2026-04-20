import type { Page } from '@playwright/test';
import { NotesPage } from '../pages/notes.page';

export interface NoteSet {
  privateNote: string;
  spouseNote: string;
  publicNote: string;
}

export async function writeNotesAcrossVisibilities(page: Page): Promise<NoteSet> {
  const ts = Date.now();
  const privateNote = `Private thought ${ts}`;
  const spouseNote = `Shared reflection ${ts}`;
  const publicNote = `Public note ${ts}`;

  const notes = new NotesPage(page);
  await notes.goto();

  await notes.openTab('private');
  await notes.createNote(privateNote);

  await notes.openTab('spouse');
  await notes.createNote(spouseNote);

  await notes.openTab('public');
  await notes.createNote(publicNote);

  return { privateNote, spouseNote, publicNote };
}
