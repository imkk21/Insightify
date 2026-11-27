import { useState } from 'react';
import { Headphones, Music2, X } from 'lucide-react';
import { useMusic } from '../../context/MusicContext';
import { Card, CardTitle } from '../UI';

export default function ListenAlong({ room, act }) {
  const { spotifyConnected, playlists, selectedPlaylist, setSelectedPlaylist } = useMusic();
  const [pick, setPick] = useState('');
  const p = room.playlist;
  const setter = room.members.find((m) => m.uid === p?.setBy);
  const listening = p && selectedPlaylist?.id === p.id;

  const share = (e) => {
    e.preventDefault();
    const pl = playlists.find((x) => x.id === pick);
    if (pl) act('put', 'playlist', { id: pl.id, name: pl.name, image: pl.images?.[0]?.url || '' }).then(() => setPick(''));
  };

  return (
    <Card>
      <CardTitle title="Listen along" subtitle="One soundtrack for the room." icon={<Headphones size={15} />}
        action={p && <button className="btn-ghost btn-icon h-7 w-7" aria-label="Clear room playlist" title="Clear" onClick={() => act('put', 'playlist', { playlist: null })}><X size={13} /></button>} />

      {p ? (
        <div className="flex items-center gap-3">
          {p.image
            ? <img src={p.image} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover shadow" />
            : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-raised text-subtle"><Music2 size={18} /></span>}
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-fg">{p.name}</div>
            <div className="text-xs text-subtle">Picked by {setter?.name || 'a former member'}</div>
          </div>
          <button className={listening ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'} disabled={listening}
            onClick={() => setSelectedPlaylist({ id: p.id, name: p.name, images: p.image ? [{ url: p.image }] : [] })}>
            {listening ? 'Playing' : 'Listen along'}
          </button>
        </div>
      ) : (
        <p className="text-[13px] text-subtle">No room playlist yet.</p>
      )}

      {spotifyConnected && playlists.length > 0 ? (
        <form onSubmit={share} className="mt-4 flex gap-2 border-t border-line pt-4">
          <label className="sr-only" htmlFor="room-playlist">Your playlists</label>
          <select id="room-playlist" className="input h-8" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">{p ? 'Change to one of yours…' : 'Share one of your playlists…'}</option>
            {playlists.map((pl) => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
          </select>
          <button className="btn-secondary btn-sm h-8" disabled={!pick}>Set</button>
        </form>
      ) : !spotifyConnected && (
        <p className="mt-3 text-xs text-subtle">Connect Spotify on the Focus page to share your playlists.</p>
      )}
    </Card>
  );
}
