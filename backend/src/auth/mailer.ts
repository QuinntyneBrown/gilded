import nodemailer from 'nodemailer';

export interface Mailer {
  sendVerification(email: string, token: string): Promise<void>;
  sendReset(email: string, token: string): Promise<void>;
}

export class NodemailerMailer implements Mailer {
  private readonly transport = nodemailer.createTransport({
    host: process.env['SMTP_HOST'],
    port: Number(process.env['SMTP_PORT'] ?? 587),
    auth: { user: process.env['SMTP_USER'], pass: process.env['SMTP_PASS'] },
  });

  async sendVerification(email: string, token: string): Promise<void> {
    const base = process.env['APP_URL'] ?? 'http://localhost:4200';
    const link = `${base}/verify?token=${token}`;
    await this.transport.sendMail({
      from: process.env['SMTP_FROM'] ?? 'noreply@gilded.app',
      to: email,
      subject: 'Verify your Gilded account',
      text: `Welcome to Gilded!\n\nVerify your account:\n${link}\n\nExpires in 24 hours.`,
    });
  }

  async sendReset(email: string, token: string): Promise<void> {
    const base = process.env['APP_URL'] ?? 'http://localhost:4200';
    const link = `${base}/reset-password?token=${token}`;
    await this.transport.sendMail({
      from: process.env['SMTP_FROM'] ?? 'noreply@gilded.app',
      to: email,
      subject: 'Reset your Gilded password',
      text: `Reset your Gilded password:\n${link}\n\nExpires in 1 hour.`,
    });
  }
}
