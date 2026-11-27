import { useState } from 'react';
import { Plus, LogIn, Users, Timer, Crown } from 'lucide-react';
import api from '../../services/api';
import { Card, CardTitle, EmptyState, ErrorMsg, Skeleton } from '../UI';
import { AvatarStack } from './Avatar';

export const EMOJIS = ['🚀', '🔥', '⚡', '🧠', '🛠️', '🎧', '🌙', '☕', '🐙', '🦄', '🌱', '🎯'];
export const TILE = {
  accent: 'bg-accent-soft border-accent/30',
  success: 'bg-success-soft border-success/30',
  warning: 'bg-warning-soft border-warning/30',
  info: 'bg-info-soft border-info/30',
  danger: 'bg-danger-soft border-danger/30',
};
const SWATCH = { accent: 'bg-accent', success: 'bg-success', warning: 'bg-warning', info: 'bg-info', danger: 'bg-danger' };
const errOf = (e) => e.response?.data?.error || e.message;

function CreateRoom({ onOpen }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [color, setColor] = useState('accent');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/rooms', { name, emoji, color });
      onOpen(data.code);
    } catch (err) { setError(errOf(err)); } finally { setBusy(false); }
  };

  return (
    <Card className="glow">
      <CardTitle title="Create a room" subtitle="A space to code alongside friends." icon={<Plus size={15} />} />
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-2">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-lg ${TILE[color]}`} aria-hidden="true">{emoji}</span>
          <label className="sr-only" htmlFor="room-name">Room name</label>
          <input id="room-name" className="input" placeholder="Night owls, Hack club…" value={name}
            onChange={(e) => setName(e.target.value)} maxLength={40} required />
        </div>
        <fieldset>
          <legend className="label mb-2">Emoji</legend>
          <div className="flex flex-wrap gap-1">
            {EMOJIS.map((em) => (
              <button type="button" key={em} onClick={() => setEmoji(em)} aria-pressed={emoji === em} aria-label={`Emoji ${em}`}
                className={`h-8 w-8 rounded-md text-base transition-colors ${emoji === em ? 'bg-overlay ring-1 ring-accent' : 'hover:bg-raised'}`}>
                {em}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="label mb-2">Color</legend>
          <div className="flex gap-2">
            {Object.keys(SWATCH).map((c) => (
              <button type="button" key={c} onClick={() => setColor(c)} aria-pressed={color === c} aria-label={`Color ${c}`}
                className={`h-6 w-6 rounded-full ${SWATCH[c]} transition-transform ${color === c ? 'scale-110 ring-2 ring-fg ring-offset-2 ring-offset-surface' : 'opacity-70 hover:opacity-100'}`} />
            ))}
          </div>
        </fieldset>
        {error && <ErrorMsg message={error} />}
        <button className="btn-primary w-full" disabled={busy || !name.trim()}>{busy ? 'Creating…' : 'Create room'}</button>
      </form>
    </Card>
  );
}

function JoinRoom({ onOpen }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/rooms/join', { code });
      onOpen(data.code);
    } catch (err) { setError(errOf(err)); } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardTitle title="Join with a code" subtitle="Got an invite? Paste the 8-character code." icon={<LogIn size={15} />} />
      <form onSubmit={submit} className="flex gap-2">
        <label className="sr-only" htmlFor="join-code">Invite code</label>
        <input id="join-code" className="input font-mono uppercase tracking-[0.2em]" placeholder="ABCD2345" value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} maxLength={8} autoComplete="off" />
        <button className="btn-secondary" disabled={busy || code.length !== 8}>{busy ? 'Joining…' : 'Join'}</button>
      </form>
      {error && <div className="mt-3"><ErrorMsg message={error} /></div>}
    </Card>
  );
}

function RoomCard({ room, onOpen }) {
  return (
    <button onClick={() => onOpen(room.code)} className="card card-hover group flex w-full flex-col gap-4 text-left motion-safe:animate-fade-in">
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-xl ${TILE[room.color] || TILE.accent}`}>{room.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium text-fg">{room.name}</span>
            {room.isOwner && <Crown size={12} className="shrink-0 text-subtle" aria-label="You own this room" />}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-subtle">
            <Users size={12} /> <span className="font-mono">{room.memberCount}</span> member{room.memberCount === 1 ? '' : 's'}
          </div>
        </div>
        {room.timerActive && <span className="badge badge-accent"><Timer size={11} /> Live</span>}
      </div>
      <div className="flex items-center justify-between">
        <AvatarStack members={room.members} total={room.memberCount} />
        <span className={`inline-flex items-center gap-1.5 text-xs ${room.onlineCount ? 'text-success' : 'text-subtle'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${room.onlineCount ? 'bg-success motion-safe:animate-pulse' : 'bg-subtle'}`} />
          <span className="font-mono">{room.onlineCount}</span> online
        </span>
      </div>
    </button>
  );
}

export default function RoomList({ rooms, loading, onOpen }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section aria-label="My rooms">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[132px]" />)}</div>
        ) : rooms.length ? (
          <div className="grid gap-4 sm:grid-cols-2">{rooms.map((r) => <RoomCard key={r.code} room={r} onOpen={onOpen} />)}</div>
        ) : (
          <Card>
            <EmptyState icon={<Users size={18} />} title="No rooms yet"
              subtitle="Create a room, share the invite link, and see who's shipping — live focus sessions, kudos and challenges." />
          </Card>
        )}
      </section>
      <aside className="space-y-4">
        <CreateRoom onOpen={onOpen} />
        <JoinRoom onOpen={onOpen} />
      </aside>
    </div>
  );
}
