// Brand palette for language bars and commit dots
export const PALETTE = ['#e8a030', '#4361b8', '#14b8a6', '#e05a6a', '#6b6258'];

export const timeAgo = (date) => {
  if (!date) return '';
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
};
