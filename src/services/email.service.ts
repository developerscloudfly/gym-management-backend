import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { IPayment } from '../modules/payment/payment.model';

// ─── Transporter ──────────────────────────────────────────────────────────────

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (transporter) return transporter;

  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    throw new Error('SMTP credentials not configured');
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : 587,
    secure: env.SMTP_PORT === '465',
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  return transporter;
};

// ─── Base Send ────────────────────────────────────────────────────────────────

const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  const t = getTransporter();
  await t.sendMail({
    from: `"GymApp" <${env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
};

// ─── Email Templates ──────────────────────────────────────────────────────────

const welcomeHtml = (name: string): string => `
  <h2>Welcome to GymApp, ${name}!</h2>
  <p>Your account has been created successfully. You can now log in and start your fitness journey.</p>
  <p>If you have any questions, feel free to reach out to your gym admin.</p>
`;

const passwordResetHtml = (name: string, resetUrl: string): string => `
  <h2>Password Reset Request</h2>
  <p>Hi ${name},</p>
  <p>Click the button below to reset your password. This link expires in 1 hour.</p>
  <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a>
  <p>If you did not request this, please ignore this email.</p>
`;

const paymentReceiptHtml = (payment: IPayment): string => `
  <h2>Payment Receipt</h2>
  <p>Thank you for your payment!</p>
  <table style="border-collapse:collapse;width:100%;max-width:500px;">
    <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Invoice #</td><td style="padding:8px;border:1px solid #ddd;">${payment.invoiceNumber}</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Amount</td><td style="padding:8px;border:1px solid #ddd;">${payment.currency} ${payment.amount}</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Method</td><td style="padding:8px;border:1px solid #ddd;">${payment.method}</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Date</td><td style="padding:8px;border:1px solid #ddd;">${payment.paidAt?.toLocaleDateString() ?? new Date().toLocaleDateString()}</td></tr>
    <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Status</td><td style="padding:8px;border:1px solid #ddd;color:green;">Completed</td></tr>
  </table>
`;

const subscriptionReminderHtml = (name: string, expiryDate: string): string => `
  <h2>Subscription Expiry Reminder</h2>
  <p>Hi ${name},</p>
  <p>Your gym subscription is expiring on <strong>${expiryDate}</strong>.</p>
  <p>Please renew it to continue enjoying uninterrupted access.</p>
`;

// ─── Public Helpers ───────────────────────────────────────────────────────────

export const sendWelcomeEmail = async (to: string, name: string): Promise<void> => {
  await sendEmail(to, 'Welcome to GymApp!', welcomeHtml(name));
};

export const sendPasswordResetEmail = async (
  to: string,
  name: string,
  resetToken: string
): Promise<void> => {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;
  await sendEmail(to, 'Reset Your Password', passwordResetHtml(name, resetUrl));
};

export const sendPaymentReceiptEmail = async (payment: IPayment): Promise<void> => {
  const populated = await payment.populate('memberId', 'name email');
  const member = populated.memberId as unknown as { name: string; email: string };
  if (!member?.email) return;
  await sendEmail(member.email, `Payment Receipt — ${payment.invoiceNumber}`, paymentReceiptHtml(payment));
};

export const sendSubscriptionReminderEmail = async (
  to: string,
  name: string,
  expiryDate: Date
): Promise<void> => {
  const formatted = expiryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  await sendEmail(to, 'Subscription Expiring Soon', subscriptionReminderHtml(name, formatted));
};
