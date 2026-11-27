import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Download } from 'lucide-react';
import api from '../../services/api';
import SkillGraph from './SkillGraph';
import EvidenceDrawer from './EvidenceDrawer';

/** Read-only "Proof of skill" section for the public profile. Renders nothing if the user has no skill profile. */
export default function PublicSkills({ username }) {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const close = useCallback(() => setSelected(null), []);

  useEffect(() => {
    setData(null);
    api.get(`/skills/public/${encodeURIComponent(username)}`).then(({ data }) => setData(data)).catch(() => {});
  }, [username]);

  if (!data?.categories?.length) return null;
  const dl = data.impact?.totalDownloads || 0;
  return (
    <section aria-labelledby="public-skills-title" className="mt-10">
      <div className="card glow mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="public-skills-title" className="text-lg font-semibold tracking-tight text-fg">Proof of skill</h2>
          <span className="badge badge-success"><ShieldCheck size={11} aria-hidden="true" />
            Verified from {data.stats.commits} commits across {data.stats.repos} repos
          </span>
        </div>
        <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-muted">{data.summary}</p>
        {dl > 0 && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-subtle">
            <Download size={12} aria-hidden="true" /> Code downloaded <span className="font-mono text-fg">{dl.toLocaleString()}</span> times from npm last month
          </p>
        )}
      </div>
      <SkillGraph categories={data.categories} onSelect={setSelected} selected={selected} limit={6} />
      <p className="mt-1 text-2xs text-subtle">Every skill links to the public commits that prove it. Click one to see the code.</p>
      <EvidenceDrawer skill={selected} onClose={close} />
    </section>
  );
}
