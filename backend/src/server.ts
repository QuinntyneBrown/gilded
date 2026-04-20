import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createSignupHandler } from './auth/signup.ts';
import { createVerifyHandler, createResendHandler } from './auth/verify.ts';
import { createLoginHandler, createMeHandler } from './auth/login.ts';
import { createLogoutHandler } from './auth/logout.ts';
import { createResetRequestHandler, createResetCompleteHandler } from './auth/reset.ts';
import { createInviteHandler, createAcceptHandler } from './couple/invite.ts';
import { createUnlinkHandler } from './couple/unlink.ts';
import { createGetCounsellorHandler } from './counsellor/counsellor.ts';
import { createSubmitCounsellorHandler } from './counsellor/submit.ts';
import { createListPendingHandler, createApproveHandler, createRejectHandler } from './counsellor/moderate.ts';
import { createRateCounsellorHandler } from './counsellor/rating.ts';
import { createPostReviewHandler, createGetReviewsHandler, createDeleteReviewHandler } from './counsellor/review.ts';
import { createPostCommentHandler, createGetCommentsHandler, createDeleteCommentHandler } from './counsellor/comment.ts';
import { createAddToShortlistHandler, createRemoveFromShortlistHandler, createGetShortlistHandler } from './shortlist/shortlist.ts';
import { InMemoryShortlistStore } from './shortlist/shortlist-store.ts';
import { createChosenCounsellorHandler, createGetNotificationsHandler } from './couple/chosen.ts';
import { InMemoryNotificationStore } from './auth/notification-store.ts';
import { createCreateIntentHandler, createGetCurrentIntentHandler, createUpdateIntentStatusHandler } from './appointment/appointment.ts';
import { InMemoryAppointmentStore } from './appointment/appointment-store.ts';
import { createCreatePrivateNoteHandler, createListPrivateNotesHandler, createUpdatePrivateNoteHandler, createDeletePrivateNoteHandler } from './notes/private-notes.ts';
import { createCreateSpouseNoteHandler, createListSpouseNotesHandler, createUpdateSpouseNoteHandler, createDeleteSpouseNoteHandler } from './notes/spouse-notes.ts';
import { createCreatePublicNoteHandler, createGetPublicFeedHandler, createGetNoteByIdHandler, createUpdatePublicNoteHandler, createDeletePublicNoteHandler } from './notes/public-notes.ts';
import { InMemoryNoteStore } from './notes/note.ts';
import { InMemoryRatingStore } from './counsellor/rating-store.ts';
import { InMemoryReviewStore } from './counsellor/review-store.ts';
import { InMemoryCommentStore } from './counsellor/comment-store.ts';
import { createUploadPhotoHandler, createServePhotoHandler } from './counsellor/photo.ts';
import { createSearchCounsellorsHandler } from './counsellor/search.ts';
import { GeocodingService } from './geo/geocoding.ts';
import { InMemoryPostalCodeCache } from './geo/postal-cache.ts';
import { InMemoryUserStore } from './auth/user-store.ts';
import { InMemorySessionStore } from './auth/session-store.ts';
import { InMemoryCoupleStore } from './couple/couple-store.ts';
import { InMemoryCounsellorStore } from './counsellor/counsellor-store.ts';
import { EventBus } from './events.ts';
import { SlidingWindowLimiter, ipKey } from './auth/global-rate-limiter.ts';
import { TurnstileCaptchaVerifier } from './auth/captcha.ts';
import type { CaptchaVerifier } from './auth/captcha.ts';
import { NodemailerMailer } from './auth/mailer.ts';
import type { Mailer } from './auth/mailer.ts';
import { createRequestMiddleware, ConsoleLogger } from './logger.ts';
import { recordRequest, createMetricsHandler } from './metrics.ts';
import { createDeleteAccountHandler } from './account/delete.ts';

const CAPTURE = process.env['CAPTURE_EMAILS'] === '1';
const captureLog: { email: string; token: string }[] = [];

