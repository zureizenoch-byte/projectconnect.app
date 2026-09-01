'use client';

import { useState, useTransition } from 'react';
import { VenueForm } from './VenueForm';
import { VenueRow } from './VenueRow';
import { VenueContact } from './VenueContact';
import { decideAccessRequest, revokeRole, grantRole, setAccountRole, setEventStatus, saveVenue, setVenueActive, deleteVenue, resolveReport, resolveMessageReport } from '@/app/actions/admin';

export function AdminControls({ requests, pendingEvents, leads, reports, chapters, venues, log, everyone = [], messageReports = [], currentAdminId }: any) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const run = (fn: () => Promise<any>) => start(async () => {
    const res = await fn();
    setMsg(res?.error ?? 'Done.');
  });

  return (
    <>
      {msg && <p className="hint" style={{ color: msg === 'Done.' ? 'var(--ok)' : 'var(--err)' }}>{msg}</p>}

      <h2 id="access-requests" style={{ marginTop: 30, scrollMarginTop: 80 }}>Access requests</h2>
      <div className="surf" style={{ marginTop: 14, overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>Person</th><th>Requesting</th><th>Chapter</th><th>Introduction</th><th style={{ textAlign: 'right' }}>Decision</th></tr></thead>
          <tbody>
            {requests.map((r: any) => (
              <tr key={r.id}>
                <td>{r.profiles?.full_name}<br /><span className="mute small">{r.profiles?.email}</span></td>
                <td>{r.kind === 'speaker' ? 'Speaker' : 'Chapter Lead'}</td>
                <td className="mute">{r.chapters?.city ?? '—'}</td>
                <td className="mute small" style={{ maxWidth: 320 }}>
                  {r.note || <span style={{ opacity: .6 }}>No details given</span>}
                  <br />
                  <span style={{ opacity: .75 }}>
                    Waiting {Math.max(0, Math.floor((Date.now() - +new Date(r.created_at)) / 86400000))} day(s)
                  </span>
                </td>
                <td>
                  <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                    <button className="btn btn-gold" style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
                      disabled={pending} onClick={() => run(() => decideAccessRequest(r.id, true))}>Approve</button>
                    <button className="btn btn-out" style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
                      disabled={pending} onClick={() => run(() => decideAccessRequest(r.id, false))}>Reject</button>
                  </div>
                </td>
              </tr>
            ))}
            {!requests.length && <tr><td colSpan={5} className="mute">Nothing waiting.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 id="pending-events" style={{ marginTop: 30, scrollMarginTop: 80 }}>Events awaiting approval</h2>
      <div className="surf" style={{ marginTop: 14, overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>Event</th><th>Kind</th><th>Chapter</th><th>Created by</th><th style={{ textAlign: 'right' }}>Decision</th></tr></thead>
          <tbody>
            {pendingEvents.map((e: any) => (
              <tr key={e.id}>
                <td>{e.title}<br /><span className="mute small">
                  {new Date(e.starts_at).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}
                </span></td>
                <td>{e.kind === 'talk' ? 'Speaker Series' : 'Meetup'}</td>
                <td className="mute">{e.chapters?.city}</td>
                <td className="mute">{e.profiles?.full_name}</td>
                <td>
                  <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                    <button className="btn btn-gold" style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
                      disabled={pending} onClick={() => run(() => setEventStatus(e.id, 'published'))}>Publish</button>
                    <button className="btn btn-out" style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
                      disabled={pending} onClick={() => run(() => setEventStatus(e.id, 'cancelled'))}>Reject</button>
                  </div>
                </td>
              </tr>
            ))}
            {!pendingEvents.length && <tr><td colSpan={5} className="mute">Nothing waiting.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 30 }}>Granted access</h2>
      <form className="surf" style={{ padding: 20, marginTop: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const form = e.currentTarget;
          run(async () => { const r = await grantRole(fd); if (!r?.error) form.reset(); return r; });
        }}>
        <p className="eyebrow">Grant a role directly</p>
        <div className="row" style={{ alignItems: 'flex-end', marginTop: 12 }}>
          <label className="fld" style={{ flex: '1 1 280px', marginBottom: 0 }}>
            <span>Member email</span>
            <input name="email" type="email" required placeholder="them@example.com" />
          </label>
          <label className="fld" style={{ flex: '0 1 200px', marginBottom: 0 }}>
            <span>Role</span>
            <select name="role" defaultValue="speaker">
              <option value="speaker">Speaker</option>
              <option value="chapter_lead">Chapter Lead</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button className="btn btn-primary" type="submit" disabled={pending}>Grant</button>
        </div>
        <p className="hint">They must already have an account. Grants are logged and can be revoked below.</p>
      </form>
      <div className="surf" style={{ marginTop: 14, overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>Person</th><th>Role</th><th>Chapter</th><th>Since</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
          <tbody>
            {leads.map((p: any) => (
              <tr key={p.id}>
                <td>
                  <a href={'/members/' + p.id} style={{ color: 'var(--ink)', fontWeight: 500 }}>
                    {p.full_name || '—'}
                  </a>
                  <br /><span className="mute small">{p.email}</span>
                </td>
                <td>
                  {p.role === 'chapter_lead' ? 'Chapter Lead' : p.role === 'admin' ? 'Admin' : 'Speaker'}
                  {p.role === 'speaker' && (
                    <>
                      {' '}
                      <span className={'pill ' + (p.speaker_approved ? 'pill-ok' : 'pill-off')}>
                        {p.speaker_approved ? 'can host' : 'not active'}
                      </span>
                    </>
                  )}
                </td>
                <td className="mute">{p.chapters?.city ?? '—'}</td>
                <td className="mute small">
                  {p.granted_at
                    ? new Date(p.granted_at).toLocaleDateString('en-CA', { dateStyle: 'medium' })
                    : '—'}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {p.id === currentAdminId ? (
                    <span className="mute small">You</span>
                  ) : (
                    <button className="btn btn-out" style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
                      disabled={pending}
                      onClick={() => {
                        if (!confirm('Remove ' + p.role.replace('_', ' ') + ' access from ' + (p.full_name ?? p.email) + '?')) return;
                        run(() => revokeRole(p.id, p.role));
                      }}>Revoke</button>
                  )}
                </td>
              </tr>
            ))}
            {!leads.length && <tr><td colSpan={5} className="mute">No granted roles yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 30 }}>Venues</h2>
      <VenueForm chapters={chapters} />

      <div className="surf" style={{ marginTop: 14, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Venue</th><th>Address</th><th>Capacity</th><th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(venues ?? []).map((v: any) => (
              <VenueRow key={v.id} venue={v} notices={venueNotices ?? []} />
            ))}
            {!venues.length && <tr><td colSpan={5} className="mute">No venues yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="hint">
        Retiring hides a venue from new events but keeps it on past ones. Delete only works
        when no event references it. Add a contact email and the venue is emailed automatically
        whenever a meetup there is published.
      </p>

      <h2 style={{ marginTop: 30 }}>All accounts</h2>
      <p className="mute small" style={{ marginTop: 6 }}>
        Change anyone's role here. Grants and revocations are written to the audit log below.
      </p>
      <div className="surf" style={{ marginTop: 14, overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>Person</th><th>City</th><th>Role</th><th style={{ textAlign: 'right' }}>Change to</th></tr></thead>
          <tbody>
            {everyone.map((p: any) => (
              <tr key={p.id}>
                <td>{p.full_name || '—'}<br /><span className="mute small">{p.email}</span></td>
                <td className="mute">{p.city ?? '—'}</td>
                <td>
                  <span className={'pill ' + (p.role === 'admin' ? 'pill-ok' : p.role === 'member' ? 'pill-off' : 'pill-wait')}>
                    {p.role.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {p.id === currentAdminId ? (
                    <span className="mute small">You</span>
                  ) : (
                    <select defaultValue={p.role} disabled={pending}
                      style={{ minHeight: 36, padding: '4px 10px', border: '1px solid var(--line)',
                        borderRadius: 10, background: '#fff', font: 'inherit', fontSize: 14 }}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (next === p.role) return;
                        if (!confirm('Set ' + (p.full_name || p.email) + ' to ' + next.replace('_', ' ') + '?')) {
                          e.target.value = p.role;
                          return;
                        }
                        run(() => setAccountRole(p.id, next));
                      }}>
                      <option value="member">Member</option>
                      <option value="student">Student</option>
                      <option value="speaker">Speaker</option>
                      <option value="chapter_lead">Chapter Lead</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
            {!everyone.length && <tr><td colSpan={4} className="mute">No accounts yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 id="message-reports" style={{ marginTop: 30, scrollMarginTop: 80 }}>Reported messages</h2>
      <div className="surf" style={{ marginTop: 14, overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>Reported</th><th>Reason</th><th>Message</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
          <tbody>
            {messageReports.map((r: any) => (
              <tr key={r.id}>
                <td>
                  <a href={'/members/' + r.reported_id} style={{ color: 'var(--ink)', fontWeight: 500 }}>
                    {r.reported?.full_name || 'Member'}
                  </a>
                  <br /><span className="mute small">reported by {r.reporter?.full_name || 'a member'}</span>
                </td>
                <td>
                  <span className="pill pill-wait">{r.reason}</span>
                  {r.detail && <><br /><span className="mute small">{r.detail}</span></>}
                </td>
                <td className="mute small" style={{ maxWidth: 320 }}>
                  {r.message?.body?.slice(0, 200) ?? 'Whole conversation'}
                  <br />
                  <span style={{ opacity: .75 }}>
                    {new Date(r.created_at).toLocaleDateString('en-CA', { dateStyle: 'medium' })}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-out" style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
                    disabled={pending} onClick={() => run(() => resolveMessageReport(r.id))}>Resolve</button>
                </td>
              </tr>
            ))}
            {!messageReports.length && <tr><td colSpan={4} className="mute">No open message reports.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 id="reports" style={{ marginTop: 30, scrollMarginTop: 80 }}>Reported posts</h2>
      <div className="surf" style={{ marginTop: 14, overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>Post</th><th>Reason</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
          <tbody>
            {reports.map((r: any) => (
              <tr key={r.id}>
                <td style={{ maxWidth: 420 }}>
{r.posts?.body?.slice(0, 200)}
                </td>
                <td className="mute small">{r.reason}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-out" style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
                    disabled={pending} onClick={() => run(() => resolveReport(r.id))}>Resolve</button>
                </td>
              </tr>
            ))}
            {!reports.length && <tr><td colSpan={3} className="mute">No open reports.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 30 }}>Audit log</h2>
      <div className="surf" style={{ marginTop: 14, overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Target</th></tr></thead>
          <tbody>
            {log.map((l: any) => (
              <tr key={l.id}>
                <td className="mute small">{new Date(l.created_at).toLocaleString('en-CA')}</td>
                <td>{l.profiles?.full_name ?? 'System'}</td>
                <td><code>{l.action}</code></td>
                <td className="mute small">{l.target}</td>
              </tr>
            ))}
            {!log.length && <tr><td colSpan={4} className="mute">Nothing logged yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
