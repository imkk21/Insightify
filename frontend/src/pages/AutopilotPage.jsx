import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { PageHeader, Card, Segmented } from '../components/UI';
import FixesTab from '../components/autopilot/FixesTab';
import IncidentTab from '../components/autopilot/IncidentTab';
import ChoresTab from '../components/autopilot/ChoresTab';
import HistoryTab from '../components/autopilot/HistoryTab';
import { X, ShieldCheck } from 'lucide-react';

const TABS = [['fixes', 'Fixes'], ['incident', 'Incident'], ['chores', 'Chores'], ['history', 'History']];

function AppStatus({ status, onSetup }) {
  if (!status) return <span className="badge h-7 px-2.5 text-xs">Checking GitHub App…</span>;
  return status.appConfigured ? (
    <span className="badge badge-success h-7 gap-2 px-2.5 text-xs">
      <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_#3dd68c]" aria-hidden="true" /> GitHub App connected
    </span>
  ) : (
    <>
      <span className="badge badge-warning h-7 gap-2 px-2.5 text-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" /> GitHub App not configured
      </span>
      <button type="button" onClick={onSetup} className="btn-secondary btn-sm">How to enable</button>
    </>
  );
}

function SetupCard({ steps, onClose }) {
  return (
    <Card className="glow mb-6 animate-fade-in">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-semibold">Enable fix PRs with a GitHub App</h2>
          <p className="mt-0.5 text-xs text-subtle">
            Autopilot writes to repositories only through an app you install and can revoke at any time. Plans, patches and commands work without it.
          </p>
        </div>
        <button type="button" onClick={onClose} className="btn-ghost btn-icon h-7 w-7" aria-label="Close setup steps"><X size={14} /></button>
      </div>
      <ol className="space-y-2.5">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-3 text-[13px] text-muted">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent-soft font-mono text-2xs text-accent-hover">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export default function AutopilotPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([v]) => v === params.get('tab')) ? params.get('tab') : 'fixes';
  const [status, setStatus] = useState(null);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    api.get('/autopilot/status').then(({ data }) => setStatus(data)).catch(() => setStatus({ appConfigured: false, setup: [] }));
  }, []);

  return (
    <div>
      <PageHeader eyebrow="Engineering" title="Autopilot"
        subtitle="Fixes problems instead of reporting them. Nothing touches your repositories without your explicit approval.">
        <AppStatus status={status} onSetup={() => setShowSetup((s) => !s)} />
      </PageHeader>

      {showSetup && status?.setup?.length > 0 && <SetupCard steps={status.setup} onClose={() => setShowSetup(false)} />}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Autopilot section" options={TABS} value={tab} onChange={(v) => setParams(v === 'fixes' ? {} : { tab: v }, { replace: true })} />
        <span className="hidden items-center gap-1.5 text-2xs text-subtle sm:flex">
          <ShieldCheck size={12} aria-hidden="true" /> Every write action asks for approval and is logged in History
        </span>
      </div>

      {tab === 'fixes' && <FixesTab appConfigured={!!status?.appConfigured} onSetup={() => setShowSetup(true)} />}
      {tab === 'incident' && <IncidentTab />}
      {tab === 'chores' && <ChoresTab />}
      {tab === 'history' && <HistoryTab />}
    </div>
  );
}
