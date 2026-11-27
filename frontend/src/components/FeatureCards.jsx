import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Waves, Bot, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { Card, CardTitle, ScoreRing, Skeleton } from './UI';
import BriefingMini from './briefing/BriefingMini';

const RISK = { low: ['badge-success', 'Low burnout risk'], elevated: ['badge-warning', 'Elevated burnout risk'], high: ['badge-danger', 'High burnout risk'] };
const scoreTone = (s) => (s >= 70 ? '#3dd68c' : s >= 45 ? '#7c5cff' : '#f5a524');

function FlowMini() {
  const [flow, setFlow] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    api.get('/flow', { params: { tz: -new Date().getTimezoneOffset() } })
      .then(({ data }) => setFlow(data)).catch(() => setFailed(true));
  }, []);
  if (failed) return null;
  if (!flow) return <Skeleton className="h-40" />;
  const [badge, label] = RISK[flow.burnout?.risk] || RISK.low;
  return (
    <Link to="/flow" className="card card-hover glow flex items-center gap-5">
      <ScoreRing value={flow.score} size={96} label="flow" tone={scoreTone(flow.score)} />
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[13px] font-semibold"><Waves size={15} className="text-subtle" aria-hidden="true" /> Flow this week</div>
        <span className={`badge ${badge} mt-2`}>{label}</span>
        {flow.burnout?.signals?.[0] && <p className="mt-2 line-clamp-2 text-xs text-subtle">{flow.burnout.signals[0].text ?? flow.burnout.signals[0]}</p>}
      </div>
    </Link>
  );
}

function AutopilotMini({ urgent }) {
  return (
    <Card className="flex flex-col">
      <CardTitle title="Autopilot" icon={<Bot size={15} />} subtitle="Fixes prepared from your security scan" />
      <p className="text-[13px] text-muted">
        {urgent ? <><span className="font-mono text-danger">{urgent}</span> critical or high-severity packages have upgrade plans ready.</> : 'No urgent fixes right now. Autopilot also triages incidents and chores.'}
      </p>
      <Link to="/autopilot" className="btn-secondary btn-sm mt-auto self-start">Review fixes <ArrowRight size={14} aria-hidden="true" /></Link>
    </Card>
  );
}

/** Row of new-feature cards on Today: flow, morning briefing, autopilot. */
export default function FeatureCards({ urgent }) {
  return (
    <div className="mb-4 grid items-stretch gap-4 lg:grid-cols-3">
      <FlowMini />
      <BriefingMini />
      <AutopilotMini urgent={urgent} />
    </div>
  );
}
