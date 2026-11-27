import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { timeAgo } from '../utils';

const Meta = ({ article }) => (
  <div className="flex items-center gap-1.5 font-mono text-2xs text-subtle">
    <span className="truncate text-muted">{article.source}</span>
    <span aria-hidden="true">·</span>
    <span className="shrink-0">{timeAgo(article.publishedAt)}</span>
  </div>
);

// Image-first card: the photo keeps its natural height, which is what makes the masonry work.
// `compact` is a small thumbnail row for supporting spots like the Today page.
export default function NewsCard({ article, compact = false }) {
  const [imageOk, setImageOk] = useState(!!article.urlToImage);

  if (compact) {
    return (
      <a href={article.url} target="_blank" rel="noreferrer"
        className="group -mx-2 flex gap-3 rounded-md p-2 transition-colors hover:bg-raised">
        {imageOk && (
          <img src={article.urlToImage} alt="" loading="lazy" onError={() => setImageOk(false)}
            className="h-14 w-14 shrink-0 rounded-md bg-raised object-cover ring-1 ring-line" />
        )}
        <div className="min-w-0">
          <Meta article={article} />
          <h3 className="mt-1 line-clamp-2 text-[13px] font-medium leading-snug text-fg">{article.title}</h3>
        </div>
      </a>
    );
  }

  return (
    <a href={article.url} target="_blank" rel="noreferrer"
      className="card card-hover group block overflow-hidden p-0">
      {imageOk && (
        <div className="overflow-hidden border-b border-line bg-raised">
          <img src={article.urlToImage} alt="" loading="lazy" onError={() => setImageOk(false)}
            className="w-full object-cover opacity-90 transition duration-300 group-hover:scale-[1.02] group-hover:opacity-100" />
        </div>
      )}
      <div className="p-4">
        <Meta article={article} />
        <h3 className="mt-2 font-medium leading-snug text-fg">
          {article.title}
          <ArrowUpRight size={14} className="ml-1 inline text-subtle opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
        </h3>
        {article.description && <p className="mt-1.5 line-clamp-3 text-[13px] text-muted">{article.description}</p>}
      </div>
    </a>
  );
}
