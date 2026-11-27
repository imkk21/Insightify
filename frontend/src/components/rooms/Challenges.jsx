import { useState } from 'react';
import { Trophy, Plus, Trash2, Flag } from 'lucide-react';
import { Card, CardTitle, EmptyState, Segmented } from '../UI';
import Leaderboard from './Leaderboard';

export const UNIT = { contributions: 'contribs', activeDays: 'days', streak: 'day streak' };
const METRIC_LABEL = { contributions: 'Contributions', activeDays: 'Active days', streak: 'Longest streak' };
const STATUS_BADGE = { active: 'badge-success', upcoming: 'badge-info', ended: '' };
const ymd = (d) => d.toISOString().slice(0, 10);

const timeLeft = (c, now) => {
  if (c.status === 'ended') return `Ended ${c.endDate}`;
  const to = Date.parse(`${c.status === 'upcoming' ? c.startDate : c.endDate}T${c.status === 'upcoming' ? '00:00:00' : '23:59:59'}Z`);
  const h = Math.max(0, Math.floor((to - now) / 3600000));
  const span = h >= 48 ? `${Math.floor(h / 24)}d` : h >= 1 ? `${h}h` : '<1h';
  return c.status === 'upcoming' ? `Starts in ${span}` : `${span} left`;
};

function CreateChallenge({ act, onDone }) {
  const today = new Date();
  const [f, setF] = useState({
    title: '', metric: 'contributions', target: 20,
    startDate: ymd(today), endDate: ymd(new Date(today.getTime() + 6 * 86400000)),
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => { e.preventDefault(); act('post', 'challenges', { ...f, target: Number(f.target) }).then((ok) => ok && onDone()); };

  return (
    <Card className="glow">
      <CardTitle title="New challenge" icon={<Flag size={15} />} subtitle="Scored from everyone's GitHub contribution calendar." />
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label mb-1.5 block" htmlFor="ch-title">Title</label>
          <input id="ch-title" className="input" placeholder="December commit sprint" value={f.title} onChange={set('title')} maxLength={60} required />
        </div>
        <div className="sm:col-span-2">
          <div className="label mb-1.5">Metric</div>
          <Segmented label="Metric" value={f.metric} onChange={(metric) => setF({ ...f, metric })}
            options={Object.entries(METRIC_LABEL)} />
        </div>
        <div>
          <label className="label mb-1.5 block" htmlFor="ch-start">Start</label>
          <input id="ch-start" type="date" className="input font-mono" value={f.startDate} onChange={set('startDate')} required />
        </div>
        <div>
          <label className="label mb-1.5 block" htmlFor="ch-end">End</label>
          <input id="ch-end" type="date" className="input font-mono" value={f.endDate} min={f.startDate} onChange={set('endDate')} required />
        </div>
        <div>
          <label className="label mb-1.5 block" htmlFor="ch-target">Target ({UNIT[f.metric]})</label>
          <input id="ch-target" type="number" min="1" max="10000" step="1" className="input font-mono" value={f.target} onChange={set('target')} required />
        </div>
        <div className="flex items-end justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>
          <button className="btn-primary">Create</button>
        </div>
      </form>
    </Card>
  );
}

export default function Challenges({ challenges, room, me, now, act }) {
  const [creating, setCreating] = useState(false);
  const isOwner = room.ownerUid === me;

  return (
    <div className="space-y-4">
      {creating
        ? <CreateChallenge act={act} onDone={() => setCreating(false)} />
        : <button className="btn-secondary" onClick={() => setCreating(true)}><Plus size={14} /> New challenge</button>}

      {!challenges.length && !creating && (
        <Card><EmptyState icon={<Trophy size={18} />} title="No challenges yet" subtitle="Race to 50 contributions, keep a 7-day streak, or show up 5 days this week." /></Card>
      )}

      {challenges.map((c) => {
        const done = c.leaderboard.filter((r) => r.completed).length;
        return (
          <Card key={c.id} className={c.status === 'ended' ? 'opacity-80' : ''}>
            <CardTitle title={c.title} icon={<Trophy size={15} />}
              subtitle={`${METRIC_LABEL[c.metric]} · target ${c.target} ${UNIT[c.metric]} · ${c.startDate} → ${c.endDate}`}
              action={(isOwner || c.createdBy === me) && (
                <button className="btn-ghost btn-icon h-7 w-7" aria-label={`Delete challenge ${c.title}`} title="Delete"
                  onClick={() => window.confirm(`Delete “${c.title}”?`) && act('delete', `challenges/${c.id}`)}>
                  <Trash2 size={13} />
                </button>
              )} />
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className={`badge ${STATUS_BADGE[c.status]}`}>{c.status}</span>
              <span className="badge font-mono">{timeLeft(c, now)}</span>
              {done > 0 && <span className="badge badge-success">{done} completed</span>}
            </div>
            <Leaderboard rows={c.leaderboard} target={c.target} unit={UNIT[c.metric]} me={me} />
          </Card>
        );
      })}
    </div>
  );
}
