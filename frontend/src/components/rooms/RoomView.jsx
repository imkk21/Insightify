import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Link2, Check, LogOut, Trash2, X, BarChart3, Users } from 'lucide-react';
import api from '../../services/api';
import { timeAgo } from '../../utils';
import { Card, CardTitle, ErrorMsg, Segmented, Skeleton } from '../UI';
import Avatar, { PRESENCE_LABEL } from './Avatar';
import FocusTimer, { useNow } from './FocusTimer';
import ListenAlong from './ListenAlong';
import ActivityFeed from './ActivityFeed';
import Challenges from './Challenges';
import Leaderboard from './Leaderboard';
import { TILE } from './RoomList';

// ponytail: HTTP polling instead of websockets (Render free tier). Heartbeat doubles as the presence poll.
const HEARTBEAT_MS = 15000;
const FULL_REFRESH_MS = 60000;
const errOf = (e) => e.response?.data?.error || e.message;

function PresenceStrip({ room, me, now, act }) {
  const mine = room.members.find((m) => m.uid === me);
  const [status, setStatus] = useState(mine?.status || '');
  const isOwner = room.ownerUid === me;
  const order = { focusing: 0, online: 1, offline: 2 };
  const members = [...room.members].sort((a, b) => order[a.presence] - order[b.presence] || a.name.localeCompare(b.name));

  const detail = (m) => {
    if (m.presence === 'focusing') return `Focusing · ${Math.max(1, Math.ceil((new Date(m.focusUntil) - now) / 60000))}m left`;
    if (m.presence === 'online') return 'Online';
    return m.lastSeen ? `Last seen ${timeAgo(m.lastSeen)}` : 'Not seen yet';
  };

  return (
    <Card>
      <CardTitle title="Who's here" icon={<Users size={15} />}
        subtitle={`${room.members.filter((m) => m.presence !== 'offline').length} of ${room.members.length} online`} />
      <ul className="grid gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
        {members.map((m) => (
          <li key={m.uid} className="group flex min-w-0 items-center gap-3">
            <Avatar member={m} size={36} presence={m.presence} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[13px]">
                <span className="truncate font-medium text-fg">{m.name}</span>
                {m.uid === room.ownerUid && <span className="badge">owner</span>}
                <span className="sr-only">{PRESENCE_LABEL[m.presence]}</span>
              </div>
              <div className={`truncate text-xs ${m.presence === 'focusing' ? 'text-accent-hover' : m.presence === 'online' ? 'text-success' : 'text-subtle'}`}>
                {m.status ? <span className="text-muted">“{m.status}”</span> : detail(m)}
              </div>
              {m.status && <div className="truncate text-2xs text-subtle">{detail(m)}</div>}
            </div>
            {isOwner && m.uid !== me && (
              <button className="btn-ghost btn-icon h-7 w-7 opacity-0 focus:opacity-100 group-hover:opacity-100" aria-label={`Remove ${m.name}`} title="Remove from room"
                onClick={() => window.confirm(`Remove ${m.name} from the room?`) && act('delete', `members/${m.uid}`)}>
                <X size={13} />
              </button>
            )}
          </li>
        ))}
      </ul>
      <form className="mt-5 flex gap-2 border-t border-line pt-4"
        onSubmit={(e) => { e.preventDefault(); act('post', 'heartbeat', { status }); }}>
        <label className="sr-only" htmlFor="my-status">Your status</label>
        <input id="my-status" className="input h-8" placeholder="What are you working on?" value={status} maxLength={80}
          onChange={(e) => setStatus(e.target.value)} />
        <button className="btn-secondary btn-sm h-8" disabled={status === (mine?.status || '')}>Set status</button>
      </form>
    </Card>
  );
}

