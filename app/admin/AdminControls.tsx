'use client';

import { useState, useTransition } from 'react';
import { decideAccessRequest, revokeLead, setEventStatus, saveVenue, resolveReport } from '@/app/actions/admin';

export function AdminControls({ requests, pendingEvents, leads, reports, chapters, venues, log }: any) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const run = (fn: () => Promise<any>) => start(async () => {
    const res = await fn();
    setMsg(res?.error ?? 'Done.');
  });

  return (
    <>
      {msg && <p className="hint" style={{ color: msg === 'Done.' ? 'var(--ok)' : 'var(--err)' }}>{msg}</p>}

      <h2 style={{ marginTop: 30 }}>Access requests</h2>
      <div className="surf" style={{ marginTop: 14, overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>Person</th><th>Requesting</th><th>Chapter</th><th>Note</th><th style={{ textAlign: 'right' }}>Decision</th></tr></thead>
          <tbody>
            {requests.map((r: any) => (
              <tr key={r.id}>
                <td>{r.profiles?.full_name}<br /><span className="mute small">{r.profiles?.email}</span></td>
                <td>{r.kind === 'speaker' ? 'Speaker' : 'Chapter Lead'}</td>
                <td className="mute">{r.chapters?.city ?? '—'}</td>
                <td className="mute small" style={{ maxWidth: 320 }}>{r.note}</td>
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

      <h2 style={{ marginTop: 30 }}>Events awaiting approval</h2>
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
      <div className="surf" style={{ marginTop: 14, overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>Person</th><th>Role</th><th>Chapter</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
          <tbody>
            {leads.map((p: any) => (
              <tr key={p.id}>
                <td>{p.full_name}<br /><span className="mute small">{p.email}</span></td>
                <td>{p.role === 'chapter_lead' ? 'Chapter Lead' : 'Speaker'}</td>
                <td className="mute">{p.chapters?.city ?? '—'}</td>
                <td style={{ textAlign: 'right' }}>
                  {p.role === 'chapter_lead' && (
                    <button className="btn btn-out" style={{ minHeight: 34, padding: '0 12px', fontSize: 13.5 }}
                      disabled={pending} onClick={() => run(() => revokeLead(p.id))}>Revoke</button>
                  )}
                </td>
              </tr>
            ))}
            {!leads.length && <tr><td colSpan={4} className="mute">No granted roles yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 30 }}>Venues</h2>
      <form className="surf" style={{ padding: 24, marginTop: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const form = e.currentTarget;
          run(async () => { const r = await saveVenue(fd); if (!r?.error) form.reset(); return r; });
        }}>
        <div className="grid g2">
          <label className="fld"><span>Name</span><input name="name" required /></label>
          <label className="fld"><span>Chapter</span>
            <select name="chapter_id">{chapters.map((c: any) => <option key={c.id} value={c.id}>{c.city}</option>)}</select>
          </label>
          <label className="fld"><span>Address</span><input name="address" required /></label>
          <label className="fld"><span>Capacity</span><input name="capacity" type="number" min={1} max={15} defaultValue={15} /></label>
        </div>
        <label className="fld"><span>Notes</span><input name="notes" placeholder="Step-free access, projector…" /></label>
        <label className="row" style={{ gap: 10, marginBottom: 16 }}>
          <input type="checkbox" name="active" defaultChecked /><span>Active</span>
        </label>
        <button className="btn btn-primary" type="submit" disabled={pending}>Add venue</button>
      </form>
      <div className="surf" style={{ marginTop: 14, overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>Venue</th><th>Address</th><th>Capacity</th><th>Active</th></tr></thead>
          <tbody>
            {venues.map((v: any) => (
              <tr key={v.id}>
                <td>{v.name}</td>
                <td className="mute small">{v.address}</td>
                <td className="mute">{v.capacity}</td>
                <td>{v.active ? <span className="pill pill-ok">Active</span> : <span className="pill pill-off">Off</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 30 }}>Reported posts</h2>
      <div className="surf" style={{ marginTop: 14, overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>Post</th><th>Reason</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
          <tbody>
            {reports.map((r: any) => (
              <tr key={r.id}>
                <td style={{ maxWidth: 420 }}>
                  <span className="mute small">{r.posts?.profiles?.full_name}</span><br />{r.posts?.body?.slice(0, 200)}
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
