// Small hand-rolled charts in accent tints (no chart library needed).

const CELL = 11;
const GAP = 3;
const TINTS = ['rgba(255,255,255,0.05)', 'rgba(124,92,255,0.3)', 'rgba(124,92,255,0.55)', 'rgba(124,92,255,0.8)', '#9d85ff'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Quartiles of the non-zero days (like GitHub), so one huge day doesn't wash everything out
export const levels = (days) => {
  const nz = days.map((d) => d.count).filter(Boolean).sort((a, b) => a - b);
  const q = (p) => nz[Math.floor((nz.length - 1) * p)] ?? 0;
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  return (c) => (c === 0 ? 0 : c <= q1 ? 1 : c <= q2 ? 2 : c <= q3 ? 3 : 4);
};

/** GitHub-style calendar. `days` = [{date:'YYYY-MM-DD', count}] ascending; `weeks` limits to the last N columns.
 *  `maxScale` caps how far the SVG grows (0 = fill the container). */
export const ContributionCalendar = ({ days = [], weeks, maxScale = 1.6 }) => {
  const level = levels(days);
  let cols = [];
  for (const d of days) {
    const weekday = new Date(`${d.date}T00:00:00Z`).getUTCDay();
    if (weekday === 0 || cols.length === 0) cols.push([]);
    cols[cols.length - 1][weekday] = d;
  }
  if (weeks) cols = cols.slice(-weeks);

  const labelH = 16;
  const width = cols.length * (CELL + GAP);
  const height = labelH + 7 * (CELL + GAP);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" style={{ maxWidth: maxScale ? width * maxScale : undefined }} role="img"
      aria-label={`${days.reduce((s, d) => s + d.count, 0)} contributions`}>
      {cols.map((col, x) => {
        const first = col.find(Boolean);
        // Label a column when its week starts a month; skip if the previous label is too close
        const newMonth = first && new Date(first.date).getUTCDate() <= 7 && x >= 2;
        return (
          <g key={x} transform={`translate(${x * (CELL + GAP)}, 0)`}>
            {newMonth && x < cols.length - 1 && (
              <text y="10" fontSize="9" fill="#71717a">{MONTHS[new Date(first.date).getUTCMonth()]}</text>
            )}
            {col.map((d, y) => d && (
              <rect key={d.date} y={labelH + y * (CELL + GAP)} width={CELL} height={CELL} rx="2"
                fill={TINTS[level(d.count)]}>
                <title>{`${d.count} contribution${d.count === 1 ? '' : 's'} on ${d.date}`}</title>
              </rect>
            ))}
          </g>
        );
      })}
    </svg>
  );
};

/** Vertical bars; `values` numbers, `labels` shown under every `labelEvery`-th bar. */
export const BarChart = ({ values, labels, labelEvery = 1, highlight, height = 'h-28' }) => {
  const max = Math.max(1, ...values);
  return (
    <div>
      <div className={`flex items-end gap-1 ${height}`}>
        {values.map((v, i) => (
          <div key={i} className="flex h-full flex-1 items-end" title={`${labels[i]}: ${v}`}>
            <div className={`w-full rounded-t-[3px] ${i === highlight ? 'bg-accent shadow-glow' : 'bg-line-strong'}`}
              style={{ height: `${Math.max(v ? 6 : 2, (v / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1 font-mono text-[10px] text-subtle">
        {labels.map((l, i) => <span key={i} className="flex-1 text-center">{i % labelEvery === 0 ? l : ''}</span>)}
      </div>
    </div>
  );
};

const hourLabel = (h) => (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`);

/** Commit timing in the viewer's local time zone. */
export const codingPatterns = (commits = []) => {
  const hours = Array(24).fill(0);
  const weekdays = Array(7).fill(0);
  for (const c of commits) {
    const d = new Date(c.date);
    hours[d.getHours()]++;
    weekdays[d.getDay()]++;
  }
  const peakHour = hours.indexOf(Math.max(...hours));
  const peakDay = weekdays.indexOf(Math.max(...weekdays));
  return { hours, weekdays, peakHour, peakDay, hourLabels: hours.map((_, h) => hourLabel(h)) };
};

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export { hourLabel };
