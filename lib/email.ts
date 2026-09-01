const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

export const emailEnabled = smtpConfigured || !!process.env.RESEND_API_KEY;

const FROM = process.env.EMAIL_FROM
  ?? (process.env.SMTP_USER ? 'Project Connect <' + process.env.SMTP_USER + '>' : 'Project Connect <hello@projectconnect.app>');
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? process.env.SMTP_USER ?? undefined;

type SendResult = { ok: true; id?: string } | { ok: false; error: string };

/**
 * Send one email. Uses your own mailbox over SMTP when configured (so replies
 * land in that inbox), otherwise Resend. With neither, the message is not lost
 * — callers record it as 'queued' so an admin can resend later.
 */
export async function sendEmail(
  { to, subject, html, text }: { to: string; subject: string; html: string; text: string }
): Promise<SendResult> {
  if (smtpConfigured) return sendViaSmtp({ to, subject, html, text });
  if (process.env.RESEND_API_KEY) return sendViaResend({ to, subject, html, text });
  return { ok: false, error: 'Email is not configured (no SMTP_HOST or RESEND_API_KEY).' };
}

async function sendViaSmtp(
  { to, subject, html, text }: { to: string; subject: string; html: string; text: string }
): Promise<SendResult> {
  try {
    const nodemailer = (await import('nodemailer')).default;
    const port = Number(process.env.SMTP_PORT ?? 587);

    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // 465 is implicit TLS; 587 upgrades with STARTTLS
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
    });

    const info = await transport.sendMail({
      from: FROM,
      to,
      subject,
      text,
      html,
      ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
    });

    return { ok: true, id: info.messageId };
  } catch (err: any) {
    const raw = err?.message ?? 'SMTP error';
    // GoDaddy's usual refusals, in plain words
    if (/535|authenticate|credentials/i.test(raw)) {
      return { ok: false, error: 'SMTP login refused. Check SMTP_USER and SMTP_PASS — Microsoft 365 mailboxes need SMTP AUTH switched on.' };
    }
    if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i.test(raw)) {
      return { ok: false, error: 'Could not reach ' + process.env.SMTP_HOST + ':' + (process.env.SMTP_PORT ?? 587) + '. Check the host and port.' };
    }
    return { ok: false, error: raw };
  }
}

async function sendViaResend(
  { to, subject, html, text }: { to: string; subject: string; html: string; text: string }
): Promise<SendResult> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM, to: [to], subject, html, text,
        ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.message ?? 'Resend returned ' + res.status };
    return { ok: true, id: data?.id };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Network error' };
  }
}

/** The note a coffee shop receives. Plain, specific, and easy to reply to. */
export function venueNoticeTemplate({
  venueName, contactName, eventTitle, when, seats, hostName, hostEmail, eventUrl, address,
}: {
  venueName: string; contactName?: string | null; eventTitle: string; when: string;
  seats: number; hostName: string; hostEmail?: string | null; eventUrl: string; address: string;
}) {
  const greeting = contactName ? 'Hello ' + contactName : 'Hello ' + venueName;
  const subject = 'Project Connect meetup at ' + venueName + ' \u2014 ' + when;

  const text = [
    greeting + ',',
    '',
    'A member of Project Connect has scheduled a small professional meetup at ' + venueName + '.',
    '',
    'What: ' + eventTitle,
    'When: ' + when,
    'Group size: up to ' + seats + ' people',
    'Where: ' + address,
    'Organised by: ' + hostName + (hostEmail ? ' (' + hostEmail + ')' : ''),
    '',
    'Project Connect runs matched small-group meetups for project, product, delivery and',
    'technology professionals. Attendees buy their own drinks, and groups are capped so they',
    'fit around one table.',
    '',
    'This is a courtesy notice rather than a booking. If you would prefer we did not meet at',
    'your venue on this date, or you would like to reserve a table for us, just reply to this',
    'email and we will sort it out.',
    '',
    'Details: ' + eventUrl,
    '',
    'Thank you,',
    'Project Connect',
    'projectconnect.app',
  ].join('\n');

  const row = (label: string, value: string) =>
    '<tr><td style="padding:4px 16px 4px 0;color:#5a6478">' + label +
    '</td><td style="padding:4px 0">' + value + '</td></tr>';

  const html = '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;'
    + 'font-size:15px;line-height:1.6;color:#0d1330;max-width:560px">'
    + '<p style="margin:0 0 16px">' + greeting + ',</p>'
    + '<p style="margin:0 0 16px">A member of Project Connect has scheduled a small professional '
    + 'meetup at <strong>' + venueName + '</strong>.</p>'
    + '<table cellpadding="0" cellspacing="0" style="margin:0 0 16px;font-size:15px">'
    + row('What', '<strong>' + eventTitle + '</strong>')
    + row('When', when)
    + row('Group size', 'Up to ' + seats + ' people')
    + row('Where', address)
    + row('Organiser', hostName + (hostEmail ? ' &lt;' + hostEmail + '&gt;' : ''))
    + '</table>'
    + '<p style="margin:0 0 16px">Project Connect runs matched small-group meetups for project, '
    + 'product, delivery and technology professionals. Attendees buy their own drinks, and groups '
    + 'are capped so they fit around one table.</p>'
    + '<p style="margin:0 0 16px">This is a courtesy notice rather than a booking. If you would '
    + 'prefer we did not meet at your venue on this date, or you would like to reserve a table '
    + 'for us, just reply to this email and we will sort it out.</p>'
    + '<p style="margin:0 0 24px"><a href="' + eventUrl + '" style="color:#20358a">'
    + 'See the meetup details</a></p>'
    + '<p style="margin:0;color:#5a6478;font-size:13.5px">Project Connect · projectconnect.app</p>'
    + '</div>';

  return { subject, text, html };
}
