const timeAgo = (date) => {
  if (!date) return '';
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
};

export default function NewsCard({ article, compact = false }) {
  if (compact) {
    return (
      <a
        href={article.url}
        target="_blank"
        rel="noreferrer"
        className="block px-6 py-4 border-b border-black/[0.05] hover:bg-cream/60 transition-colors last:border-b-0 no-underline group"
      >
        <div className="text-[10px] font-mono text-teal uppercase tracking-[1.5px] mb-1">
          {article.source}
        </div>
        <div className="text-[13px] text-ink2 leading-snug group-hover:text-teal transition-colors">
          {article.title}
        </div>
        <div className="text-[11px] text-ink3 mt-1">{timeAgo(article.publishedAt)}</div>
      </a>
    );
  }

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noreferrer"
      className="block card p-5 hover:-translate-y-1 hover:shadow-md transition-all duration-200 no-underline group"
    >
      {article.urlToImage && (
        <img
          src={article.urlToImage}
          alt={article.title}
          className="w-full h-36 object-cover rounded-xl mb-4"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      )}
      <div className="text-[10px] font-mono text-teal uppercase tracking-[1.5px] mb-2">
        {article.source}
      </div>
      <div className="font-syne font-semibold text-[14px] text-ink leading-snug group-hover:text-teal transition-colors mb-2">
        {article.title}
      </div>
      {article.description && (
        <div className="text-xs text-ink3 leading-relaxed line-clamp-2">{article.description}</div>
      )}
      <div className="text-[11px] text-ink3 mt-3">{timeAgo(article.publishedAt)}</div>
    </a>
  );
}
