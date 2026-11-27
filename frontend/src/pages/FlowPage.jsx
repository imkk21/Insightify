import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { PageHeader, Card, CardTitle, Progress, ScoreRing, Skeleton, ErrorMsg, EmptyState, RefreshButton } from '../components/UI';
import { BarChart, WEEKDAYS, hourLabel } from '../components/Charts';
import Markdown from '../components/Markdown';
import TrendChart from '../components/flow/TrendChart';
import FlowPlaylist from '../components/flow/FlowPlaylist';
import { Activity, AlertTriangle, Clock, GitBranch, HeartPulse, Lightbulb, ShieldCheck, Sparkles, Watch } from 'lucide-react';

const tz = -new Date().getTimezoneOffset();

const tier = (s) => (s >= 75 ? ['success', '#3dd68c', 'In the zone']
  : s >= 50 ? ['accent', '#7c5cff', 'Steady'] : s >= 30 ? ['warning', '#f5a524', 'Scattered'] : ['danger', '#f2555a', 'Off rhythm']);

const RISK = {
  low: { badge: 'badge-success', icon: ShieldCheck, label: 'Low risk', blurb: 'Nothing unusual compared with your last six weeks.' },
  elevated: { badge: 'badge-warning', icon: AlertTriangle, label: 'Elevated', blurb: 'A few patterns drifted from your baseline.' },
  high: { badge: 'badge-danger', icon: AlertTriangle, label: 'High', blurb: 'Several strain signals at once. Worth a pause.' },
};

const subRows = (s, d, focus) => [
  ['Consistency', s.consistency, `${d.activeDays} of ${d.days || 7} days active`, '30%'],
  ['Deep work', s.deepWork, `${d.blocks} block${d.blocks === 1 ? '' : 's'} of 3+ commits within 3h`, '30%'],
  ['Rhythm', s.rhythm, d.commits ? `${d.peakPct}% of commits in your ${focus} window` : 'No commits sampled this week', '20%'],
  ['Recovery', s.recovery, `${d.lateNightPct}% late-night · ${d.restDay ? 'took a rest day' : 'no rest day'}`, '20%'],
];

