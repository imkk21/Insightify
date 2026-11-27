const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const argmax = (obj) => Object.entries(obj).reduce((best, e) => (e[1] > best[1] ? e : best), [null, -1]);

/** "Year in code" numbers from a GithubStats doc (calendar = [{date:'YYYY-MM-DD', count}] ascending). */
const wrappedStats = (gh) => {
  const cal = gh?.calendar || [];
  const byMonth = {};
  const byWeekday = {};
  let busiestDay = null;
  for (const d of cal) {
    const date = new Date(`${d.date}T00:00:00Z`);
    const month = `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
    byMonth[month] = (byMonth[month] || 0) + d.count;
    byWeekday[WEEKDAYS[date.getUTCDay()]] = (byWeekday[WEEKDAYS[date.getUTCDay()]] || 0) + d.count;
    if (d.count > 0 && (!busiestDay || d.count > busiestDay.count)) busiestDay = { date: d.date, count: d.count };
  }
  const [month, monthCount] = argmax(byMonth);
  const [weekday] = argmax(byWeekday);
  const total = cal.reduce((s, d) => s + d.count, 0);

  return {
    from: cal[0]?.date || null,
    to: cal[cal.length - 1]?.date || null,
    contributions: total,
    activeDays: cal.filter((d) => d.count > 0).length,
    busiestDay,
    busiestMonth: total ? { month, count: monthCount } : null,
    favoriteWeekday: total ? weekday : null,
    longestStreak: gh?.streak?.longest || 0,
    topLanguage: gh?.languages?.[0]?.name || null,
    commits: gh?.totals?.commitsYear || 0,
    pullRequests: gh?.totals?.prsYear || 0,
    reviews: gh?.totals?.reviewsYear || 0,
  };
};

module.exports = { wrappedStats };
