import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import { PageHeader, ErrorMsg } from '../components/UI';
import { GithubMark } from './ActivityPage';
import { MapPin, LogOut, Link2, Check, ExternalLink, Globe, Hash, CircleCheck } from 'lucide-react';
import { initials } from '../utils';

const SECTIONS = [['profile', 'Profile'], ['integrations', 'Integrations'], ['account', 'Account']];

/** Vercel-style settings block: body + footer bar with a hint and the block's action. */
const Block = ({ title, description, footer, action, children, danger }) => (
  <div className={`overflow-hidden rounded-xl border bg-surface shadow ${danger ? 'border-danger/30' : 'border-line'}`}>
    <div className="p-5 sm:p-6">
      <h3 className="text-[15px] font-semibold text-fg">{title}</h3>
      {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
    {(footer || action) && (
      <div className={`flex min-h-[52px] flex-wrap items-center justify-between gap-3 border-t px-5 py-2.5 sm:px-6 ${danger ? 'border-danger/20 bg-danger-soft' : 'border-line bg-raised/40'}`}>
        <div className="text-xs text-subtle">{footer}</div>
        {action}
      </div>
    )}
  </div>
);

const Field = ({ id, label, hint, children }) => (
  <div>
    <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-fg">{label}</label>
    {children}
    {hint && <p className="mt-1.5 text-xs text-subtle">{hint}</p>}
  </div>
);

const Switch = ({ checked, onChange, disabled, labelledBy }) => (
  <button type="button" role="switch" aria-checked={checked} aria-labelledby={labelledBy} onClick={onChange} disabled={disabled}
    className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors disabled:opacity-50 ${checked ? 'border-accent bg-accent' : 'border-line-strong bg-raised'}`}>
    <span className={`absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4' : ''}`} />
  </button>
);

const SectionHeading = ({ id, children }) => <h2 id={id} className="label mb-3 scroll-mt-20 pt-2">{children}</h2>;

function PublicProfileCard({ profile, onChange }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const url = `${window.location.origin}/u/${profile?.githubUsername}`;

  const toggle = async () => {
    setBusy(true); setError('');
    try {
      await userAPI.updateProfile({ publicProfile: !profile.publicProfile });
      await onChange();
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setBusy(false); }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Block title={<span className="flex items-center gap-2"><Globe size={15} className="text-subtle" aria-hidden="true" /> Public profile</span>}
      description="A shareable page with your public GitHub activity and a 'year in code' card. Never shows your email, tasks or reports."
      footer={profile?.githubConnected ? (profile.publicProfile ? 'Anyone with the link can view it.' : 'Only you can see your data.') : null}>
      {!profile?.githubConnected ? (
        <p className="text-[13px] text-muted">Connect GitHub on the <Link to="/activity" className="link">Activity</Link> page first.</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-raised/50 px-4 py-3">
            <span id="public-label" className="text-[13px] font-medium text-fg">{profile.publicProfile ? 'Your profile is public' : 'Make my profile public'}</span>
            <Switch checked={!!profile.publicProfile} onChange={toggle} disabled={busy} labelledBy="public-label" />
          </div>
          {profile.publicProfile && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="input flex min-w-0 flex-1 items-center truncate font-mono text-xs text-muted">{url}</code>
              <button onClick={copy} className="btn-secondary">{copied ? <Check size={14} className="text-success" /> : <Link2 size={14} />} {copied ? 'Copied' : 'Copy'}</button>
              <a href={url} target="_blank" rel="noreferrer" className="btn-ghost"><ExternalLink size={14} aria-hidden="true" /> Open</a>
            </div>
          )}
        </>
      )}
      {error && <div className="mt-3"><ErrorMsg message={error} /></div>}
    </Block>
  );
}

