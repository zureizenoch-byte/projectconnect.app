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

/** The note a coffee shop receives, from the approved template. */
export function venueNoticeTemplate({
  venueName, contactName, when, date, time, seats, hostName,
  chapterLeadName, city, supportEmail, websiteUrl, eventUrl, address,
}: {
  venueName: string; contactName?: string | null; when: string;
  date: string; time: string; seats: string; hostName: string;
  chapterLeadName: string; city: string; supportEmail: string; websiteUrl: string;
  eventUrl: string; address: string;
}) {
  const subject = 'Project Connect is hosting a meetup at ' + venueName
    + ' on ' + date + ' \u2615';

  const greeting = contactName ? 'Hi ' + contactName : 'Hi ' + venueName + ' team';

  const text = [
    greeting + ',',
    '',
    'My name is ' + chapterLeadName + ', and I\u2019m reaching out on behalf of Project Connect, '
      + 'a community that brings together professionals in Project Management, Product, Agile, QA, '
      + 'Data, Cyber, Cloud, and Delivery through small, in-person meetups in ' + city + '.',
    '',
    'We wanted to let you know that one of our members has just scheduled a meetup at '
      + venueName + ':',
    '',
    '  Date: ' + date,
    '  Time: ' + time,
    '  Expected group size: ' + seats + ' people',
    '  Organizer: ' + hostName,
    '',
    'We love partnering with local coffee shops like yours to host these gatherings \u2014 it\u2019s '
      + 'a great way to bring new regulars through your door while giving our members a welcoming '
      + 'spot to connect. If you\u2019re part of our Venue Branding program, this visit also counts '
      + 'toward your co-branding perks; if you\u2019d like to learn more about that program, just '
      + 'reply to this email and we\u2019ll send details.',
    '',
    'If this date or time doesn\u2019t work for you, or you have any questions, please let us know '
      + 'as soon as possible by replying to this email or reaching us at ' + supportEmail
      + ', and we\u2019ll sort it out.',
    '',
    'Thanks so much for being a part of the Project Connect community \u2014 we\u2019re looking '
      + 'forward to seeing everyone there!',
    '',
    'Warmly,',
    chapterLeadName,
    'Project Connect \u2014 ' + city + ' Chapter',
    supportEmail + ' | ' + websiteUrl,
    '',
    'Meetup details: ' + eventUrl,
  ].join('\n');

  const li = (label: string, value: string) =>
    '<li style="margin:0 0 6px"><strong>' + label + ':</strong> ' + value + '</li>';

  const html = '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;'
    + 'font-size:15px;line-height:1.65;color:#0d1330;max-width:560px">'
    + '<p style="margin:0 0 16px">' + greeting + ',</p>'
    + '<p style="margin:0 0 16px">My name is ' + chapterLeadName + ', and I\u2019m reaching out on '
    + 'behalf of <strong>Project Connect</strong>, a community that brings together professionals in '
    + 'Project Management, Product, Agile, QA, Data, Cyber, Cloud, and Delivery through small, '
    + 'in-person meetups in ' + city + '.</p>'
    + '<p style="margin:0 0 12px">We wanted to let you know that one of our members has just '
    + 'scheduled a meetup at <strong>' + venueName + '</strong>:</p>'
    + '<ul style="margin:0 0 16px;padding-left:20px">'
    + li('Date', date)
    + li('Time', time)
    + li('Expected group size', seats + ' people')
    + li('Organizer', hostName)
    + '</ul>'
    + '<p style="margin:0 0 16px">We love partnering with local coffee shops like yours to host '
    + 'these gatherings \u2014 it\u2019s a great way to bring new regulars through your door while '
    + 'giving our members a welcoming spot to connect. If you\u2019re part of our Venue Branding '
    + 'program, this visit also counts toward your co-branding perks; if you\u2019d like to learn '
    + 'more about that program, just reply to this email and we\u2019ll send details.</p>'
    + '<p style="margin:0 0 16px">If this date or time doesn\u2019t work for you, or you have any '
    + 'questions, please let us know as soon as possible by replying to this email or reaching us at '
    + '<a href="mailto:' + supportEmail + '" style="color:#20358a">' + supportEmail + '</a>, '
    + 'and we\u2019ll sort it out.</p>'
    + '<p style="margin:0 0 20px">Thanks so much for being a part of the Project Connect community '
    + '\u2014 we\u2019re looking forward to seeing everyone there!</p>'
    + '<p style="margin:0 0 4px">Warmly,<br />' + chapterLeadName + '</p>'
    + '<p style="margin:0;color:#5a6478;font-size:13.5px">Project Connect \u2014 ' + city
    + ' Chapter<br /><a href="mailto:' + supportEmail + '" style="color:#20358a">' + supportEmail
    + '</a> | <a href="' + websiteUrl + '" style="color:#20358a">' + websiteUrl + '</a></p>'
    + '<p style="margin:20px 0 0;font-size:13.5px"><a href="' + eventUrl + '" style="color:#20358a">'
    + 'See the meetup details</a></p>'
    + '</div>';

  return { subject, text, html };
}
