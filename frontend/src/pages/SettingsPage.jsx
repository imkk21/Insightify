import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import { PageHeader, Card, CardHeader, CardBody, ErrorMsg } from '../components/UI';

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [form,    setForm]    = useState({ city: '', displayName: '' });
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState('');
  const [locating,setLocating]= useState(false);

  useEffect(() => {
    if (profile) {
      setForm({ city: profile.city || '', displayName: profile.displayName || '' });
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      await userAPI.updateProfile(form);
      if (refreshProfile) await refreshProfile();
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          // Reverse geocode using OpenStreetMap Nominatim (free, no key needed)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
          );
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || '';
          setForm((f) => ({ ...f, city }));
          // Also save lat/lon to backend
          await userAPI.updateProfile({ lat: pos.coords.latitude, lon: pos.coords.longitude, city });
        } catch { /* silent */ }
        finally { setLocating(false); }
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account and preferences" />
      <div className="max-w-xl space-y-5">
        {/* Profile */}
        <Card>
          <CardHeader title="Profile" subtitle="Your account information" />
          <CardBody>
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-black/[0.06]">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber to-rose flex items-center justify-center font-syne font-black text-xl text-white overflow-hidden">
                {profile?.photoURL
                  ? <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                  : (form.displayName || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-syne font-bold text-ink">{form.displayName || user?.displayName}</div>
                <div className="text-sm text-ink3">{user?.email}</div>
                <div className="text-xs text-ink3 font-mono mt-0.5">
                  {profile?.githubConnected
                    ? <span className="text-teal2">✓ GitHub: @{profile.githubUsername}</span>
                    : <span className="text-ink3 opacity-60">GitHub not connected</span>}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-ink3 uppercase tracking-[1.5px] mb-1.5">Display Name</label>
                <input className="input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Your name" />
              </div>
              <div>
                <label className="block text-xs font-mono text-ink3 uppercase tracking-[1.5px] mb-1.5">City (for Weather)</label>
                <div className="flex gap-2">
                  <input className="input flex-1" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="e.g. Mumbai" />
                  <button onClick={detectLocation} disabled={locating} className="btn-outline whitespace-nowrap text-xs py-2">
                    {locating ? '…' : '📍 Detect'}
                  </button>
                </div>
                <p className="text-xs text-ink3 mt-1.5">Used as fallback when geolocation is unavailable</p>
              </div>
            </div>

            {error && <div className="mt-4"><ErrorMsg message={error} /></div>}
            {saved && <div className="mt-4 text-teal text-sm bg-teal/5 border border-teal/20 rounded-xl px-4 py-3">✓ Settings saved</div>}

            <button onClick={handleSave} disabled={saving} className="btn-primary mt-5 w-full justify-center flex">
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </CardBody>
        </Card>

        {/* Tech Stack */}
        <Card>
          <CardHeader title="Tech Stack" subtitle="Technologies powering Insightify" />
          <CardBody>
            <div className="space-y-4">
              {[
                { category: 'Frontend',  items: ['React.js','Vite','Tailwind CSS','Axios','Firebase Auth SDK'] },
                { category: 'Backend',   items: ['Node.js','Express.js','MongoDB Atlas','Firebase Admin','Node-Cron'] },
                { category: 'AI & APIs', items: ['Google Gemini 1.5','GitHub API','OpenWeather API','News API'] },
              ].map(({ category, items }) => (
                <div key={category}>
                  <div className="text-[10px] font-mono text-ink3 uppercase tracking-[2px] mb-2">{category}</div>
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => (
                      <span key={item} className="px-3 py-1 rounded-full bg-cream border border-black/[0.08] text-xs text-ink3 font-mono hover:border-amber hover:text-amber transition-colors cursor-default">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