// The webhook is write-only: the API only ever tells us whether one is saved.
function SlackCard({ connected, onChange }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (value) => {
    setBusy(true); setError('');
    try {
      await userAPI.updateProfile({ slackWebhookUrl: value });
      setUrl('');
      await onChange();
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(url); }}>
      <Block title={<span className="flex items-center gap-2"><Hash size={15} className="text-subtle" aria-hidden="true" /> Slack</span>}
        description={connected ? 'Standups and weekly reports can be sent to your channel.' : 'Send standups and weekly reports to a Slack channel.'}
        footer={connected ? null : (
          <>In Slack: Apps → Incoming Webhooks → Add to Slack → pick a channel → copy the URL.{' '}
            <a className="link" href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noreferrer">Guide</a></>
        )}
        action={connected
          ? <button type="button" onClick={() => save('')} disabled={busy} className="btn-secondary btn-sm">Remove</button>
          : <button type="submit" disabled={busy || !url.trim()} className="btn-primary btn-sm">Save</button>}>
        {connected ? (
          <span className="badge badge-success"><CircleCheck size={11} aria-hidden="true" /> Webhook saved</span>
        ) : (
          <Field id="slack" label="Incoming webhook URL">
            <input id="slack" className="input font-mono" type="url" placeholder="https://hooks.slack.com/services/…" value={url}
              onChange={(e) => { setUrl(e.target.value); setError(''); }} />
          </Field>
        )}
        {error && <div className="mt-3"><ErrorMsg message={error} /></div>}
      </Block>
    </form>
  );
}

export default function SettingsPage() {
  const { user, profile, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ city: '', displayName: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (profile) setForm({ city: profile.city || '', displayName: profile.displayName || '' });
  }, [profile]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    try {
      await userAPI.updateProfile(form);
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          // Reverse geocode with OpenStreetMap Nominatim (free, no key)
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || '';
          setForm((f) => ({ ...f, city }));
          await userAPI.updateProfile({ lat: pos.coords.latitude, lon: pos.coords.longitude, city });
        } catch { setError('Could not detect your city.'); }
        finally { setLocating(false); }
      },
      () => { setLocating(false); setError('Location permission was denied.'); },
      { timeout: 8000 }
    );
  };

  const signOut = async () => {
    await logout();
    navigate('/login');
  };

  const name = form.displayName || user?.displayName || 'You';
  const photo = profile?.photoURL || user?.photoURL;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your profile, integrations and account." />

      <div className="grid gap-8 lg:grid-cols-[180px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="hidden lg:block">
          <ul className="sticky top-24 space-y-0.5">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="flex h-8 items-center rounded-md px-2.5 text-[13px] text-muted transition-colors hover:bg-raised hover:text-fg">{label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="max-w-3xl space-y-4">
          <SectionHeading id="profile">Profile</SectionHeading>

          <div className="card flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-raised text-lg font-semibold text-muted ring-1 ring-line-strong">
              {photo ? <img src={photo} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : initials(name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-fg">{name}</div>
              <div className="truncate text-[13px] text-muted">{user?.email}</div>
            </div>
            {profile?.githubConnected
              ? <span className="badge badge-success shrink-0"><GithubMark size={11} /> @{profile.githubUsername}</span>
              : <Link to="/activity" className="badge shrink-0 hover:text-fg">GitHub not connected</Link>}
          </div>

          <form onSubmit={save}>
            <Block title="General" description="How you appear in Insightify, and where your weather comes from."
              footer={saved ? <span role="status" className="inline-flex items-center gap-1.5 text-success"><Check size={13} /> Settings saved</span> : 'Changes apply across the app.'}
              action={<button type="submit" disabled={saving} className="btn-primary btn-sm">{saving ? 'Saving…' : 'Save changes'}</button>}>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="displayName" label="Display name">
                  <input id="displayName" className="input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Your name" />
                </Field>
                <Field id="city" label="City for weather" hint="Used when browser location isn't available.">
                  <div className="flex gap-2">
                    <input id="city" className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="e.g. Udaipur" />
                    <button type="button" onClick={detectLocation} disabled={locating} className="btn-secondary">
                      <MapPin size={14} aria-hidden="true" /> {locating ? 'Detecting…' : 'Detect'}
                    </button>
                  </div>
                </Field>
              </div>
              {error && <div className="mt-4"><ErrorMsg message={error} /></div>}
            </Block>
          </form>

          <SectionHeading id="integrations">Integrations</SectionHeading>
          <SlackCard connected={!!profile?.slackConnected} onChange={refreshProfile} />
          <PublicProfileCard profile={profile} onChange={refreshProfile} />

          <SectionHeading id="account">Account</SectionHeading>
          <Block title="Sign out" description={`Signed in with Google as ${user?.email ?? 'your account'}.`} danger
            footer="You can sign back in at any time."
            action={<button onClick={signOut} className="btn-danger btn-sm"><LogOut size={13} aria-hidden="true" /> Sign out</button>} />
        </div>
      </div>
    </div>
  );
}
