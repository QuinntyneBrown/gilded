export interface CaptchaVerifier {
  verify(token: string): Promise<{ success: boolean }>;
}

export class TurnstileCaptchaVerifier implements CaptchaVerifier {
  constructor(private readonly secretKey: string) {}

  async verify(token: string): Promise<{ success: boolean }> {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: this.secretKey, response: token }),
    });
    const data = await res.json() as { success: boolean };
    return { success: data.success === true };
  }
}