function buildMailer(): Mailer {
  const base = new NodemailerMailer();
  if (!CAPTURE) return base;
  return {
    sendVerification: async (email, token) => { captureLog.push({ email, token }); },
    sendReset: async (email, token) => { captureLog.push({ email, token }); },
    sendInvite: async (email, token) => { captureLog.push({ email, token }); },
    sendRejection: async (email, _name, reason) => { captureLog.push({ email, token: reason }); },
    sendChosenNotification: async (email, name) => { captureLog.push({ email, token: name }); },
    sendDeletionConfirmation: async (email) => { captureLog.push({ email, token: 'deletion' }); },
  };
}

const userStore = new InMemoryUserStore();
const sessionStore = new InMemorySessionStore();
const coupleStore = new InMemoryCoupleStore();
const counsellorStore = new InMemoryCounsellorStore();
const ratingStore = new InMemoryRatingStore();
const reviewStore = new InMemoryReviewStore();
const commentStore = new InMemoryCommentStore();
const shortlistStore = new InMemoryShortlistStore();
const notificationStore = new InMemoryNotificationStore();
const appointmentStore = new InMemoryAppointmentStore();
const noteStore = new InMemoryNoteStore();
const postalCache = new InMemoryPostalCodeCache();
const geocodingService = new GeocodingService(postalCache, {
  geocode: async () => { throw new Error('GEOCODING_API_KEY not configured'); },
});
const eventBus = new EventBus();
const authDeps = { userStore, mailer: buildMailer() };
const sessionDeps = { userStore, sessionStore };

const globalRateLimiter = new SlidingWindowLimiter(10, 60_000);
const captchaVerifier: CaptchaVerifier | undefined =
  process.env['CAPTCHA_DISABLED'] === '1' ? undefined :
  process.env['TURNSTILE_SECRET_KEY'] ? new TurnstileCaptchaVerifier(process.env['TURNSTILE_SECRET_KEY']) :
  undefined;
