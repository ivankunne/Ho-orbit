// Branded HTML email templates for h-orbit notification emails.
// Visual language matches email-templates/confirm-signup.html (dark violet).

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface LayoutParams {
  preheader: string;
  heading: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
}

function layout({ preheader, heading, bodyHtml, ctaLabel, ctaUrl }: LayoutParams): string {
  const font = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif`;
  return `<!DOCTYPE html>
<html lang="nl" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(heading)}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .email-card     { padding: 32px 24px !important; }
      .hero-pad       { padding: 36px 24px 28px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0d0a1a;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0d0a1a;">
    <tr>
      <td align="center" style="padding:40px 16px 48px;">
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);box-shadow:0 24px 80px rgba(0,0,0,0.6);">
          <!-- Hero -->
          <tr>
            <td class="hero-pad" align="center"
                style="background: linear-gradient(135deg, #2d1f5e 0%, #1a1040 50%, #0f0c28 100%);padding:44px 40px 32px;">
              <div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#5b21b6);display:inline-block;box-shadow:0 0 0 1px rgba(124,58,237,0.4), 0 8px 32px rgba(124,58,237,0.35);line-height:60px;text-align:center;font-size:26px;">&#9702;</div>
              <h1 style="margin:18px 0 4px;font-family:${font};font-size:26px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">h<span style="color:#a78bfa;">-orbit</span></h1>
              <p style="margin:0;font-family:${font};font-size:12px;color:rgba(255,255,255,0.45);letter-spacing:0.08em;text-transform:uppercase;">Nederlandse muziekgemeenschap</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td class="email-card" align="left" style="background-color:#1a1528;padding:44px 48px;">
              <p style="margin:0 0 18px;font-family:${font};font-size:21px;font-weight:700;color:#ffffff;line-height:1.3;">${heading}</p>
              <div style="font-family:${font};font-size:15px;line-height:1.7;color:rgba(255,255,255,0.62);">${bodyHtml}</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:30px 0 8px;">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed 0%,#6d28d9 100%);color:#ffffff;font-family:${font};font-size:15px;font-weight:700;text-decoration:none;padding:15px 38px;border-radius:12px;box-shadow:0 4px 20px rgba(124,58,237,0.45);">${escapeHtml(ctaLabel)} &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="background-color:#120f22;padding:26px 40px;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0 0 10px;font-family:${font};font-size:12px;color:rgba(255,255,255,0.3);line-height:1.6;">
                Wil je deze meldingen niet meer ontvangen? Pas je voorkeuren aan onder
                <a href="https://h-orbit.nl/account" style="color:#a78bfa;text-decoration:none;">Account &rarr; Meldingen</a>.
              </p>
              <p style="margin:0;font-family:${font};font-size:12px;color:rgba(255,255,255,0.2);line-height:1.6;">
                &copy; 2025 h-orbit &mdash; Nederlandse muziekgemeenschap<br />
                Vragen? Mail <a href="mailto:support@h-orbit.nl" style="color:rgba(255,255,255,0.35);text-decoration:none;">support@h-orbit.nl</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://h-orbit.nl';

export function newMessageEmail(opts: {
  recipientName: string;
  senderName: string;
  preview: string;
  conversationId: string;
}): { subject: string; html: string } {
  const preview = opts.preview.length > 140 ? `${opts.preview.slice(0, 140)}…` : opts.preview;
  return {
    subject: `Nieuw bericht van ${opts.senderName}`,
    html: layout({
      preheader: `${opts.senderName} stuurde je een bericht op h-orbit`,
      heading: `Je hebt een nieuw bericht &#128172;`,
      bodyHtml: `
        <p style="margin:0 0 16px;">Hoi ${escapeHtml(opts.recipientName)},</p>
        <p style="margin:0 0 16px;"><strong style="color:#ffffff;">${escapeHtml(opts.senderName)}</strong> heeft je een bericht gestuurd op h-orbit:</p>
        <div style="background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.2);border-radius:10px;padding:14px 18px;color:rgba(255,255,255,0.8);font-style:italic;">&ldquo;${escapeHtml(preview)}&rdquo;</div>`,
      ctaLabel: 'Bericht lezen',
      ctaUrl: `${SITE_URL}/berichten/${opts.conversationId}`,
    }),
  };
}

export function newFollowerEmail(opts: {
  recipientName: string;
  followerName: string;
  followerUsername: string;
}): { subject: string; html: string } {
  return {
    subject: `${opts.followerName} volgt je nu op h-orbit`,
    html: layout({
      preheader: `${opts.followerName} is je gaan volgen op h-orbit`,
      heading: `Je hebt een nieuwe volger &#127881;`,
      bodyHtml: `
        <p style="margin:0 0 16px;">Hoi ${escapeHtml(opts.recipientName)},</p>
        <p style="margin:0 0 16px;"><strong style="color:#ffffff;">${escapeHtml(opts.followerName)}</strong> is je gaan volgen op h-orbit. Bekijk hun profiel en volg ze terug!</p>`,
      ctaLabel: 'Profiel bekijken',
      ctaUrl: `${SITE_URL}/profiel/${encodeURIComponent(opts.followerUsername)}`,
    }),
  };
}
