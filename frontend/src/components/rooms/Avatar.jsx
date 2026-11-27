import { initials } from '../../utils';

// Literal class names so Tailwind keeps them.
const RING = {
  online:   'ring-2 ring-success ring-offset-2 ring-offset-surface',
  focusing: 'ring-2 ring-accent ring-offset-2 ring-offset-surface shadow-glow',
  offline:  'ring-1 ring-line-strong opacity-60 grayscale',
};
const DOT = { online: 'bg-success', focusing: 'bg-accent motion-safe:animate-pulse' };
export const PRESENCE_LABEL = { online: 'Online', focusing: 'Focusing', offline: 'Offline' };

/** Round avatar with an optional presence ring + dot. */
export default function Avatar({ member, size = 32, presence, className = '' }) {
  const px = { width: size, height: size };
  return (
    <span className={`relative inline-flex shrink-0 ${className}`} style={px}>
      <span className={`inline-flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-overlay font-medium text-muted ${presence ? RING[presence] : 'ring-1 ring-line'}`}
        style={{ fontSize: Math.max(10, size * 0.36) }}>
        {member?.photoURL
          ? <img src={member.photoURL} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          : initials(member?.name)}
      </span>
      {presence && DOT[presence] && (
        <span aria-hidden="true" className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-surface ${DOT[presence]}`}
          style={{ width: Math.max(9, size * 0.3), height: Math.max(9, size * 0.3) }} />
      )}
    </span>
  );
}

export const AvatarStack = ({ members, total = members.length, max = 5, size = 26 }) => {
  const more = total - Math.min(max, members.length);
  return (
  <div className="flex items-center">
    <div className="flex -space-x-2">
      {members.slice(0, max).map((m) => (
        <span key={m.uid} title={`${m.name} · ${PRESENCE_LABEL[m.presence] || ''}`} className="rounded-full ring-2 ring-surface">
          <Avatar member={m} size={size} />
        </span>
      ))}
    </div>
    {more > 0 && <span className="ml-2 font-mono text-2xs text-subtle">+{more}</span>}
  </div>
  );
};
