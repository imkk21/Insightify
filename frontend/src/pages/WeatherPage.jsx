import { useWeather } from '../hooks/useData';
import { PageHeader, Card, Stat, Loader, EmptyState, ErrorMsg, RefreshButton } from '../components/UI';
import { MapPin, CloudSun } from 'lucide-react';

const iconUrl = (code, size = 2) => (code ? `https://openweathermap.org/img/wn/${code}@${size}x.png` : null);
const time = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export default function WeatherPage() {
  const { data, loading, error, locating, refreshWithLocation, sync } = useWeather();
  const c = data?.current;

  return (
    <div>
      <PageHeader title="Weather" subtitle={data ? `${data.city}, ${data.country}` : 'Finding your location…'}>
        <button onClick={refreshWithLocation} disabled={loading || locating} className="btn-secondary">
          <MapPin size={16} aria-hidden="true" /> {locating ? 'Locating…' : 'Use my location'}
        </button>
        <RefreshButton onClick={() => sync()} loading={loading && !locating} />
      </PageHeader>

      {error && <div className="mb-6"><ErrorMsg message={error} /></div>}

      {loading || locating ? <Loader label={locating ? 'Finding your location…' : 'Loading weather…'} /> : !c ? (
        <Card><EmptyState icon={<CloudSun size={22} />} title="No weather data" subtitle="Allow location access, or set a city in Settings." /></Card>
      ) : (
        <>
          <div className="mb-10 grid items-stretch gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <Card className="flex flex-col justify-center rounded-xl p-8">
              <div className="flex items-center gap-2">
                {iconUrl(c.icon) && <img src={iconUrl(c.icon, 4)} alt="" className="-my-6 -ml-6 h-32 w-32" />}
                <div className="text-7xl font-semibold tracking-tight xl:text-display">{c.temp}°</div>
              </div>
              <div className="mt-2 text-xl font-semibold capitalize">{c.description}</div>
              <div className="text-olive">Feels like {c.feelsLike}°C</div>
            </Card>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat label="Humidity" value={`${c.humidity}%`} />
              <Stat label="Wind" value={`${c.windSpeed} km/h`} hint={c.windDir} />
              <Stat label="Pressure" value={`${c.pressure}`} hint="hPa" />
              <Stat label="Visibility" value={`${c.visibility} km`} />
              <Stat label="Sunrise" value={time(c.sunrise)} />
              <Stat label="Sunset" value={time(c.sunset)} />
            </div>
          </div>

          {data.forecast?.length > 0 && (
            <section>
              <h2 className="mb-4 font-bold">Next 5 days</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {data.forecast.map((day) => (
                  <Card key={day.date} className="text-center">
                    <div className="font-semibold">
                      {new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                    {iconUrl(day.icon) && <img src={iconUrl(day.icon)} alt="" className="mx-auto h-16 w-16" />}
                    <div className="text-xl font-bold">{day.tempMax}° <span className="text-base font-normal text-olive">{day.tempMin}°</span></div>
                    <div className="mt-1 text-xs capitalize text-olive">{day.description}</div>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
