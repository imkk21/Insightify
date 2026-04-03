import { useAuth } from '../context/AuthContext';
import { useMusic } from '../context/MusicContext';
import { useNavigate } from 'react-router-dom';
import { useGithub, useWeather, useNews, useInsight, useFocus, useTasks } from '../hooks/useData';
import { PageHeader, Card, CardHeader, CardBody, LangBar, DateChip, SyncButton, Skeleton, DotLoader, EmptyState } from '../components/UI';
import InsightBanner from '../components/InsightBanner';
import NewsCard from '../components/NewsCard';
import { motion } from 'framer-motion';
import { Activity, GitCommit, Headphones, Music, Zap } from 'lucide-react';

const LANG_COLORS = ['#e8a030','#4361b8','#14b8a6','#e05a6a','#6b6258'];
const DOT_COLORS  = ['#e8a030','#14b8a6','#4361b8','#e05a6a','#6b6258'];

const timeAgo = (date) => {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
};

const ProductivityGauge = ({ score }) => {
  const normalizedScore = score || 0;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <div className="absolute inset-0 bg-amber/5 blur-[40px] rounded-full" />
      <svg className="w-40 h-40 transform -rotate-90 relative z-10">
        <circle cx="80" cy="80" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-border dark:text-white/5" />
        <circle
          cx="80" cy="80" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-amber drop-shadow-[0_0_12px_rgba(232,160,48,0.4)] transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center z-10">
        <motion.span 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="font-bold text-5xl text-foreground tracking-tight"
        >
          {normalizedScore}
        </motion.span>
        <span className="text-[10px] uppercase tracking-[3px] font-mono text-ink3 mt-1">Efficiency</span>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { selectedPlaylist, spotifyConnected } = useMusic();
  const navigate = useNavigate();
  const github  = useGithub();
  const weather = useWeather();
  const news    = useNews();
  const insight = useInsight();
  const focus   = useFocus();
  const taskData = useTasks();

  const name = profile?.displayName || user?.displayName || 'Developer';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const isGithubConnected = !!github.data?.username;

  const focusHours = (focus.data?.weeklyMinutes / 60).toFixed(1);
  const pendingTasks = taskData.tasks?.filter(t => t.status !== 'done').length || 0;

  const langs = github.data?.languages
    ? Object.entries(github.data.languages).sort((a, b) => b[1] - a[1]).slice(0, 5)
    : [];
  const total = langs.reduce((s, [, v]) => s + v, 0) || 1;
  const c = weather.data?.current;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { ease: "easeOut", duration: 0.5 } }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="pb-10">
      <PageHeader title={`${greeting}, ${name.split(' ')[0]} 👋`} subtitle="Your neural productivity framework is synchronized and active.">
        <DateChip />
        <SyncButton onClick={insight.generate} loading={insight.generating} />
      </PageHeader>

      {/* AI Insight Banner */}
      <motion.div variants={itemVariants} className="mb-8">
        {insight.loading
          ? <Skeleton className="h-40 rounded-3xl" />
          : <InsightBanner insight={insight.latest} onGenerate={insight.generate} generating={insight.generating} />
        }
      </motion.div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8">
        
        {/* Productivity Core (Span 4) */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-4 flex flex-col h-full">
          <Card className="flex-1 flex flex-col p-8 bg-card border-border shadow-xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-30 transition-opacity">
                <Zap size={64} className="text-amber" />
             </div>
            <CardHeader title="Productivity Pulse" subtitle="Neural efficiency metric" badge="ACTIVE" />
            <CardBody className="flex-1 flex flex-col justify-center items-center py-6">
              {github.loading ? <DotLoader /> : !isGithubConnected ? <EmptyState emoji="⚡" title="Offline" subtitle="Connect GitHub" /> : (
                <div className="w-full flex flex-col items-center">
                  <ProductivityGauge score={github.data?.productivityScore} />
                  
                  <div className="mt-8 grid grid-cols-1 gap-3 w-full">
                    <div className="flex justify-between items-center bg-background/40 backdrop-blur-xl rounded-2xl p-4 border border-border shadow-inner">
                      <div className="text-[10px] uppercase font-mono text-ink3 tracking-widest">Focus Yield</div>
                      <div className="text-2xl font-bold text-foreground tracking-tight">{focusHours}h</div>
                    </div>
                    <div className="flex justify-between items-center bg-background/40 backdrop-blur-xl rounded-2xl p-4 border border-border shadow-inner">
                      <div className="text-[10px] uppercase font-mono text-ink3 tracking-widest">Active Nodes</div>
                      <div className="text-2xl font-bold text-amber tracking-tight">{pendingTasks}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </motion.div>

        {/* Global Environment & Language Vectors (Span 8) */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-8 flex flex-col gap-8 h-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
            {/* Sonic Environment Hub (Mini Dashboard) */}
            <Card className="flex flex-col relative overflow-hidden group border-border shadow-xl">
               <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-30 transition-opacity">
                  <Music size={64} className="text-teal2" />
               </div>
              <CardHeader title="Environment" subtitle="Sonic synchronization" badge={selectedPlaylist ? "ACTIVE" : "IDLE"} badgeStyle={selectedPlaylist ? "bg-teal2/10 text-teal2 border-teal2/20" : "bg-ink3/10 text-ink3 border-ink3/20"} />
              <CardBody className="flex-1 flex flex-col justify-center">
                {selectedPlaylist ? (
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
                      <img src={selectedPlaylist.images?.[0]?.url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-lg font-bold text-foreground truncate">{selectedPlaylist.name}</div>
                      <div className="text-[10px] font-mono text-teal2 uppercase tracking-widest mt-1">Playback Synchronized</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 opacity-40">
                    <Music size={32} className="text-ink3" />
                    <div className="text-xs font-mono uppercase tracking-widest">No Active Environment</div>
                  </div>
                )}
                <button 
                  onClick={() => navigate('/focus')}
                  className="mt-6 w-full py-3 rounded-xl bg-foreground/5 hover:bg-foreground/10 border border-border text-[10px] font-mono font-bold uppercase tracking-widest transition-all"
                >
                  Manage Sonic Flow
                </button>
              </CardBody>
            </Card>

            {/* Language Architecture Node */}
            <Card className="flex flex-col relative overflow-hidden group border-border shadow-xl">
              <CardHeader title="Language Vectors" subtitle="Neural breakdown of source density" badge="V2 SCAN" badgeStyle="bg-indigo/10 text-indigo border-indigo/20" />
              <CardBody className="flex-1 flex flex-col justify-center gap-6">
                {github.loading ? <DotLoader /> : langs.length ? (
                  <div className="space-y-5">
                    {langs.map(([name, val], i) => (
                      <LangBar key={name} name={name} pct={Math.round((val / total) * 100)} color={LANG_COLORS[i % 5]} />
                    ))}
                  </div>
                ) : <EmptyState emoji="🧩" title="No language data" />}
              </CardBody>
            </Card>
          </div>

          {/* Weather Node (Full Width under top row) */}
          <Card className="flex flex-col relative overflow-hidden group border-border shadow-xl">
            <CardHeader title="Atmospheric Data" subtitle={weather.data ? `${weather.data.city}` : 'Geo-Scan...'} badge="LIVE" badgeStyle="bg-amber/10 text-amber border-amber/20" />
            <CardBody className="py-8">
              {weather.loading || weather.locating ? <DotLoader /> : c ? (
                <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-12">
                  <div className="relative shrink-0">
                     <div className="absolute inset-0 bg-amber/20 blur-[30px] rounded-full" />
                     {c.icon && <img src={`https://openweathermap.org/img/wn/${c.icon}@4x.png`} alt="" className="w-24 h-24 relative z-10 drop-shadow-2xl group-hover:scale-110 transition-transform duration-700" />}
                  </div>
                  <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 w-full text-center sm:text-left">
                    <div>
                      <div className="font-bold text-6xl text-foreground tracking-tight">{Math.round(c.temp)}°</div>
                      <div className="text-sm font-bold text-ink2 capitalize italic opacity-80">{c.description}</div>
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="text-[10px] font-mono text-ink3 uppercase tracking-widest mb-1">Humidity</div>
                      <div className="text-xl font-bold text-foreground">{c.humidity}%</div>
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="text-[10px] font-mono text-ink3 uppercase tracking-widest mb-1">Wind Vector</div>
                      <div className="text-xl font-bold text-foreground">{c.windSpeed} km/h</div>
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="text-[10px] font-mono text-ink3 uppercase tracking-widest mb-1">Visibility</div>
                      <div className="text-xl font-bold text-foreground">{(c.visibility / 1000).toFixed(1)} km</div>
                    </div>
                  </div>
                </div>
              ) : <EmptyState emoji="🌤️" title="No sensor data" />}
            </CardBody>
          </Card>
        </motion.div>

      </div>

      {/* Bottom Row - Data Feed & Commits */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Recent Commits (Span 7) */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-7">
          <Card className="bg-card/[0.3] border-white/5 shadow-2xl">
            <CardHeader title="System Ledger" subtitle="Latest git activity" />
            <div className="p-4">
              {github.loading ? <div className="p-6"><DotLoader /></div> : !isGithubConnected ? <div className="p-6"><EmptyState emoji="📜" title="No ledger connection" /></div> : github.data?.recentCommits?.length ? (
                <div className="space-y-2">
                  {github.data.recentCommits.slice(0, 5).map((c, i) => (
                    <a key={i} href={c.url} target="_blank" rel="noreferrer"
                      className="flex items-start gap-4 px-6 py-5 rounded-3xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all no-underline group"
                    >
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-background/50 border border-border shadow-sm group-hover:scale-110 transition-transform shadow-inner">
                        <GitCommit size={16} className="opacity-80" style={{ color: DOT_COLORS[i % 5] }} />
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="text-base font-bold text-foreground leading-snug group-hover:text-amber transition-colors truncate tracking-tight">{c.message}</div>
                        <div className="text-[10px] text-ink3 font-mono mt-3 uppercase tracking-widest opacity-60">
                           {c.repo.split('/')[1]} · {c.sha.slice(0,7)} · {timeAgo(c.date)}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : <div className="p-6"><EmptyState emoji="📝" title="No records found" /></div>}
            </div>
          </Card>
        </motion.div>

        {/* Tech Feed (Span 5) */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-5 h-full">
          <Card className="h-full bg-card/[0.3] border-white/5 shadow-2xl">
            <CardHeader title="Comm Stream" subtitle="Global technology vectors" />
            <div className="flex flex-col gap-4 p-6">
              {news.loading ? <div className="p-6"><DotLoader /></div> : news.data?.articles?.length ? (
                news.data.articles.slice(0, 4).map((a, i) => <NewsCard key={i} article={a} compact />)
              ) : <div className="p-6"><EmptyState emoji="📡" title="Signal lost" /></div>}
            </div>
          </Card>
        </motion.div>

      </div>

    </motion.div>
  );
}
