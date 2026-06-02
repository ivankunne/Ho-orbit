// Thin wrapper around the Resend REST API.
//
// The domain h-orbit.nl is verified in Resend, so any @h-orbit.nl address can
// be used as a sender. Notification emails are sent from no-reply@h-orbit.nl
// with support@h-orbit.nl as the reply-to so users have somewhere to go.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';

export const FROM_NOREPLY = 'H-orbit <no-reply@h-orbit.nl>';
export const REPLY_TO_SUPPORT = 'support@h-orbit.nl';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  replyTo = REPLY_TO_SUPPORT,
}: SendEmailParams): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: 'RESEND_API_KEY is not configured' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_NOREPLY,
      to: [to],
      subject,
      html,
      reply_to: replyTo,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    return { ok: false, error: `Resend ${res.status}: ${detail}` };
  }
  return { ok: true };
}
