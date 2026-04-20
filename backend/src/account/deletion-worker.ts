import type { UserStore } from '../auth/user-store.ts';
import type { NoteStore } from '../notes/note.ts';
import type { ReviewStore } from '../counsellor/review-store.ts';
import type { CommentStore } from '../counsellor/comment-store.ts';
import type { CoupleStore } from '../couple/couple-store.ts';
import type { EventBus } from '../events.ts';
import { unlinkCouple } from '../couple/unlink.ts';

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export interface DeletionWorkerDeps {
  userStore: UserStore;
  noteStore: NoteStore;
  reviewStore: ReviewStore;
  commentStore: CommentStore;
  coupleStore: CoupleStore;
  eventBus: EventBus;
}

export async function runDeletionWorker(deps: DeletionWorkerDeps, now = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - RETENTION_MS);
  const users = await deps.userStore.findPendingDeletion(cutoff);

  for (const user of users) {
    const notes = await deps.noteStore.findByAuthor(user.id);
    for (const note of notes) {
      if (note.visibility === 'public') {
        await deps.noteStore.anonymize(note.id);
      } else {
        await deps.noteStore.hardDelete(note.id);
      }
    }

    for (const review of await deps.reviewStore.findByAuthor(user.id)) {
      await deps.reviewStore.anonymize(review.id);
    }

    for (const comment of await deps.commentStore.findByAuthor(user.id)) {
      await deps.commentStore.anonymize(comment.id);
    }

    if (user.coupleId) {
      await unlinkCouple(user.id, deps);
    }

    await deps.userStore.delete(user.id);
  }
}