export default function RoomView({ code, onBack, onLeft }) {
  const [data, setData] = useState(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('activity');
  const [copied, setCopied] = useState(false);
  const now = useNow(offset, 15000);
  const alive = useRef(true);

  const sync = (d) => setOffset(d.serverNow - Date.now());

  const load = useCallback(async () => {
    try {
      const { data: d } = await api.get(`/rooms/${code}`);
      if (!alive.current) return;
      setData(d); sync(d); setError('');
    } catch (e) {
      if (e.response?.status === 404) return onLeft('That room no longer exists or you were removed.');
      setError(errOf(e));
    }
  }, [code, onLeft]);

  const beat = useCallback(async () => {
    try {
      const { data: d } = await api.post(`/rooms/${code}/heartbeat`, {});
      if (!alive.current) return;
      setData((cur) => cur && { ...cur, room: d.room }); sync(d);
    } catch (e) {
      if (e.response?.status === 404) onLeft('You are no longer a member of that room.');
    }
  }, [code, onLeft]);

  useEffect(() => {
    alive.current = true;
    setData(null);
    load().then(beat);
    const hb = setInterval(beat, HEARTBEAT_MS);
    const full = setInterval(load, FULL_REFRESH_MS);
    return () => { alive.current = false; clearInterval(hb); clearInterval(full); };
  }, [load, beat]);

  /** Mutations: call, then reload everything. Resolves true on success. */
  const act = async (method, path, body) => {
    try {
      const url = `/rooms/${code}/${path}`;
      await (method === 'delete' ? api.delete(url) : api[method](url, body));
      await load();
      return true;
    } catch (e) { setError(errOf(e)); return false; }
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/rooms?join=${code}`);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch { setError('Could not copy — share the code instead.'); }
  };

  const leave = async () => {
    if (!window.confirm('Leave this room?')) return;
    try { await api.post(`/rooms/${code}/leave`); onLeft(); } catch (e) { setError(errOf(e)); }
  };
  const destroy = async () => {
    if (!window.confirm('Delete this room for everyone? Challenges and kudos go too.')) return;
    try { await api.delete(`/rooms/${code}`); onLeft(); } catch (e) { setError(errOf(e)); }
  };

  if (!data) {
    return (
      <div className="space-y-4">
        {error ? <ErrorMsg message={error} /> : <><Skeleton className="h-16" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-56" /><Skeleton className="h-56" /></div></>}
      </div>
    );
  }

  const { room, me, feed, challenges, weekly } = data;
  const isOwner = room.ownerUid === me;

  return (
    <div className="space-y-6 motion-safe:animate-fade-in">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button className="btn-ghost btn-icon" onClick={onBack} aria-label="Back to my rooms"><ArrowLeft size={16} /></button>
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-2xl ${TILE[room.color] || TILE.accent}`}>{room.emoji}</span>
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-semibold leading-tight tracking-tight text-gradient">{room.name}</h1>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-subtle">
              <span className="font-mono">{room.members.length}</span> members · invite code <span className="kbd tracking-widest">{code}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={copyInvite} aria-live="polite">
            {copied ? <><Check size={14} className="text-success" /> Link copied</> : <><Link2 size={14} /> Copy invite link</>}
          </button>
          <button className="btn-ghost" onClick={leave}><LogOut size={14} /> Leave</button>
          {isOwner && <button className="btn-danger" onClick={destroy}><Trash2 size={14} /> Delete</button>}
        </div>
      </header>

      {error && <ErrorMsg message={error} />}

      <PresenceStrip key={me} room={room} me={me} now={now} act={act} />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <FocusTimer room={room} me={me} offset={offset} act={act} />
        <ListenAlong room={room} act={act} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="min-w-0 space-y-4">
          <Segmented label="Room view" value={tab} onChange={setTab}
            options={[['activity', 'Activity'], ['challenges', `Challenges${challenges.length ? ` · ${challenges.length}` : ''}`]]} />
          {tab === 'activity'
            ? <ActivityFeed code={code} feed={feed} me={me} />
            : <Challenges challenges={challenges} room={room} me={me} now={now} act={act} />}
        </section>
        <aside>
          <Card className="lg:sticky lg:top-20">
            <CardTitle title="This week" icon={<BarChart3 size={15} />} subtitle={`Contributions since Monday (${weekly.start})`} />
            <Leaderboard rows={weekly.leaderboard} unit="" me={me} />
          </Card>
        </aside>
      </div>
    </div>
  );
}
