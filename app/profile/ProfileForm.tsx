'use client';

import { useState, useTransition } from 'react';
import { saveProfile, uploadPhoto, removePhoto } from '@/app/actions/profile';
import { ChipGroup } from '@/components/ChipGroup';
import { MultiSelect } from '@/components/MultiSelect';
import { Avatar } from '@/components/Avatar';
import {
  CITIES, ROLE_LEVELS, DOMAINS, TRANSFORMATION_TYPES, METHODS, INDUSTRIES,
  CERTIFICATIONS, TOOLS, LANGUAGES,
} from '@/lib/options';
import type { Profile } from '@/lib/types';

type Tag = { category: string; value: string; is_custom: boolean };

export function ProfileForm({ profile, tags }: { profile: Profile; tags: Tag[] }) {
  const [photo, setPhoto] = useState<string | null>(profile.photo_url);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const picked = (c: string) => tags.filter((t) => t.category === c && !t.is_custom).map((t) => t.value);
  const customOf = (c: string) => tags.find((t) => t.category === c && t.is_custom)?.value ?? '';

  return (
    <form className="surf" style={{ padding: 'clamp(22px,3vw,34px)', marginTop: 26 }}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setSaving(true);
        setMsg(null);
        saveProfile(fd).then((res) => {
          setSaving(false);
          setMsg(res?.error ?? 'Saved.');
        }).catch(() => {
          setSaving(false);
          setMsg('Could not save — check your connection and try again.');
        });
      }}>

      <p className="eyebrow">Photo</p>
      <div className="row" style={{ margin: '14px 0 26px' }}>
        <Avatar src={photo} name={profile.full_name} email={profile.email} size={96} />
        <PhotoUpload current={photo} onChange={setPhoto} />
      </div>

      <div className="grid g2">
        <label className="fld"><span>Pronouns</span>
          <input name="pronouns" defaultValue={profile.pronouns ?? ''} placeholder="she/her, he/him, they/them" />
        </label>
        <label className="fld"><span>Full name</span>
          <input name="full_name" defaultValue={profile.full_name ?? ''} required />
        </label>
      </div>

      <label className="fld"><span>Introduction</span>
        <textarea name="intro" defaultValue={profile.intro ?? ''} maxLength={400}
          placeholder="One or two lines on what you deliver." />
      </label>

      <div className="grid g2">
        <label className="fld"><span>Current role</span>
          <select name="role_level" defaultValue={profile.role_level ?? ''}>
            <option value="">Select</option>
            {ROLE_LEVELS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
        <label className="fld"><span>City chapter</span>
          <select name="city" defaultValue={profile.city ?? 'Vancouver'}>
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="fld"><span>Current employer</span>
          <input name="employer" defaultValue={profile.employer ?? ''} />
        </label>
        <label className="fld"><span>Years of experience</span>
          <input name="years_experience" type="number" min={0} max={60}
            defaultValue={profile.years_experience ?? ''} />
        </label>
        <label className="fld"><span>LinkedIn</span>
          <input name="linkedin_url" type="url" defaultValue={profile.linkedin_url ?? ''}
            placeholder="https://linkedin.com/in/…" />
        </label>
      </div>

      <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '10px 0 26px' }} />
      <h2 style={{ fontSize: 24, marginBottom: 6 }}>Your experience</h2>
      <p className="mute small" style={{ marginTop: 0, marginBottom: 22 }}>
        Click to add. Pick as many as apply — every group has an "Other, please specify" write-in.
      </p>

      <MultiSelect category="domain" label="Your domains" options={DOMAINS}
        initial={picked('domain')} initialCustom={customOf('domain')} />
      <ChipGroup category="transformation_type" label="Transformation types delivered" options={TRANSFORMATION_TYPES}
        initial={picked('transformation_type')} initialCustom={customOf('transformation_type')} />
      <ChipGroup category="method" label="Methods and frameworks" options={METHODS}
        initial={picked('method')} initialCustom={customOf('method')} />
      <ChipGroup category="industry" label="Industries" options={INDUSTRIES}
        initial={picked('industry')} initialCustom={customOf('industry')} />
      <MultiSelect category="certification" label="Certifications" options={CERTIFICATIONS}
        initial={picked('certification')} initialCustom={customOf('certification')} />
      <MultiSelect category="tool" label="Platforms and tooling" options={TOOLS}
        initial={picked('tool')} initialCustom={customOf('tool')} />
      <MultiSelect category="language" label="Languages" options={LANGUAGES}
        initial={picked('language')} initialCustom={customOf('language')} />

      {msg && msg !== 'Saved.' && <p className="err">{msg}</p>}
      <div className="row" style={{ paddingTop: 18, borderTop: '1px solid var(--line)' }}>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : msg === 'Saved.' ? 'Saved' : 'Save profile'}
        </button>
      </div>
    </form>
  );
}

function PhotoUpload({ current, onChange }: { current: string | null; onChange: (url: string | null) => void }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  return (
    <div>
      <label className="btn btn-out" style={{ cursor: 'pointer' }}>
        {current ? 'Change photo' : 'Upload a photo'}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const fd = new FormData();
            fd.set('photo', file);
            start(async () => {
              const res = await uploadPhoto(fd);
              if (res?.error) { setIsError(true); setMsg(res.error); }
              else { setIsError(false); setMsg('Photo updated.'); onChange(res.url ?? null); }
            });
            e.target.value = '';
          }} />
      </label>
      {current && (
        <button type="button" className="btn btn-quiet" disabled={pending}
          onClick={() => start(async () => {
            const res = await removePhoto();
            if (res?.error) { setIsError(true); setMsg(res.error); }
            else { setIsError(false); setMsg('Photo removed.'); onChange(null); }
          })}>Remove</button>
      )}
      {pending && <p className="hint">Uploading…</p>}
      {msg && <p className={isError ? 'err' : 'hint'} style={!isError ? { color: 'var(--ok)' } : undefined}>{msg}</p>}
    </div>
  );
}
