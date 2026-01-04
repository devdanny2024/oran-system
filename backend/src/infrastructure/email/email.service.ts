import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly transporter: nodemailer.Transporter | null;
  private readonly fromAddress: string;
  private readonly frontendBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    this.fromAddress =
      this.config.get<string>('SMTP_FROM') ?? 'ORAN <no-reply@oran.local>';

    this.frontendBaseUrl =
      this.config.get<string>('FRONTEND_BASE_URL') ??
      'https://oran-system.vercel.app';

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        'EmailService: SMTP not fully configured; emails will be logged instead of sent.',
      );
      this.transporter = null;
    }
  }

  getFrontendBaseUrl() {
    return this.frontendBaseUrl;
  }

  private async sendEmail(options: SendEmailOptions) {
    if (!this.transporter) {
      // eslint-disable-next-line no-console
      console.log('[EmailService] Mock email (no SMTP configured):', {
        from: this.fromAddress,
        ...options,
      });
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
    } catch (error) {
      // Do not crash user-facing flows if email delivery fails.
      // eslint-disable-next-line no-console
      console.error('[EmailService] Failed to send email', {
        error,
        to: options.to,
        subject: options.subject,
      });
    }
  }

  async sendVerificationEmail(params: {
    to: string;
    name?: string | null;
    token: string;
  }) {
    const verifyUrl = `${this.frontendBaseUrl}/verify-email?token=${encodeURIComponent(
      params.token,
    )}`;

    const html = this.buildVerificationTemplate({
      name: params.name,
      verifyUrl,
    });

    await this.sendEmail({
      to: params.to,
      subject: 'Verify your ORAN email address',
      html,
    });
  }

  async sendWelcomeEmail(params: { to: string; name?: string | null }) {
    const html = this.buildWelcomeTemplate({ name: params.name });

    await this.sendEmail({
      to: params.to,
      subject: 'Welcome to ORAN Smart Home',
      html,
    });
  }

  async sendPasswordResetEmail(params: {
    to: string;
    name?: string | null;
    token: string;
  }) {
    const resetUrl = `${this.frontendBaseUrl}/reset-password?token=${encodeURIComponent(
      params.token,
    )}`;

    const html = this.buildResetPasswordTemplate({
      name: params.name,
      resetUrl,
    });

    await this.sendEmail({
      to: params.to,
      subject: 'Reset your ORAN password',
      html,
    });
  }

  async sendTechnicianInviteEmail(params: {
    to: string;
    name?: string | null;
    token: string;
  }) {
    const resetUrl = `${this.frontendBaseUrl}/reset-password?token=${encodeURIComponent(
      params.token,
    )}`;

    const html = this.buildTechnicianInviteTemplate({
      name: params.name,
      resetUrl,
    });

    await this.sendEmail({
      to: params.to,
      subject: 'You have been invited as an ORAN technician',
      html,
    });
  }

  async sendOperationsScheduleEmail(params: {
    to: string;
    name?: string | null;
    projectName: string;
    siteAddress: string;
    scheduledFor: Date;
    operationsUrl: string;
  }) {
    const greetingName = params.name?.trim() || 'there';

    const when = params.scheduledFor.toLocaleString('en-NG', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const html = this.buildBaseTemplate({
      title: 'Your ORAN installation is now in operations',
      intro: `Hi ${greetingName}, your payment has been received and your project is moving into the operations phase.`,
      bodyLines: [
        `Project: <strong>${params.projectName}</strong>`,
        `Site address: ${params.siteAddress}`,
        `We have created a tentative site visit in your operations schedule so you have a clear idea of when our team will be on site.`,
        `Estimated next technician visit: <strong>${when}</strong>. Our team will review this within the next 24 hours and update you if the date or time needs to change.`,
        'You can always see the latest visit plan, trip history and work progress from your ORAN dashboard.',
      ],
      action: {
        label: 'View operations timeline',
        url: params.operationsUrl,
      },
      footer:
        'If you have any questions about your visit schedule, simply reply to this email or contact ORAN support.',
    });

    await this.sendEmail({
      to: params.to,
      subject: 'ORAN operations schedule created for your project',
      html,
    });
  }

  async sendReworkNotificationEmail(params: {
    to: string;
    name?: string | null;
    projectName: string;
    visitWhen: Date;
    reason?: string | null;
    operationsUrl: string;
  }) {
    const greetingName = params.name?.trim() || 'there';

    const when = params.visitWhen.toLocaleString('en-NG', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const bodyLines: string[] = [
      `Project: <strong>${params.projectName}</strong>`,
      `Visit time: <strong>${when}</strong>`,
    ];

    if (params.reason && params.reason.trim()) {
      bodyLines.push(`Why we are returning: ${params.reason.trim()}`);
    } else {
      bodyLines.push(
        'We have reopened this visit to make sure everything on site meets ORAN\'s standards and your expectations.',
      );
    }

    bodyLines.push(
      'You can track this updated visit and see technician updates from your ORAN dashboard.',
    );

    const html = this.buildBaseTemplate({
      title: 'We have reopened a visit for follow-up work',
      intro: `Hi ${greetingName}, we have reopened one of your ORAN site visits for additional work.`,
      bodyLines,
      action: {
        label: 'View project operations',
        url: params.operationsUrl,
      },
      footer:
        'If you have any questions about this rework, simply reply to this email or contact ORAN support.',
    });

    await this.sendEmail({
      to: params.to,
      subject: 'ORAN visit reopened for follow-up work',
      html,
    });
  }

  async sendQuoteCreatedEmail(params: {
    to: string;
    name?: string | null;
    projectName: string;
    quoteUrl: string;
  }) {
    const greetingName = params.name?.trim() || 'there';

    const html = this.buildBaseTemplate({
      title: 'Your ORAN inspection quote is ready',
      intro: `Hi ${greetingName}, your ORAN technician has prepared a quote based on the recent site inspection.`,
      bodyLines: [
        `Project: <strong>${params.projectName}</strong>`,
        'This quote reflects the devices and work discussed on site. You can review all items, adjust quantities if needed and then move forward to documents and payment.',
      ],
      action: {
        label: 'Review your inspection quote',
        url: params.quoteUrl,
      },
      footer:
        'If anything in the quote does not match what you discussed with the technician, simply reply to this email or contact ORAN support and we will help you adjust it.',
    });

    await this.sendEmail({
      to: params.to,
      subject: 'Your ORAN inspection quote is ready',
      html,
    });
  }

  private buildBaseTemplate(content: {
    title: string;
    intro: string;
    bodyLines: string[];
    action?: { label: string; url: string };
    footer?: string;
  }) {
    return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${content.title}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background-color:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
            <tr>
              <td style="padding:24px 24px 16px;background:linear-gradient(135deg,#0A3A40,#F5A623);color:#ffffff;">
                <h1 style="margin:0;font-size:24px;font-weight:700;">ORAN Smart Home</h1>
                <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">Smart automation, designed for African homes.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">${content.title}</h2>
                <p style="margin:0 0 16px;font-size:14px;color:#4b5563;line-height:1.6;">${content.intro}</p>
                ${content.bodyLines
                  .map(
                    (line) =>
                      `<p style="margin:0 0 12px;font-size:14px;color:#4b5563;line-height:1.6;">${line}</p>`,
                  )
                  .join('')}
                ${
                  content.action
                    ? `<div style="margin:24px 0;">
                  <a href="${content.action.url}" style="display:inline-block;padding:12px 24px;border-radius:999px;background-color:#F5A623;color:#111827;font-size:14px;font-weight:600;text-decoration:none;">
                    ${content.action.label}
                  </a>
                </div>
                <p style="margin:0 0 12px;font-size:12px;color:#6b7280;line-height:1.6;">
                  If the button above does not work, copy and paste this link into your browser:<br />
                  <span style="word-break:break-all;color:#0A3A40;">${content.action.url}</span>
                </p>`
                    : ''
                }
                <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">
                  ${content.footer ?? 'If you did not request this email, you can safely ignore it.'}
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">
            &copy; ${new Date().getFullYear()} ORAN Smart Home Automation. All rights reserved.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
  }

  private buildVerificationTemplate(params: {
    name?: string | null;
    verifyUrl: string;
  }) {
    const greetingName = params.name?.trim() || 'there';

    return this.buildBaseTemplate({
      title: 'Verify your ORAN email',
      intro: `Hi ${greetingName}, welcome to ORAN.`,
      bodyLines: [
        'Please confirm that this email address belongs to you so we can keep your ORAN account secure.',
        'Once your email is verified, you will be able to log in, start new projects and track the status of your smart home journey.',
      ],
      action: {
        label: 'Verify email address',
        url: params.verifyUrl,
      },
      footer:
        'This link will only be valid for a limited time. If you did not create an account with ORAN, you can safely ignore this email.',
    });
  }

  private buildWelcomeTemplate(params: { name?: string | null }) {
    const greetingName = params.name?.trim() || 'there';

    return this.buildBaseTemplate({
      title: 'Welcome to ORAN Smart Home',
      intro: `Hi ${greetingName}, we're excited to help you transform your space with ORAN.`,
      bodyLines: [
        'Your ORAN account has been created successfully. From here you can start a new project, request an inspection and explore smart home options tailored to your space and budget.',
        'We will keep you updated as we generate quotes, prepare documents and schedule installations so you always know what is happening next.',
      ],
      footer:
        'Thank you for choosing ORAN. If you have any questions, simply reply to this email or contact our support team.',
    });
  }

  private buildResetPasswordTemplate(params: {
    name?: string | null;
    resetUrl: string;
  }) {
    const greetingName = params.name?.trim() || 'there';

    return this.buildBaseTemplate({
      title: 'Reset your ORAN password',
      intro: `Hi ${greetingName}, we received a request to reset the password for your ORAN account.`,
      bodyLines: [
        'If you requested this, you can choose a new password by clicking the button below.',
        'For your security, this link is only valid for a short period. After it expires you can always start a new reset from the ORAN login page.',
      ],
      action: {
        label: 'Reset password',
        url: params.resetUrl,
      },
      footer:
        'If you did not request a password reset, please ignore this email and your password will remain unchanged.',
    });
  }

  private buildTechnicianInviteTemplate(params: {
    name?: string | null;
    resetUrl: string;
  }) {
    const greetingName = params.name?.trim() || 'there';

    return this.buildBaseTemplate({
      title: 'You have been invited as an ORAN technician',
      intro: `Hi ${greetingName}, you've been invited to join the ORAN team as a technician.`,
      bodyLines: [
        'We created a technician profile for you on the ORAN platform so you can receive site visits, record work progress and upload photos from the field.',
        'To get started, please choose a secure password for your account using the button below. You will then be able to sign in and access the technician workspace.',
      ],
      action: {
        label: 'Create your ORAN password',
        url: params.resetUrl,
      },
      footer:
        'If you were not expecting this invite, you can safely ignore this email and your account will not be activated.',
    });
  }
}
