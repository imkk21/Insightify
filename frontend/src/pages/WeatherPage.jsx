import { useWeather } from '../hooks/useData';
import { PageHeader, StatCard, Card, CardHeader, CardBody, SyncButton, DotLoader, EmptyState, ErrorMsg } from '../components/UI';

const iconUrl = (code) => code ? `https://openweathermap.org/img/wn/${code}@2x.png` : null;

export default function WeatherPage() {
  const { data, loading, error, locating, refreshWithLocation, sync } = useWeather();
  const c = data?.current;

  return (
    <div>
      <PageHeader title="Environment Data" subtitle={data ? `${data.city}, ${data.country} · Live via OpenWeather` : 'Loading your location…'}>
        <button
          onClick={refreshWithLocation}
          disabled={loading || locating}
          className="btn-outline flex items-center gap-2"
        >
          📍 {locating ? 'Locating…' : 'Use My Location'}
        </button>
        <SyncButton onClick={() => sync()} loading={loading} />
      </PageHeader>

      {locating && (
        <div className="mb-5 flex items-center gap-2 text-sm text-ink3 bg-amber/5 border border-amber/20 rounded-xl px-4 py-3">
          <span className="w-2 h-2 rounded-full bg-amber animate-pulse" />
          Detecting your location…
        </div>
      )}
      {error && <div className="mb-5"><ErrorMsg message={error} /></div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatCard icon="🌡️" value={c ? `${c.temp}°C`       : '—'} label="Temperature"  accentColor="#e8a030" delay={0}   />
        <StatCard icon="💧" value={c ? `${c.humidity}%`    : '—'} label="Humidity"     accentColor="#14b8a6" delay={80}  />
        <StatCard icon="💨" value={c ? `${c.windSpeed} km/h`: '—'} label="Wind Speed"   accentColor="#e05a6a" delay={160} />
        <StatCard icon="👁️" value={c ? `${c.visibility} km`: '—'} label="Visibility"   accentColor="#4361b8" delay={240} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Current Conditions" subtitle={data ? `${data.city}, ${data.country}` : '…'} badge="Live" badgeStyle="bg-teal2/10 text-teal2 border-teal2/20" />
          <CardBody>
            {loading ? <DotLoader label="Fetching weather…" /> : c ? (
              <div>
                <div className="text-center py-4 border-b border-black/[0.06] mb-5">
                  {iconUrl(c.icon) && <img src={iconUrl(c.icon)} alt={c.description} className="w-20 h-20 mx-auto" />}
                  <div className="font-syne font-black text-6xl text-ink tracking-tight leading-none">{c.temp}°</div>
                  <div className="text-sm text-ink2 capitalize mt-2">{c.description}</div>
                  <div className="text-xs text-ink3 mt-1">Feels like {c.feelsLike}°C</div>
                  {data.lat && (
                    <div className="text-[10px] font-mono text-ink3 opacity-60 mt-2">
                      📍 {data.lat?.toFixed(2)}, {data.lon?.toFixed(2)}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Humidity',   value: `${c.humidity}%` },
                    { label: 'Wind',       value: `${c.windSpeed} km/h ${c.windDir}` },
                    { label: 'Pressure',   value: `${c.pressure} hPa` },
                    { label: 'Visibility', value: `${c.visibility} km` },
                    { label: 'Sunrise',    value: new Date(c.sunrise).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) },
                    { label: 'Sunset',     value: new Date(c.sunset).toLocaleTimeString('en-IN',  { hour: '2-digit', minute: '2-digit' }) },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-cream rounded-xl p-3">
                      <div className="text-[10px] text-ink3 uppercase tracking-wide">{label}</div>
                      <div className="font-mono text-sm font-medium text-ink mt-0.5">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : <EmptyState emoji="🌤️" title="No weather data" subtitle="Allow location access or sync manually" />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="5-Day Forecast" subtitle="Daily outlook" />
          <CardBody>
            {loading ? <DotLoader label="Loading forecast…" /> : data?.forecast?.length ? (
              <div className="space-y-3">
                {data.forecast.map((day, i) => (
                  <div key={i} className="flex items-center justify-between bg-cream rounded-xl px-4 py-3">
                    <div className="font-medium text-sm text-ink w-28">
                      {i === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    {iconUrl(day.icon) && <img src={iconUrl(day.icon)} alt={day.description} className="w-9 h-9" />}
                    <div className="text-xs text-ink3 capitalize flex-1 text-center hidden sm:block">{day.description}</div>
                    <div className="text-sm font-mono font-medium text-ink">
                      {day.tempMax}° <span className="text-ink3 text-xs">/ {day.tempMin}°</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyState emoji="📅" title="No forecast data" />}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
