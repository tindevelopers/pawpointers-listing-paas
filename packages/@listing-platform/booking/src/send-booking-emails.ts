/**
 * Booking email notifications via Resend (or configured email provider).
 * Import sendEmail from @tinadmin/core and call these helpers from app layer.
 */

import type { SendEmailParams } from "@tinadmin/core/email";

const EMAIL_FROM = process.env.EMAIL_FROM || process.env.RESEND_FROM || "noreply@example.com";
const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "PawPointers";

export interface BookingEmailContext {
  customerEmail: string;
  customerName?: string;
  listingTitle: string;
  startDate: string;
  startTime?: string;
  confirmationCode?: string;
  merchantEmail?: string;
}

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(t?: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h12}:${(m || 0).toString().padStart(2, "0")} ${suffix}`;
}

export function bookingConfirmationEmailParams(ctx: BookingEmailContext): SendEmailParams {
  const dateStr = formatDate(ctx.startDate);
  const timeStr = formatTime(ctx.startTime);
  return {
    to: ctx.customerEmail,
    from: EMAIL_FROM,
    subject: `Booking confirmed – ${ctx.listingTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ea580c;">Booking Confirmed</h2>
        <p>Hi${ctx.customerName ? ` ${ctx.customerName}` : ""},</p>
        <p>Your appointment at <strong>${ctx.listingTitle}</strong> has been confirmed.</p>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Date:</strong> ${dateStr}</li>
          ${timeStr ? `<li><strong>Time:</strong> ${timeStr}</li>` : ""}
          ${ctx.confirmationCode ? `<li><strong>Confirmation:</strong> ${ctx.confirmationCode}</li>` : ""}
        </ul>
        <p>Thank you for booking with ${PLATFORM_NAME}.</p>
      </div>
    `,
  };
}

export function bookingCancellationEmailParams(ctx: BookingEmailContext): SendEmailParams {
  const dateStr = formatDate(ctx.startDate);
  return {
    to: ctx.customerEmail,
    from: EMAIL_FROM,
    subject: `Booking cancelled – ${ctx.listingTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Booking Cancelled</h2>
        <p>Hi${ctx.customerName ? ` ${ctx.customerName}` : ""},</p>
        <p>Your appointment at <strong>${ctx.listingTitle}</strong> for ${dateStr} has been cancelled.</p>
        <p>If you did not request this cancellation, please contact the provider.</p>
        <p>Thank you,<br/>${PLATFORM_NAME}</p>
      </div>
    `,
  };
}

export function newBookingAlertEmailParams(ctx: BookingEmailContext): SendEmailParams {
  if (!ctx.merchantEmail) {
    throw new Error("Merchant email required for new booking alert");
  }
  const dateStr = formatDate(ctx.startDate);
  const timeStr = formatTime(ctx.startTime);
  return {
    to: ctx.merchantEmail,
    from: EMAIL_FROM,
    subject: `New booking – ${ctx.listingTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ea580c;">New Booking Request</h2>
        <p>You have a new booking for <strong>${ctx.listingTitle}</strong>.</p>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Customer:</strong> ${ctx.customerName || ctx.customerEmail}</li>
          <li><strong>Email:</strong> ${ctx.customerEmail}</li>
          <li><strong>Date:</strong> ${dateStr}</li>
          ${timeStr ? `<li><strong>Time:</strong> ${timeStr}</li>` : ""}
          ${ctx.confirmationCode ? `<li><strong>Ref:</strong> ${ctx.confirmationCode}</li>` : ""}
        </ul>
        <p>Log in to your dashboard to confirm or manage this booking.</p>
        <p>— ${PLATFORM_NAME}</p>
      </div>
    `,
  };
}