function Hero({ data }) {
  const [tone, hex, word] = tier(data.score);
  const focus = data.patterns.focusWindow.label;
  return (
    <Card className="glow mb-4 p-6">
      <div className="grid gap-8 lg:grid-cols-[auto_1fr_1fr] lg:items-center">
        <div className="flex items-center gap-5">
          <ScoreRing value={data.score} size={148} label="of 100" tone={hex} />
          <div>
            <div className="label">Flow · last 7 days</div>
            <div className="mt-1 text-xl font-semibold tracking-tight">{word}</div>
            <span className={`badge badge-${tone} mt-2`}>{data.details.commits} commits sampled</span>
          </div>
        </div>
        <div className="min-w-0 text-[13px] leading-6 text-muted">
          <div className="label mb-2 flex items-center gap-1.5"><Sparkles size={12} aria-hidden="true" /> Coach note</div>
          <Markdown text={data.note?.text || ''} />
        </div>
        <ul className="space-y-3.5" aria-label="Sub-scores">
          {subRows(data.subscores, data.details, focus).map(([name, v, hint, weight]) => (
            <li key={name}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                <span className="text-fg">{name} <span className="font-mono text-2xs text-subtle">×{weight}</span></span>
                <span className="font-mono text-xs text-muted">{v}</span>
              </div>
              <Progress value={v} tone={tier(v)[0]} />
              <div className="mt-1 text-2xs text-subtle">{hint}</div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function Burnout({ burnout }) {
  const r = RISK[burnout.risk];
  const Icon = r.icon;
  return (
    <Card>
      <CardTitle icon={<HeartPulse size={15} />} title="Burnout early warning" subtitle="Last 14 days vs your prior 6 weeks"
        action={<span className={`badge ${r.badge}`}><Icon size={11} aria-hidden="true" /> {r.label}</span>} />
      <p className="mb-4 text-[13px] text-muted">{r.blurb}</p>
      {burnout.signals.length > 0 && (
        <ul className="mb-5 space-y-2">
          {burnout.signals.map((s) => (
            <li key={s.id} className="flex gap-2.5 rounded-md border border-line bg-raised px-3 py-2 text-[13px] text-fg">
              <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${burnout.risk === 'high' ? 'bg-danger' : 'bg-warning'}`} aria-hidden="true" />
              {s.text}
            </li>
          ))}
        </ul>
      )}
      <div className="label mb-2 flex items-center gap-1.5"><Lightbulb size={12} aria-hidden="true" /> Try this</div>
      <ul className="space-y-1.5 text-[13px] text-muted">
        {burnout.suggestions.map((s) => <li key={s} className="flex gap-2"><span className="text-accent-hover" aria-hidden="true">→</span>{s}</li>)}
      </ul>
    </Card>
  );
}

function Patterns({ p }) {
  const peakHour = p.hours.indexOf(Math.max(...p.hours));
  const peakDay = p.weekdays.indexOf(Math.max(...p.weekdays));
  return (
    <Card>
      <CardTitle icon={<Clock size={15} />} title="Patterns" subtitle={`Your local time · last ${p.sample} commits`} />
      {p.sample ? (
        <>
          <div className="mb-5 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3">
            <div className="label text-accent-hover">Best focus window</div>
            <div className="mt-0.5 text-[13px] text-fg">
              You ship most between <span className="font-mono font-semibold">{p.focusWindow.label}</span>
              <span className="text-muted"> · {Math.round(p.focusWindow.share * 100)}% of commits</span>
            </div>
          </div>
          <div className="label mb-2">Hour of day</div>
          <BarChart values={p.hours} labels={p.hours.map((_, h) => hourLabel(h))} labelEvery={3} highlight={peakHour} height="h-24" />
          <div className="label mb-2 mt-5">Weekday</div>
          <BarChart values={p.weekdays} labels={WEEKDAYS} highlight={peakDay} height="h-16" />
        </>
      ) : <p className="text-[13px] text-subtle">No recent commits to chart yet.</p>}
      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="text-muted">Weekdays <span className="font-mono text-fg">{100 - p.weekendPct}%</span></span>
          <span className="text-muted">Weekends <span className="font-mono text-fg">{p.weekendPct}%</span></span>
        </div>
        <div className="flex h-1.5 overflow-hidden rounded-full bg-raised" role="img" aria-label={`${p.weekendPct}% of contributions on weekends`}>
          <div className="bg-accent" style={{ width: `${100 - p.weekendPct}%` }} />
          <div className="bg-info" style={{ width: `${p.weekendPct}%` }} />
        </div>
        <div className="mt-1 text-2xs text-subtle">Share of this year's contributions · an even spread would be ~29% weekends</div>
      </div>
    </Card>
  );
}

const Wearables = () => (
  <Card className="glow">
    <CardTitle icon={<Watch size={15} />} title="Recovery from wearables" action={<span className="badge">Coming soon</span>} />
    <p className="text-[13px] text-muted">Blend sleep and HRV into your recovery score, so flow is weighed against how rested you actually are.</p>
    <div className="mt-4 flex flex-wrap gap-2">
      {['Oura', 'WHOOP', 'Google Fit'].map((n) => <button key={n} className="btn-secondary btn-sm" disabled>Connect {n}</button>)}
    </div>
  </Card>
);

export default function FlowPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.get('/flow', { params: { tz } })
      .then(({ data }) => setData(data))
      .catch((e) => setError(e.response?.data?.error || 'Could not load your flow.'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const noGithub = !data && /GitHub/i.test(error);

  return (
    <div>
      <PageHeader eyebrow="Wellbeing" title="Flow & wellbeing"
        subtitle="How deep, steady and sustainable your week looks, read from when you commit.">
        <RefreshButton onClick={load} loading={loading} />
      </PageHeader>

      {noGithub ? (
        <Card className="glow">
          <EmptyState icon={<GitBranch size={20} />} title="Connect GitHub to see your flow" subtitle="Your flow score is built from commit timing and your contribution calendar.">
            <Link to="/activity" className="btn-primary">Connect GitHub</Link>
          </EmptyState>
        </Card>
      ) : error && !data ? <ErrorMsg message={error} /> : !data ? (
        <>
          <Skeleton className="mb-4 h-48" />
          <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-64 lg:col-span-2" /><Skeleton className="h-64" /></div>
        </>
      ) : (
        <>
          {error && <div className="mb-4"><ErrorMsg message={error} /></div>}
          <Hero data={data} />
          <div className="mb-4 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardTitle icon={<Activity size={15} />} title="8-week trend"
                subtitle="Weekly flow score · hollow points are estimated from your calendar only (older than the commit sample)" />
              <TrendChart weeks={data.weekly} />
            </Card>
            <Burnout burnout={data.burnout} />
          </div>
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Patterns p={data.patterns} />
            <div className="space-y-4">
              <FlowPlaylist />
              <Wearables />
            </div>
          </div>
          <p className="text-center text-2xs text-subtle">
            Heuristics from commit timestamps, not medical advice. Commits are only part of your work: reviews, meetings and thinking don't show up here.
          </p>
        </>
      )}
    </div>
  );
}
