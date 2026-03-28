import { useNews } from '../hooks/useData';
import { PageHeader, Card, CardHeader, SyncButton, DotLoader, EmptyState, ErrorMsg } from '../components/UI';
import NewsCard from '../components/NewsCard';

export default function NewsPage() {
  const { data, loading, error, refetch } = useNews();
  const articles = data?.articles || [];

  return (
    <div>
      <PageHeader title="Tech News Feed" subtitle={`${articles.length} articles · Updated hourly via News API`}>
        <SyncButton onClick={refetch} loading={loading} />
      </PageHeader>

      {error && <div className="mb-5"><ErrorMsg message={error} /></div>}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="bg-black/[0.06] rounded-xl h-36 mb-4" />
              <div className="bg-black/[0.06] rounded h-3 w-1/3 mb-3" />
              <div className="bg-black/[0.06] rounded h-4 mb-2" />
              <div className="bg-black/[0.06] rounded h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : articles.length ? (
        <>
          {/* Featured */}
          <div className="mb-5">
            <h2 className="text-xs font-mono text-ink3 uppercase tracking-[2px] mb-4">Featured</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {articles.slice(0, 2).map((a, i) => <NewsCard key={i} article={a} />)}
            </div>
          </div>
          {/* Rest */}
          <div>
            <h2 className="text-xs font-mono text-ink3 uppercase tracking-[2px] mb-4">All Articles</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {articles.slice(2).map((a, i) => <NewsCard key={i} article={a} />)}
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <EmptyState emoji="📰" title="No news articles" subtitle="Sync to fetch the latest tech headlines from News API" />
        </div>
      )}
    </div>
  );
}
