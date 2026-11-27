import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import { PageHeader, Card, CardTitle, ErrorMsg } from '../components/UI';
import { MapPin, LogOut, Send, Link2, Check, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { initials } from '../utils';

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
    <Card className="mb-4">
      <CardTitle title="Public profile" subtitle="A shareable page with your public GitHub activity and a 'year in code' card. Never shows your email, tasks or reports." />
      {!profile?.githubConnected ? (
        <p className="text-sm text-olive">Connect GitHub on the <Link to="/activity" className="link">Activity</Link> page first.</p>
      ) : (
        <>
          <label className="flex cursor-pointer items-center gap-3">
            <input type="checkbox" role="switch" checked={!!profile.publicProfile} onChange={toggle} disabled={busy} className="h-5 w-5 accent-plum" />
            <span className="font-semibold">{profile.publicProfile ? 'Your profile is public' : 'Make my profile public'}</span>
          </label>
          {profile.publicProfile && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-white px-4 py-2.5 text-sm">{url}</code>
              <button onClick={copy} className="btn-secondary">{copied ? <Check size={16} /> : <Link2 size={16} />} {copied ? 'Copied' : 'Copy'}</button>
              <a href={url} target="_blank" rel="noreferrer" className="btn-ghost"><ExternalLink size={16} aria-hidden="true" /> Open</a>
            </div>
          )}
        </>
      )}
      {error && <div className="mt-3"><ErrorMsg message={error} /></div>}
    </Card>
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
    <Card className="mb-4">
      <CardTitle title="Slack" subtitle={connected ? 'Connected: standups and weekly reports can be sent to your channel' : 'Send standups and weekly reports to a Slack channel'} />
      {connected ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge bg-forest/10 text-forest"><Send size={12} aria-hidden="true" /> Webhook saved</span>
          <button onClick={() => save('')} disabled={busy} className="btn-ghost">Remove</button>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); save(url); }} className="space-y-2">
          <label htmlFor="slack" className="block text-sm font-semibold">Incoming webhook URL</label>
          <div className="flex gap-2">
            <input id="slack" className="input" type="url" placeholder="https://hooks.slack.com/services/…" value={url}
              onChange={(e) => { setUrl(e.target.value); setError(''); }} />
            <button type="submit" disabled={busy || !url.trim()} className="btn-primary">Save</button>
          </div>
          <p className="text-xs text-olive">
            In Slack: Apps → Incoming Webhooks → Add to Slack → pick a channel → copy the URL.{' '}
            <a className="link" href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noreferrer">Guide</a>
          </p>
        </form>
      )}
      {error && <div className="mt-3"><ErrorMsg message={error} /></div>}
    </Card>
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
    <div className="max-w-2xl">
      <PageHeader title="Settings" />

      <Card className="mb-4 flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-warm text-xl font-bold">
          {photo ? <img src={photo} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : initials(name)}
        </div>
        <div className="min-w-0">
          <div className="text-lg font-bold">{name}</div>
          <div className="truncate text-sm text-olive">{user?.email}</div>
          <div className="mt-1 text-xs text-olive">
            {profile?.githubConnected ? `GitHub: @${profile.githubUsername}` : 'GitHub not connected'}
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <CardTitle title="Profile" />
        <form onSubmit={save} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="mb-1.5 block text-sm font-semibold">Display name</label>
            <input id="displayName" className="input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Your name" />
          </div>
          <div>
            <label htmlFor="city" className="mb-1.5 block text-sm font-semibold">City for weather</label>
            <div className="flex gap-2">
              <input id="city" className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="e.g. Udaipur" />
              <button type="button" onClick={detectLocation} disabled={locating} className="btn-secondary">
                <MapPin size={16} aria-hidden="true" /> {locating ? 'Detecting…' : 'Detect'}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-olive">Used when browser location isn't available.</p>
          </div>

          {error && <ErrorMsg message={error} />}
          {saved && <p role="status" className="rounded bg-forest/10 px-4 py-3 text-sm font-semibold text-forest">Settings saved</p>}

          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save changes'}</button>
        </form>
      </Card>

      <PublicProfileCard profile={profile} onChange={refreshProfile} />
      <SlackCard connected={!!profile?.slackConnected} onChange={refreshProfile} />

      <Card>
        <CardTitle title="Account" subtitle="Signed in with Google" />
        <button onClick={signOut} className="btn-secondary"><LogOut size={16} aria-hidden="true" /> Sign out</button>
      </Card>
    </div>
  );
}
