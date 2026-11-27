import { useState } from 'react';
import { timeAgo } from '../utils';

// Image-first "pin": the photo keeps its natural height, which is what makes the masonry work.
export default function NewsCard({ article }) {
  const [imageOk, setImageOk] = useState(!!article.urlToImage);

  return (
    <a href={article.url} target="_blank" rel="noreferrer" className="group block">
      {imageOk && (
        <img
          src={article.urlToImage}
          alt=""
          loading="lazy"
          onError={() => setImageOk(false)}
          className="w-full rounded-lg bg-sand object-cover transition-opacity group-hover:opacity-90"
        />
      )}
      <div className={imageOk ? 'px-1 pt-2.5' : 'card'}>
        <div className="text-xs font-bold text-olive">
          {article.source} · {timeAgo(article.publishedAt)}
        </div>
        <h3 className="mt-1 font-semibold leading-snug group-hover:underline">{article.title}</h3>
        {article.description && (
          <p className="mt-1 line-clamp-3 text-sm text-olive">{article.description}</p>
        )}
      </div>
    </a>
  );
}
