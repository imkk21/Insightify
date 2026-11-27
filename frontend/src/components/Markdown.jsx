// Minimal Markdown for reports: "#" headings, "- " bullets, **bold**, [text](https://…) links.
// Text is rendered as React children (escaped); only http(s) links become anchors.

const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;

const inline = (text) =>
  text.split(INLINE).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold text-fg">{part.slice(2, -2)}</strong>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (link) return <a key={i} href={link[2]} target="_blank" rel="noreferrer" className="link">{link[1]}</a>;
    return part;
  });

export default function Markdown({ text = '' }) {
  const blocks = [];
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const heading = line.match(/^#{1,6}\s+(.*)/);
    const bullet = line.match(/^\s*[-*•]\s+(.*)/);
    if (heading) blocks.push({ type: 'h', text: heading[1] });
    else if (bullet) {
      const last = blocks[blocks.length - 1];
      if (last?.type === 'ul') last.items.push(bullet[1]);
      else blocks.push({ type: 'ul', items: [bullet[1]] });
    } else blocks.push({ type: 'p', text: line });
  }

  return (
    <div className="space-y-3 text-[13px] leading-6 text-muted">
      {blocks.map((b, i) =>
        b.type === 'h' ? <h3 key={i} className="pt-2 text-sm font-semibold text-fg first:pt-0">{inline(b.text)}</h3>
        : b.type === 'ul' ? (
          <ul key={i} className="list-disc space-y-1 pl-5 marker:text-subtle">
            {b.items.map((item, j) => <li key={j}>{inline(item)}</li>)}
          </ul>
        ) : <p key={i}>{inline(b.text)}</p>
      )}
    </div>
  );
}
