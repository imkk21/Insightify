import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { spotifyAPI } from '../services/api';
import { useMusic } from '../context/MusicContext';
import { Card, CardTitle, Loader, EmptyState, ErrorMsg } from './UI';
import { Headphones, Music, AudioLines } from 'lucide-react';

export default function MusicPanel() {
  const { selectedPlaylist, setSelectedPlaylist, spotifyConnected, playlists, loadingPlaylists, checkSpotifyStatus } = useMusic();
  const [params] = useSearchParams();
  const [error, setError] = useState(params.get('error') ? 'Spotify sign-in did not complete. Please try again.' : '');

  const connect = async () => {
    setError('');
    try {
      const { data } = await spotifyAPI.getLoginUrl();
      window.location.href = data.url;
    } catch { setError('Could not start the Spotify connection.'); }
  };

  const disconnect = async () => {
    if (!window.confirm('Disconnect your Spotify account?')) return;
    try {
      await spotifyAPI.disconnect();
      setSelectedPlaylist(null);
      await checkSpotifyStatus();
    } catch { setError('Could not disconnect Spotify.'); }
  };

  return (
    <div>
      <CardTitle
        title="Music"
        subtitle="Pick a Spotify playlist. It keeps playing in the mini player while you browse."
        action={spotifyConnected && <button onClick={disconnect} className="btn-ghost btn-sm">Disconnect Spotify</button>}
      />

      {error && <div className="mb-4"><ErrorMsg message={error} /></div>}

      {!spotifyConnected ? (
        <Card className="glow">
          <EmptyState icon={<Headphones size={20} />} title="Connect Spotify"
            subtitle="Bring your playlists into Insightify and play them from any page.">
            <button onClick={connect} className="btn-primary">Connect Spotify</button>
          </EmptyState>
        </Card>
      ) : loadingPlaylists ? (
        <Loader label="Loading your playlists…" />
      ) : playlists.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Music size={20} />}
            title="No playlists found"
            subtitle="Create a playlist in Spotify, or if this is a new account, add it under Users and Management in your Spotify developer dashboard."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {playlists.map((p) => {
            const active = selectedPlaylist?.id === p.id;
            return (
              <button key={p.id} onClick={() => setSelectedPlaylist(p)} aria-pressed={active}
                className={`group rounded-lg border p-2 text-left transition-colors ${active ? 'border-accent/50 bg-accent-soft' : 'border-transparent hover:border-line hover:bg-raised'}`}>
                <div className="relative overflow-hidden rounded-md">
                  {p.images?.[0]?.url ? (
                    <img src={p.images[0].url} alt="" loading="lazy"
                      className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center bg-raised"><Music size={28} className="text-subtle" /></div>
                  )}
                  {active && (
                    <span className="badge badge-accent absolute left-2 top-2 backdrop-blur">
                      <AudioLines size={11} aria-hidden="true" /> Playing
                    </span>
                  )}
                </div>
                <div className="mt-2 truncate px-0.5 text-[13px] font-medium text-fg">{p.name}</div>
                {p.tracks?.total != null && <div className="px-0.5 font-mono text-2xs text-subtle">{p.tracks.total} tracks</div>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