const userCreationLimiter = new SlidingWindowLimiter(20, 3_600_000);
const signupHandler = createSignupHandler({ ...authDeps, captchaVerifier });
const verifyHandler = createVerifyHandler(authDeps);
const resendHandler = createResendHandler(authDeps);
const loginHandler = createLoginHandler(sessionDeps);
const meHandler = createMeHandler(sessionDeps);
const logoutHandler = createLogoutHandler({ sessionStore });
const resetRequestHandler = createResetRequestHandler({ userStore, mailer: authDeps.mailer });
const resetCompleteHandler = createResetCompleteHandler({ userStore, sessionStore });
const inviteHandler = createInviteHandler({ userStore, coupleStore, mailer: authDeps.mailer, sessionStore });
const acceptHandler = createAcceptHandler({ userStore, coupleStore, mailer: authDeps.mailer, sessionStore, eventBus });
const unlinkHandler = createUnlinkHandler({ userStore, coupleStore, sessionStore, eventBus });
const deleteAccountHandler = createDeleteAccountHandler({ userStore, sessionStore, mailer: authDeps.mailer });
const getCounsellorHandler = createGetCounsellorHandler({ counsellorStore });
const submitCounsellorHandler = createSubmitCounsellorHandler({ counsellorStore, sessionStore });
const listPendingHandler = createListPendingHandler({ counsellorStore, sessionStore, userStore, mailer: authDeps.mailer });
const approveHandler = createApproveHandler({ counsellorStore, sessionStore, userStore, mailer: authDeps.mailer });
const rejectHandler = createRejectHandler({ counsellorStore, sessionStore, userStore, mailer: authDeps.mailer });
const rateCounsellorHandler = createRateCounsellorHandler({ counsellorStore, ratingStore, sessionStore });
const postReviewHandler = createPostReviewHandler({ counsellorStore, reviewStore, sessionStore, userStore, limiter: userCreationLimiter, captchaVerifier });
const getReviewsHandler = createGetReviewsHandler({ counsellorStore, reviewStore, sessionStore, userStore });
const deleteReviewHandler = createDeleteReviewHandler({ counsellorStore, reviewStore, sessionStore, userStore });
const postCommentHandler = createPostCommentHandler({ commentStore, reviewStore, sessionStore, userStore, limiter: userCreationLimiter });
const getCommentsHandler = createGetCommentsHandler({ commentStore, reviewStore, sessionStore, userStore });
const deleteCommentHandler = createDeleteCommentHandler({ commentStore, reviewStore, sessionStore, userStore });
const uploadPhotoHandler = createUploadPhotoHandler({ counsellorStore });
const servePhotoHandler = createServePhotoHandler({ counsellorStore });
const searchCounsellorsHandler = createSearchCounsellorsHandler({ counsellorStore, geocodingService });
const createPrivateNoteHandler = createCreatePrivateNoteHandler({ noteStore, sessionStore });
const listPrivateNotesHandler = createListPrivateNotesHandler({ noteStore, sessionStore });
const updatePrivateNoteHandler = createUpdatePrivateNoteHandler({ noteStore, sessionStore });
const deletePrivateNoteHandler = createDeletePrivateNoteHandler({ noteStore, sessionStore });
const getNoteByIdHandler = createGetNoteByIdHandler({ noteStore, sessionStore, userStore });
const createPublicNoteHandler = createCreatePublicNoteHandler({ noteStore, sessionStore, userStore, limiter: userCreationLimiter });
const getPublicFeedHandler = createGetPublicFeedHandler({ noteStore, sessionStore, userStore });
const updatePublicNoteHandler = createUpdatePublicNoteHandler({ noteStore, sessionStore, userStore });
const deletePublicNoteHandler = createDeletePublicNoteHandler({ noteStore, sessionStore });
const createSpouseNoteHandler = createCreateSpouseNoteHandler({ noteStore, sessionStore, userStore });
const listSpouseNotesHandler = createListSpouseNotesHandler({ noteStore, sessionStore, userStore });
const updateSpouseNoteHandler = createUpdateSpouseNoteHandler({ noteStore, sessionStore });
const deleteSpouseNoteHandler = createDeleteSpouseNoteHandler({ noteStore, sessionStore });
const createIntentHandler = createCreateIntentHandler({ appointmentStore, sessionStore, userStore });
const getCurrentIntentHandler = createGetCurrentIntentHandler({ appointmentStore, sessionStore, userStore });
const updateIntentStatusHandler = createUpdateIntentStatusHandler({ appointmentStore, sessionStore });
const chosenCounsellorHandler = createChosenCounsellorHandler({ coupleStore, counsellorStore, notificationStore, sessionStore, userStore, mailer: authDeps.mailer });
const getNotificationsHandler = createGetNotificationsHandler({ notificationStore, sessionStore });
const addToShortlistHandler = createAddToShortlistHandler({ shortlistStore, sessionStore, userStore });
const removeFromShortlistHandler = createRemoveFromShortlistHandler({ shortlistStore, sessionStore, userStore });
const getShortlistHandler = createGetShortlistHandler({ shortlistStore, sessionStore, userStore });
eventBus.on('CoupleCreated', (event) => {
  if (event.type !== 'CoupleCreated') return;
  Promise.all([
    shortlistStore.mergeOwner(event.userIds[0], event.coupleId),
    shortlistStore.mergeOwner(event.userIds[1], event.coupleId),
  ]).catch(console.error);
});

const consoleLogger = new ConsoleLogger();
const requestLogger = createRequestMiddleware({
  logger: {
    logRequest(entry) {
      consoleLogger.logRequest(entry);
      recordRequest(entry.method, entry.route, entry.status, entry.latencyMs / 1000);
    },
  },
});

const metricsToken = process.env['METRICS_TOKEN'];
const metricsHandler = createMetricsHandler(metricsToken);

function rejectRateLimit(req: IncomingMessage, res: ServerResponse): boolean {
  const { limited, retryAfterSecs } = globalRateLimiter.checkAndRecord(ipKey(req));
  if (limited) {
    res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': String(retryAfterSecs) });
    res.end(JSON.stringify({ error: 'Too many requests. Try again later.' }));
    return true;
  }
  return false;
}

export function handler(req: IncomingMessage, res: ServerResponse): void {
  requestLogger(req, res, routeRequest).catch(err => {
    console.error(err);
    if (!res.headersSent) { res.writeHead(500); res.end(); }
  });
}

