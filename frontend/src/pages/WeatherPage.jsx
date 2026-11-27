import { useWeather } from '../hooks/useData';
import { PageHeader, Card, Stat, Skeleton, EmptyState, ErrorMsg, RefreshButton } from '../components/UI';
import { MapPin, CloudSun, Sunrise, Sunset } from 'lucide-react';

const iconUrl = (code, size = 2) => (code ? `https://openweathermap.org/img/wn/${code}@${size}x.png` : null);
const time = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export default function WeatherPage() {
  const { data, loading, error, locating, refreshWithLocation, sync } = useWeather();
  const c = data?.current;
  const days = data?.forecast || [];
  // Shared scale so each day's range bar sits in the week's overall min..max
  const lo = Math.min(...days.map((d) => d.tempMin));
  const hi = Math.max(...days.map((d) => d.tempMax));
  const span = Math.max(1, hi - lo);

  return (
    <div>
      <PageHeader eyebrow="Outside" title="Weather" subtitle={data ? `${data.city}, ${data.country}` : 'Finding your location…'}>
        <button onClick={refreshWithLocation} disabled={loading || locating} className="btn-secondary">
          <MapPin size={14} aria-hidden="true" /> {locating ? 'Locating…' : 'Use my location'}
        </button>
        <RefreshButton onClick={() => sync()} loading={loading && !locating} />
      </PageHeader>

      {error && <div className="mb-6"><ErrorMsg message={error} /></div>}

      {loading || locating ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" role="status" aria-label={locating ? 'Finding your location' : 'Loading weather'}>
          <Skeleton className="h-64 rounded-xl" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        </div>
      ) : !c ? (
        <Card><EmptyState icon={<CloudSun size={20} />} title="No weather data" subtitle="Allow location access, or set a city in Settings." /></Card>
      ) : (
        <>
          <div className="mb-4 grid items-stretch gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <Card className="glow relative flex flex-col justify-between overflow-hidden p-6 sm:p-8">
              <div className="flex items-center gap-1.5 text-[13px] text-muted"><MapPin size={13} aria-hidden="true" /> {data.city}, {data.country}</div>
              <div className="mt-6 flex items-center">
                <div className="font-mono text-[72px] font-semibold leading-none tracking-tighter text-gradient sm:text-[88px]">{c.temp}°</div>
                {iconUrl(c.icon) && <img src={iconUrl(c.icon, 4)} alt="" className="-my-6 h-28 w-28 drop-shadow-[0_0_24px_rgba(124,92,255,0.35)] sm:h-32 sm:w-32" />}
              </div>
              <div className="mt-4">
                <div className="text-lg font-medium capitalize text-fg">{c.description}</div>
                <div className="text-[13px] text-muted">Feels like <span className="font-mono text-fg">{c.feelsLike}°C</span></div>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat label="Humidity" value={`${c.humidity}%`} />
              <Stat label="Wind" value={`${c.windSpeed} km/h`} hint={c.windDir} />
              <Stat label="Pressure" value={`${c.pressure}`} hint="hPa" />
              <Stat label="Visibility" value={`${c.visibility} km`} />
              <Stat label={<span className="inline-flex items-center gap-1.5"><Sunrise size={12} aria-hidden="true" /> Sunrise</span>} value={time(c.sunrise)} />
              <Stat label={<span className="inline-flex items-center gap-1.5"><Sunset size={12} aria-hidden="true" /> Sunset</span>} value={time(c.sunset)} />
            </div>
          </div>

          {days.length > 0 && (
            <Card className="p-0">
              <div className="border-b border-line px-5 py-3.5"><h2 className="text-[13px] font-semibold">Next {days.length} days</h2></div>
              <ul className="divide-y divide-line">
                {days.map((day) => (
                  <li key={day.date} className="grid grid-cols-[88px_40px_minmax(0,1fr)] items-center gap-3 px-5 py-2.5 transition-colors hover:bg-raised/50 sm:grid-cols-[120px_40px_minmax(0,1fr)_minmax(0,1.4fr)]">
                    <span className="text-[13px] text-fg">
                      {new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    {iconUrl(day.icon) ? <img src={iconUrl(day.icon)} alt="" className="-my-2 h-10 w-10" /> : <span />}
                    <span className="hidden truncate text-[13px] capitalize text-muted sm:block">{day.description}</span>
                    <span className="flex items-center gap-3 font-mono text-[13px]">
                      <span className="w-9 text-right text-subtle">{day.tempMin}°</span>
                      <span className="relative h-1.5 flex-1 rounded-full bg-raised">
                        <span className="absolute inset-y-0 rounded-full bg-gradient-to-r from-info to-warning"
                          style={{ left: `${((day.tempMin - lo) / span) * 100}%`, right: `${((hi - day.tempMax) / span) * 100}%` }} />
                      </span>
                      <span className="w-9 text-fg">{day.tempMax}°</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
