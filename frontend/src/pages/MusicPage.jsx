import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { spotifyAPI } from '../services/api';
import { useMusic } from '../context/MusicContext';
import { PageHeader, Card, Loader, EmptyState, ErrorMsg } from '../components/UI';
import { Headphones, Music } from 'lucide-react';

export default function MusicPage() {
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
      <PageHeader title="Music" subtitle="Pick a Spotify playlist. It keeps playing in the mini player while you browse.">
        {spotifyConnected && <button onClick={disconnect} className="btn-ghost">Disconnect Spotify</button>}
      </PageHeader>

      {error && <div className="mb-6"><ErrorMsg message={error} /></div>}

      {!spotifyConnected ? (
        <Card className="mx-auto max-w-lg rounded-xl p-8 text-center sm:p-10">
          <span className="btn-circle mx-auto h-16 w-16"><Headphones size={28} aria-hidden="true" /></span>
          <h2 className="mt-5 text-section">Connect Spotify</h2>
          <p className="mt-2 text-olive">Bring your playlists into Insightify and play them from any page.</p>
          <button onClick={connect} className="btn-primary mt-6">Connect Spotify</button>
        </Card>
      ) : loadingPlaylists ? (
        <Loader label="Loading your playlists…" />
      ) : playlists.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Music size={22} />}
            title="No playlists found"
            subtitle="Create a playlist in Spotify, or if this is a new account, add it under Users and Management in your Spotify developer dashboard."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 3xl:grid-cols-7">
          {playlists.map((p) => {
            const active = selectedPlaylist?.id === p.id;
            return (
              <button key={p.id} onClick={() => setSelectedPlaylist(p)} aria-pressed={active} className="group text-left">
                <div className="relative">
                  {p.images?.[0]?.url ? (
                    <img src={p.images[0].url} alt="" loading="lazy"
                      className={`aspect-square w-full rounded-lg object-cover transition-opacity group-hover:opacity-90 ${active ? 'ring-4 ring-plum ring-offset-2' : ''}`} />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-sand"><Music size={32} className="text-olive" /></div>
                  )}
                  {active && <span className="badge absolute left-3 top-3 bg-white">Playing</span>}
                </div>
                <div className="mt-2 truncate font-semibold">{p.name}</div>
                {p.tracks?.total != null && <div className="text-xs text-olive">{p.tracks.total} tracks</div>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
