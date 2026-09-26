import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'SAMS <notifications@sams.example.com>';

// Mirrors instrument.ts's `enabled: !!process.env.SENTRY_DSN` pattern — without a real API key
// this logs instead of sending, so the escalation feature is fully testable/demoable before a
// Resend account is wired up, and goes live the moment RESEND_API_KEY is set.
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.resend = apiKey ? new Resend(apiKey) : null;
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`[email] RESEND_API_KEY not set — would send "${subject}" to ${to}`);
      return;
    }
    const { error } = await this.resend.emails.send({ from: FROM_ADDRESS, to, subject, html });
    if (error) throw new Error(`Failed to send email to ${to}: ${error.message}`);
  }
}
