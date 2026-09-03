'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { VenueSearch } from '@/components/VenueSearch';
import { saveVenue } from '@/app/actions/admin';
import { mapsUrl } from '@/lib/matching';

export function VenueForm({ chapters }: { chapters: { id: string; city: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? '');
  const [place, setPlace] = useState<{
    name: string; address: string;
    website?: string | null; phone?: string | null; photoUrl?: string | null;
  }>({ name: '', address: '' });

  const cityName = chapters.find((c) => c.id === chapterId)?.city ?? '';
  const fullAddress = place.address && !place.address.toLowerCase().includes(cityName.toLowerCase())
    ? place.address + ', ' + cityName
    : place.address;
  const ready = place.name.trim().length > 0 && fullAddress.trim().length > 0;

  return (
    <form className="surf" style={{ padding: 24, marginTop: 14 }}
      onKeyDown={(e) => {
        const el = e.target as HTMLElement;
        if (e.key === 'Enter' && el.tagName !== 'TEXTAREA' && el.getAttribute('type') !== 'submit') {
          e.preventDefault();
        }
      }}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;

        if (!place.name.trim()) {
          setMsg('Give the venue a name — search for it, or type it in the Venue name field.');
          (form.querySelector('[name="name"]') as HTMLInputElement | null)?.focus();
          return;
        }
        if (!place.address.trim()) {
          setMsg('Add the street address so members can find it.');
          (form.querySelector('[name="address"]') as HTMLInputElement | null)?.focus();
          return;
        }

        const fd = new FormData(form);
        start(async () => {
          const res = await saveVenue(fd);
          if (res?.error) { setMsg(res.error); return; }
          setMsg('Venue added — it is in the table below. Search another to add one more.');
          form.reset();
          setPlace({ name: '', address: '' });
          router.refresh();
        });
      }}>

      <div className="grid g2">
        <label className="fld"><span>Chapter</span>
          <select name="chapter_id" value={chapterId}
            onChange={(e) => { setChapterId(e.target.value); setPlace({ name: '', address: '' }); }}>
            {chapters.map((c) => <option key={c.id} value={c.id}>{c.city}</option>)}
          </select>
        </label>
        <label className="fld"><span>Capacity</span>
          <input name="capacity" type="number" min={1} max={15} defaultValue={15} />
        </label>
      </div>

      <div className="fld">
        <span>Find the place</span>
        <VenueSearch
          venues={[]}
          city={cityName}
          onPick={(v: any) => {
            setMsg(null);
            setPlace({
              name: v.name, address: v.address,
              website: v.website, phone: v.phone, photoUrl: v.photoUrl,
            });
          }} />
        <span className="hint">
          Search by name or address. The name and address below fill in automatically, and you can edit them.
        </span>
      </div>

      <div className="grid g2">
        <label className="fld"><span>Venue name</span>
          <input name="name" value={place.name} placeholder="Gastown Coffee Room"
            onChange={(e) => { setMsg(null); setPlace((p) => ({ ...p, name: e.target.value })); }} />
        </label>
        <label className="fld"><span>Address</span>
          <input name="address" value={place.address} placeholder="300 Water St"
            onChange={(e) => { setMsg(null); setPlace((p) => ({ ...p, address: e.target.value })); }} />
        </label>
      </div>

      {fullAddress && (
        <div style={{
          marginBottom: 20, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)',
        }}>
          <iframe
            title="Venue location"
            width="100%" height="240" loading="lazy" style={{ border: 0, display: 'block' }}
            referrerPolicy="no-referrer-when-downgrade"
            src={
              process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                ? 'https://www.google.com/maps/embed/v1/place?key='
                  + process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                  + '&q=' + encodeURIComponent(fullAddress) + '&zoom=16'
                : 'https://www.google.com/maps?q=' + encodeURIComponent(fullAddress) + '&output=embed'
            } />
          <div className="row" style={{
            justifyContent: 'space-between', padding: '12px 16px', background: '#fcfcff',
          }}>
            <span className="mute small">{fullAddress}</span>
            <a className="btn btn-out" href={mapsUrl(fullAddress)} target="_blank" rel="noopener noreferrer"
              style={{ minHeight: 34, padding: '0 14px', fontSize: 13.5 }}>Open in Maps</a>
          </div>
        </div>
      )}

      {(place.website || place.phone) && (
        <div style={{
          marginBottom: 20, padding: '14px 16px', borderRadius: 12,
          background: 'var(--gold-100)', border: '1px solid var(--gold-200)',
        }}>
          <p className="eyebrow" style={{ margin: 0 }}>Finding their email</p>
          <p className="mute small" style={{ margin: '6px 0 10px' }}>
            Google does not publish venue email addresses, so this part is manual — but here is
            where to look.
          </p>
          <div className="row" style={{ gap: 8 }}>
            {place.website && (
              <a className="btn btn-out" href={place.website} target="_blank" rel="noopener noreferrer"
                style={{ minHeight: 36, padding: '0 14px', fontSize: 13.5 }}>
                Open their website
              </a>
            )}
            {place.phone && (
              <a className="btn btn-out" href={'tel:' + place.phone.replace(/\s/g, '')}
                style={{ minHeight: 36, padding: '0 14px', fontSize: 13.5 }}>
                {place.phone}
              </a>
            )}
          </div>
        </div>
      )}

      <input type="hidden" name="website" value={place.website ?? ''} />
      <input type="hidden" name="phone" value={place.phone ?? ''} />
      <input type="hidden" name="photo_url" value={place.photoUrl ?? ''} />

      <div className="grid g2">
        <label className="fld"><span>Contact email</span>
          <input name="contact_email" type="email" placeholder="manager@coffeeshop.com" />
          <span className="hint">Saved once, then reused for every meetup at this venue.</span>
        </label>
        <label className="fld"><span>Contact name (optional)</span>
          <input name="contact_name" placeholder="Dana" />
        </label>
      </div>

      <label className="fld"><span>Notes</span>
        <input name="notes" placeholder="Step-free access, projector…" />
      </label>

      <label className="row" style={{ gap: 10, marginBottom: 16 }}>
        <input type="checkbox" name="active" defaultChecked />
        <span>Active — available when creating events</span>
      </label>

      {msg && (
        <p className="hint" style={{ color: msg.startsWith('Venue added') ? 'var(--ok)' : 'var(--err)' }}>
          {msg}
        </p>
      )}

      <div className="row" style={{ gap: 12 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add venue'}
        </button>
        <span className="mute" style={{ fontSize: 14 }}>
          {ready ? '' : 'Search for a place, or type a name and address.'}
        </span>
      </div>
    </form>
  );
}
