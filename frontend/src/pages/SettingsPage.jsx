import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import { PageHeader, Card, CardTitle, ErrorMsg } from '../components/UI';
import { MapPin, LogOut } from 'lucide-react';
import { initials } from '../utils';

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

      <Card>
        <CardTitle title="Account" subtitle="Signed in with Google" />
        <button onClick={signOut} className="btn-secondary"><LogOut size={16} aria-hidden="true" /> Sign out</button>
      </Card>
    </div>
  );
}