async function routeRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '', 'http://x');
  const path = url.pathname;

  if (req.method === 'GET' && path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  if (req.method === 'GET' && path === '/metrics') {
    await metricsHandler(req, res);
    return;
  }
  if (req.method === 'POST' && path === '/api/auth/signup') {
    if (rejectRateLimit(req, res)) return;
    await signupHandler(req, res);
    return;
  }
  if (req.method === 'GET' && path === '/api/auth/verify') {
    await verifyHandler(req, res);
    return;
  }
  if (req.method === 'POST' && path === '/api/auth/resend-verification') {
    await resendHandler(req, res);
    return;
  }
  if (req.method === 'POST' && path === '/api/auth/login') {
    if (rejectRateLimit(req, res)) return;
    await loginHandler(req, res);
    return;
  }
  if (req.method === 'GET' && path === '/api/auth/me') {
    await meHandler(req, res);
    return;
  }
  if (req.method === 'POST' && path === '/api/auth/logout') {
    await logoutHandler(req, res);
    return;
  }
  if (req.method === 'POST' && path === '/api/auth/reset-request') {
    if (rejectRateLimit(req, res)) return;
    await resetRequestHandler(req, res);
    return;
  }
  if (req.method === 'POST' && path === '/api/auth/reset-complete') {
    await resetCompleteHandler(req, res);
    return;
  }
  if (req.method === 'POST' && path === '/api/couple/invite') {
    if (rejectRateLimit(req, res)) return;
    await inviteHandler(req, res);
    return;
  }
  if (req.method === 'POST' && path === '/api/couple/accept') {
    await acceptHandler(req, res);
    return;
  }
  if (req.method === 'POST' && path === '/api/couple/unlink') {
    await unlinkHandler(req, res);
    return;
  }
  if (req.method === 'POST' && path === '/api/couple/chosen') {
    await chosenCounsellorHandler(req, res);
    return;
  }
  if (req.method === 'POST' && path === '/api/me/delete') {
    await deleteAccountHandler(req, res);
    return;
  }
  if (req.method === 'GET' && path === '/api/me/notifications') {
    await getNotificationsHandler(req, res);
    return;
  }
  if (req.method === 'POST' && path === '/api/appointment-intent') {
    await createIntentHandler(req, res);
    return;
  }
  if (req.method === 'GET' && path === '/api/me/appointment-intent/current') {
    await getCurrentIntentHandler(req, res);
    return;
  }
  if (req.method === 'POST' && path.startsWith('/api/appointment-intent/') && path.endsWith('/booked')) {
    const id = path.slice('/api/appointment-intent/'.length, -'/booked'.length);
    await updateIntentStatusHandler(req, res, id, 'booked');
    return;
  }
  if (req.method === 'POST' && path.startsWith('/api/appointment-intent/') && path.endsWith('/cancelled')) {
    const id = path.slice('/api/appointment-intent/'.length, -'/cancelled'.length);
    await updateIntentStatusHandler(req, res, id, 'cancelled');
    return;
  }
  if (req.method === 'GET' && path === '/api/notes/public') {
    await getPublicFeedHandler(req, res);
    return;
  }
  if (req.method === 'POST' && path === '/api/notes') {
    const vis = url.searchParams.get('visibility');
    if (vis === 'public') {
      await createPublicNoteHandler(req, res);
    } else if (vis === 'spouse') {
      await createSpouseNoteHandler(req, res);
    } else {
      await createPrivateNoteHandler(req, res);
    }
    return;
  }
  if (req.method === 'GET' && path === '/api/notes') {
    if (url.searchParams.get('visibility') === 'spouse') {
      await listSpouseNotesHandler(req, res);
    } else {
      await listPrivateNotesHandler(req, res);
    }
    return;
  }
  if (req.method === 'GET' && path.startsWith('/api/notes/')) {
    const id = path.slice('/api/notes/'.length);
    await getNoteByIdHandler(req, res, id);
    return;
  }
  if (req.method === 'PUT' && path.startsWith('/api/notes/')) {
    const id = path.slice('/api/notes/'.length);
    await (async () => {
      const note = await noteStore.findById(id);
      if (note?.visibility === 'public') return updatePublicNoteHandler(req, res, id);
      if (note?.visibility === 'spouse') return updateSpouseNoteHandler(req, res, id);
      return updatePrivateNoteHandler(req, res, id);
    })();
    return;
  }
  if (req.method === 'DELETE' && path.startsWith('/api/notes/')) {
    const id = path.slice('/api/notes/'.length);
    await (async () => {
      const note = await noteStore.findById(id);
      if (note?.visibility === 'public') return deletePublicNoteHandler(req, res, id);
      if (note?.visibility === 'spouse') return deleteSpouseNoteHandler(req, res, id);
      return deletePrivateNoteHandler(req, res, id);
    })();
    return;
  }
  if (req.method === 'POST' && path.startsWith('/api/shortlist/')) {
    const id = path.slice('/api/shortlist/'.length);
    await addToShortlistHandler(req, res, id);
    return;
  }
  if (req.method === 'DELETE' && path.startsWith('/api/shortlist/')) {
    const id = path.slice('/api/shortlist/'.length);
    await removeFromShortlistHandler(req, res, id);
    return;
  }
  if (req.method === 'GET' && path === '/api/shortlist') {
    await getShortlistHandler(req, res);
    return;
  }
  if (req.method === 'GET' && path === '/api/admin/counsellors/pending') {
    await listPendingHandler(req, res);
    return;
  }
  if (req.method === 'POST' && path.startsWith('/api/admin/counsellors/') && path.endsWith('/approve')) {
    const id = path.slice('/api/admin/counsellors/'.length, -'/approve'.length);
    await approveHandler(req, res, id);
    return;
  }
  if (req.method === 'POST' && path.startsWith('/api/admin/counsellors/') && path.endsWith('/reject')) {
    const id = path.slice('/api/admin/counsellors/'.length, -'/reject'.length);
    await rejectHandler(req, res, id);
    return;
  }
  if (req.method === 'PUT' && path.startsWith('/api/counsellors/') && path.endsWith('/rating')) {
    const id = path.slice('/api/counsellors/'.length, -'/rating'.length);
    await rateCounsellorHandler(req, res, id);
    return;
  }
  if (req.method === 'POST' && path.startsWith('/api/counsellors/') && path.endsWith('/photo')) {
    const id = path.slice('/api/counsellors/'.length, -'/photo'.length);
    await uploadPhotoHandler(req, res, id);
    return;
  }
  if (req.method === 'GET' && path.startsWith('/api/counsellors/') && path.endsWith('/photo')) {
    const id = path.slice('/api/counsellors/'.length, -'/photo'.length);
    await servePhotoHandler(req, res, id);
    return;
  }
  if (req.method === 'POST' && path === '/api/counsellors') {
    await submitCounsellorHandler(req, res);
    return;
  }
  if (req.method === 'GET' && path === '/api/counsellors') {
    await searchCounsellorsHandler(req, res);
    return;
  }
  if (req.method === 'POST' && path.startsWith('/api/counsellors/') && path.endsWith('/reviews')) {
    const id = path.slice('/api/counsellors/'.length, -'/reviews'.length);
    await postReviewHandler(req, res, id);
    return;
  }
  if (req.method === 'GET' && path.startsWith('/api/counsellors/') && path.endsWith('/reviews')) {
    const id = path.slice('/api/counsellors/'.length, -'/reviews'.length);
    await getReviewsHandler(req, res, id);
    return;
  }
  if (req.method === 'DELETE' && path.startsWith('/api/reviews/') && !path.includes('/comments')) {
    const id = path.slice('/api/reviews/'.length);
    await deleteReviewHandler(req, res, id);
    return;
  }
  if (req.method === 'POST' && path.startsWith('/api/reviews/') && path.endsWith('/comments')) {
    const id = path.slice('/api/reviews/'.length, -'/comments'.length);
    await postCommentHandler(req, res, id);
    return;
  }
  if (req.method === 'GET' && path.startsWith('/api/reviews/') && path.endsWith('/comments')) {
    const id = path.slice('/api/reviews/'.length, -'/comments'.length);
    await getCommentsHandler(req, res, id);
    return;
  }
  if (req.method === 'DELETE' && path.startsWith('/api/comments/')) {
    const id = path.slice('/api/comments/'.length);
    await deleteCommentHandler(req, res, id);
    return;
  }
  if (req.method === 'GET' && path.startsWith('/api/counsellors/')) {
    const id = path.slice('/api/counsellors/'.length);
    await getCounsellorHandler(req, res, id);
    return;
  }
  if (CAPTURE && req.method === 'POST' && path === '/api/dev/seed/postal') {
    await (async () => {
      let data = '';
      await new Promise<void>((resolve, reject) => {
        req.on('data', (c) => (data += c));
        req.on('end', () => resolve());
        req.on('error', reject);
      });
      const body = JSON.parse(data) as { code: string; lat: number; lng: number };
      await postalCache.save(body.code.toUpperCase().replace(/\s/g, ''), body.lat, body.lng);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    })();
    return;
  }
  if (CAPTURE && req.method === 'POST' && path === '/api/dev/seed/counsellor') {
    await (async () => {
      let data = '';
      await new Promise<void>((resolve, reject) => {
        req.on('data', (c) => (data += c));
        req.on('end', () => resolve());
        req.on('error', reject);
      });
      const body = JSON.parse(data) as Record<string, unknown>;
      const incomingSourceUrl = body['sourceUrl'] as string | undefined;
      if (incomingSourceUrl) {
        const existing = await counsellorStore.findBySourceUrl(incomingSourceUrl);
        if (existing) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ id: existing.id }));
          return;
        }
      }
      const { randomUUID } = await import('node:crypto');
      const counsellor = {
        id: randomUUID(),
        name: String(body['name'] ?? ''),
        normalizedName: String(body['name'] ?? '').toLowerCase().trim(),
        denomination: String(body['denomination'] ?? ''),
        credentials: (body['credentials'] as string[]) ?? [],
        specialties: (body['specialties'] as string[]) ?? [],
        address: String(body['address'] ?? ''),
        normalizedAddress: String(body['address'] ?? '').toLowerCase().trim(),
        phone: String(body['phone'] ?? ''),
        email: String(body['email'] ?? ''),
        website: body['website'] as string | undefined,
        bookingLink: body['bookingLink'] as string | undefined,
        source: (body['source'] as 'web_research' | 'user_submitted') ?? 'web_research',
        verified: Boolean(body['verified'] ?? false),
        submittedBy: body['submittedBy'] as string | undefined,
        sourceUrl: incomingSourceUrl,
        photoUrl: body['photoUrl'] as string | undefined,
        rating: body['rating'] as number | undefined,
        reviewCount: Number(body['reviewCount'] ?? 0),
      };
      await counsellorStore.create(counsellor);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: counsellor.id }));
    })();
    return;
  }
  if (CAPTURE && req.method === 'GET' && path === '/api/dev/user') {
    const email = url.searchParams.get('email') ?? '';
    const user = await userStore.findByEmail(email);
    if (!user) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'not found' })); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ userId: user.id, email: user.email, state: user.state, spouseId: user.spouseId, coupleId: user.coupleId }));
    return;
  }
  if (CAPTURE && req.method === 'GET' && path === '/api/dev/last-token') {
    const email = url.searchParams.get('email') ?? '';
    const last = [...captureLog].reverse().find(e => e.email === email);
    res.writeHead(last ? 200 : 404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(last ?? { error: 'not found' }));
    return;
  }
  if (CAPTURE && req.method === 'GET' && path === '/api/dev/events') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ events: eventBus.all() }));
    return;
  }
  if (CAPTURE && req.method === 'GET' && path === '/api/dev/session') {
    const sid = url.searchParams.get('sid') ?? '';
    const session = await sessionStore.findById(sid);
    res.writeHead(session ? 200 : 404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(session ?? { error: 'not found' }));
    return;
  }
  if (CAPTURE && req.method === 'POST' && path === '/api/dev/grant-role') {
    await (async () => {
      let data = '';
      await new Promise<void>((resolve, reject) => {
        req.on('data', (c) => (data += c));
        req.on('end', () => resolve());
        req.on('error', reject);
      });
      const { email, role } = JSON.parse(data) as { email: string; role: string };
      const user = await userStore.findByEmail(email);
      if (!user) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'not found' })); return; }
      await userStore.setRole(user.id, role as 'user' | 'moderator' | 'admin');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    })();
    return;
  }
  res.writeHead(404);
  res.end();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer(handler).listen(3000);
}
