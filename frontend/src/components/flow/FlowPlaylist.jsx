import { useEffect, useState } from 'react';
import api, { spotifyAPI } from '../../services/api';
import { useMusic } from '../../context/MusicContext';
import { Card, CardTitle, Skeleton, EmptyState, ErrorMsg } from '../UI';
import { AudioLines, Music, Play, RefreshCw } from 'lucide-react';

const tz = -new Date().getTimezoneOffset();

const connectSpotify = async (setError) => {
  try {
    const { data } = await spotifyAPI.getLoginUrl();
    window.location.href = data.url;
  } catch { setError('Could not start the Spotify connection.'); }
};

/** Tracks you were playing while you shipped, turned into a private Spotify playlist. */
export default function FlowPlaylist() {
  const { setSelectedPlaylist } = useMusic();
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);

  useEffect(() => {
    api.get('/flow/playlist', { params: { tz } })
      .then(({ data }) => setState(data))
      .catch((e) => setError(e.response?.data?.error || 'Could not load your listening history.'));
  }, []);

  const create = async () => {
    setCreating(true); setError('');
    try {
      const { data } = await api.post('/flow/playlist', null, { params: { tz } });
      setCreated(data.playlist);
      setSelectedPlaylist(data.playlist);
    } catch (e) {
      if (e.response?.data?.needsReconnect) setState((s) => ({ ...s, needsReconnect: true }));
      setError(e.response?.data?.error || 'Could not create the playlist.');
    } finally { setCreating(false); }
  };

  const tracks = state?.tracks || [];
  let body;
  if (!state && !error) body = <div className="grid grid-cols-4 gap-2">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="aspect-square" />)}</div>;
  else if (state && !state.connected) {
    body = (
      <EmptyState icon={<Music size={20} />} title="Connect Spotify" subtitle="We'll match what you listen to with when you commit, and find your flow soundtrack.">
        <button className="btn-primary" onClick={() => connectSpotify(setError)}>Connect Spotify</button>
      </EmptyState>
    );
  } else if (state?.needsReconnect) {
    body = (
      <EmptyState icon={<RefreshCw size={20} />} title="Reconnect Spotify" subtitle="Your connection predates the Flow Playlist. Reconnect to allow recently-played and private playlist access.">
        <button className="btn-primary" onClick={() => connectSpotify(setError)}>Reconnect Spotify</button>
      </EmptyState>
    );
  } else if (state && !tracks.length) {
    body = (
      <EmptyState icon={<AudioLines size={20} />} title="No overlap yet"
        subtitle={`None of your last ${state.plays || 0} plays happened within 45 minutes of a commit. Listen while you code for a few days and check back.`} />
    );
  } else if (tracks.length) {
    body = (
      <>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tracks.slice(0, 8).map((t) => (
            <li key={t.id} className="group min-w-0">
              <a href={t.url || undefined} target="_blank" rel="noreferrer" className="block">
                <div className="relative aspect-square overflow-hidden rounded-lg border border-line bg-raised">
                  {t.image
                    ? <img src={t.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    : <div className="flex h-full items-center justify-center text-subtle"><Music size={20} /></div>}
                  <span className="badge-accent badge absolute right-1.5 top-1.5 font-mono backdrop-blur" aria-label={`${t.match}% match`}>{t.match}%</span>
                </div>
                <div className="mt-1.5 truncate text-[13px] text-fg">{t.name}</div>
                <div className="truncate text-xs text-subtle">{t.artists}</div>
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button className="btn-primary" onClick={create} disabled={creating}>
            <Play size={14} /> {creating ? 'Building playlist…' : created ? 'Update & play again' : 'Create & play playlist'}
          </button>
          <span className="text-xs text-subtle">
            {created ? <>Saved as <span className="text-fg">{created.name}</span> · {created.tracks} tracks, private</>
              : `${tracks.length} track${tracks.length === 1 ? '' : 's'} · private playlist "Insightify Flow"`}
          </span>
        </div>
      </>
    );
  }

  return (
    <Card>
      <CardTitle icon={<AudioLines size={15} />} title="Flow playlist"
        subtitle="Songs you played within ±45 min of a commit. Deep-work sessions count double." />
      {error && <div className="mb-4"><ErrorMsg message={error} /></div>}
      {body}
    </Card>
  );
}
