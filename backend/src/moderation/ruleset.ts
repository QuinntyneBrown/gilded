export const REASON_PROFANITY = 'content_profanity';
export const REASON_TOO_MANY_LINKS = 'content_too_many_links';
export const REASON_ALL_CAPS = 'content_all_caps';

type Verdict = 'allow' | 'flag' | 'reject';
interface EvalResult { verdict: Verdict; reason: string | null; }

const PROFANITY = [/\bdamn\b/i, /\bshit\b/i, /\bcrap\b/i, /\basshole\b/i, /\bbastard\b/i, /\bfuck\b/i];

export function evaluate(text: string): EvalResult {
  for (const re of PROFANITY) {
    if (re.test(text)) return { verdict: 'reject', reason: REASON_PROFANITY };
  }

  const linkCount = (text.match(/https?:\/\//gi) ?? []).length;
  if (linkCount >= 4) return { verdict: 'reject', reason: REASON_TOO_MANY_LINKS };

  const stripped = text.replace(/\s/g, '');
  if (stripped.length > 20 && stripped === stripped.toUpperCase() && /[A-Z]/.test(stripped)) {
    return { verdict: 'flag', reason: REASON_ALL_CAPS };
  }

  return { verdict: 'allow', reason: null };
}
