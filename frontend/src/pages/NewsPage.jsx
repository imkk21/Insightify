import { useNews } from '../hooks/useData';
import { PageHeader, Card, Masonry, DENSE_COLS, Skeleton, EmptyState, ErrorMsg, RefreshButton } from '../components/UI';
import NewsCard from '../components/NewsCard';
import { timeAgo } from '../utils';
import { Newspaper } from 'lucide-react';

const SKELETON_HEIGHTS = ['h-64', 'h-48', 'h-80', 'h-56', 'h-72', 'h-52', 'h-60', 'h-44'];

export default function NewsPage() {
  const { data, loading, error, refetch } = useNews();
  const articles = data?.articles || [];

  return (
    <div>
      <PageHeader
        title="Tech news"
        subtitle={data ? `${articles.length} headlines · updated ${timeAgo(data.fetchedAt)}` : 'Technology headlines, refreshed hourly'}
      >
        <RefreshButton onClick={refetch} loading={loading} />
      </PageHeader>

      {error && <div className="mb-6"><ErrorMsg message={error} /></div>}

      {loading ? (
        <Masonry cols={DENSE_COLS}>
          {SKELETON_HEIGHTS.map((h, i) => <Skeleton key={i} className={h} />)}
        </Masonry>
      ) : articles.length ? (
        <Masonry cols={DENSE_COLS}>
          {articles.map((a) => <NewsCard key={a.url} article={a} />)}
        </Masonry>
      ) : (
        <Card><EmptyState icon={<Newspaper size={22} />} title="No headlines right now" subtitle="Try refreshing in a few minutes." /></Card>
      )}
    </div>
  );
}
