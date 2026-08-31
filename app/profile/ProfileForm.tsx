'use client';

import { useState, useTransition } from 'react';
import { saveProfile, uploadPhoto, removePhoto } from '@/app/actions/profile';
import { ChipGroup } from '@/components/ChipGroup';
import { MultiSelect } from '@/components/MultiSelect';
import { Avatar } from '@/components/Avatar';
import {
  CITIES, ROLE_LEVELS, DOMAINS, TRANSFORMATION_TYPES, METHODS, INDUSTRIES,
  CERTIFICATIONS, TOOLS, LANGUAGES, BUDGETS, WORK_AUTH, CREDENTIAL_RECOGNITION,
} from '@/lib/options';
import type { Profile } from '@/lib/types';

type Tag = { category: string; value: string; is_custom: boolean };

export function ProfileForm({ profile, tags }: { profile: Profile; tags: Tag[] }) {
  const [photo, setPhoto] = useState<string | null>(profile.photo_url);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [isStudent, setIsStudent] = useState(profile.is_student);
  const [isImmigrant, setIsImmigrant] = useState(profile.is_immigrant);

  const picked = (c: string) => tags.filter((t) => t.category === c && !t.is_custom).map((t) => t.value);
  const customOf = (c: string) => tags.find((t) => t.category === c && t.is_custom)?.value ?? '';

  return (
    <form className="surf" style={{ padding: 'clamp(22px,3vw,34px)', marginTop: 26 }}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await saveProfile(fd);
          setMsg(res?.error ?? 'Saved.');
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
        <label className="fld"><span>Current role level</span>
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
        <label className="fld"><span>Programme budget owned</span>
          <select name="budget_owned" defaultValue={profile.budget_owned ?? ''}>
            <option value="">Select</option>
            {BUDGETS.map((b) => <option key={b}>{b}</option>)}
          </select>
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

      <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '10px 0 26px' }} />
      <h2 style={{ fontSize: 24, marginBottom: 16 }}>Your situation</h2>

      <label className="row" style={{ marginBottom: 16, gap: 10 }}>
        <input type="checkbox" name="is_student" defaultChecked={isStudent}
          onChange={(e) => setIsStudent(e.target.checked)} />
        <span><strong>I'm a student</strong></span>
      </label>
      {isStudent && (
        <div className="grid g2">
          <label className="fld"><span>Institution</span>
            <input name="institution" defaultValue={profile.institution ?? ''} />
          </label>
          <label className="fld"><span>Programme</span>
            <input name="programme" defaultValue={profile.programme ?? ''} />
          </label>
          <label className="fld"><span>Graduation year</span>
            <input name="graduation_year" type="number" min={1970} max={2040}
              defaultValue={profile.graduation_year ?? ''} />
          </label>
        </div>
      )}

      <label className="row" style={{ marginBottom: 16, gap: 10 }}>
        <input type="checkbox" name="is_immigrant" defaultChecked={isImmigrant}
          onChange={(e) => setIsImmigrant(e.target.checked)} />
        <span>
          <strong>I'm an immigrant to Canada</strong>
          <span className="small mute" style={{ display: 'block' }}>Never shown to other members.</span>
        </span>
      </label>
      {isImmigrant && (
        <div className="grid g2">
          <label className="fld"><span>Year of arrival</span>
            <input name="arrival_year" type="number" min={1950} max={2040}
              defaultValue={profile.arrival_year ?? ''} />
          </label>
          <label className="fld"><span>Country of origin</span>
            <input name="home_country" defaultValue={profile.home_country ?? ''} />
          </label>
          <label className="fld"><span>Credential recognition</span>
            <select name="credential_recognition" defaultValue={profile.credential_recognition ?? ''}>
              <option value="">Select</option>
              {CREDENTIAL_RECOGNITION.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="fld"><span>Work authorisation</span>
            <select name="work_authorization" defaultValue={profile.work_authorization ?? ''}>
              <option value="">Select</option>
              {WORK_AUTH.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>
      )}

      <div className="row" style={{ gap: 20, marginBottom: 22 }}>
        <label className="row" style={{ gap: 10 }}>
          <input type="checkbox" name="open_to_mentoring" defaultChecked={profile.open_to_mentoring} />
          <span>Open to mentoring others</span>
        </label>
        <label className="row" style={{ gap: 10 }}>
          <input type="checkbox" name="seeking_mentor" defaultChecked={profile.seeking_mentor} />
          <span>Looking for a mentor</span>
        </label>
      </div>

      {msg && <p className={msg === 'Saved.' ? 'hint' : 'err'} style={msg === 'Saved.' ? { color: 'var(--ok)' } : undefined}>{msg}</p>}
      <div className="row" style={{ paddingTop: 18, borderTop: '1px solid var(--line)' }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save profile'}
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
