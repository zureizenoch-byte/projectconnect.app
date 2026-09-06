/** Recognise the platform from a meeting link, for labelling and joining. */
export type MeetingPlatform = 'zoom' | 'meet' | 'teams' | 'other';

export function detectPlatform(url?: string | null): MeetingPlatform {
  if (!url) return 'other';
  const u = url.toLowerCase();
  if (u.includes('zoom.us') || u.includes('zoom.com')) return 'zoom';
  if (u.includes('meet.google')) return 'meet';
  if (u.includes('teams.microsoft') || u.includes('teams.live')) return 'teams';
  return 'other';
}

export const PLATFORM_LABEL: Record<MeetingPlatform, string> = {
  zoom: 'Zoom',
  meet: 'Google Meet',
  teams: 'Microsoft Teams',
  other: 'Video call',
};

/** Zoom links carry the meeting id in the path; worth showing when dialling in. */
export function zoomMeetingId(url?: string | null) {
  if (!url) return null;
  const m = url.match(/\/j\/(\d{9,12})/);
  return m ? m[1].replace(/(\d{3})(\d{3,4})(\d+)/, '$1 $2 $3') : null;
}

/** The passcode Zoom appends as ?pwd= — surfaced so nobody has to dig for it. */
export function zoomPasscode(url?: string | null) {
  if (!url) return null;
  const m = url.match(/[?&]pwd=([^&]+)/);
  return m ? m[1] : null;
}

/**
 * What an attendee needs to join, assembled from the link itself. Returns null
 * for an in-person event.
 */
export function joinDetails(format?: string | null, url?: string | null, note?: string | null) {
  if (format !== 'online') return null;
  const platform = detectPlatform(url);
  return {
    platform,
    label: PLATFORM_LABEL[platform],
    url: url ?? null,
    meetingId: platform === 'zoom' ? zoomMeetingId(url) : null,
    passcode: platform === 'zoom' ? zoomPasscode(url) : null,
    note: note ?? null,
  };
}
