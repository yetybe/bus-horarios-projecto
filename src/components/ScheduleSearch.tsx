'use client';

import { useState } from 'react';

interface Schedule {
  id: number;
  day_of_week: string;
  day_date: string;
  departure_time: string;
  arrival_time: string | null;
  route: string;
  week_label: string;
  source_image_url: string;
}

interface DayResult {
  day: string;
  arrivalHour: string;
  recommended: Schedule | null;
  all_schedules: Schedule[];
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export default function ScheduleSearch() {
  const [times, setTimes] = useState<Record<string, string>>({
    Lunes: '',
    Martes: '',
    Miércoles: '',
    Jueves: '',
    Viernes: '',
  });

  const [results, setResults] = useState<DayResult[]>([]);
  const [weekLabel, setWeekLabel] = useState<string>('');
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshMessage, setRefreshMessage] = useState('');

  const handleTimeChange = (day: string, value: string) => {
    setTimes(prev => ({ ...prev, [day]: value }));
  };

  const handleSearch = async () => {
    setSearchStatus('loading');
    setErrorMessage('');
    setResults([]);

    try {
      const activeDays = DAYS.filter(d => times[d] !== '');

      if (activeDays.length === 0) {
        // If no times selected, fetch all schedules
        const res = await fetch('/api/search');
        const data = await res.json();

        if (!data.success) {
          setSearchStatus('error');
          setErrorMessage(data.error || 'Error desconocido');
          return;
        }

        if (data.all_schedules.length === 0) {
          setSearchStatus('error');
          setErrorMessage('No hay horarios para esta semana. Presiona "Actualizar desde Facebook" para buscarlos.');
          return;
        }

        setWeekLabel(data.week_label || '');

        // Group schedules by day
        const grouped: Record<string, Schedule[]> = {};
        for (const s of data.all_schedules) {
          if (!grouped[s.day_of_week]) grouped[s.day_of_week] = [];
          grouped[s.day_of_week].push(s);
        }

        const dayResults: DayResult[] = Object.entries(grouped).map(([day, schedules]) => ({
          day,
          arrivalHour: '',
          recommended: null,
          all_schedules: schedules,
        }));

        setResults(dayResults);
        setSearchStatus('done');
        return;
      }

      // Fetch each day with its specific arrival hour
      const dayResults: DayResult[] = [];
      let foundWeekLabel = '';

      for (const day of activeDays) {
        const res = await fetch(`/api/search?day=${encodeURIComponent(day)}&arrival_hour=${encodeURIComponent(times[day])}`);
        const data = await res.json();

        if (data.success) {
          if (data.week_label) foundWeekLabel = data.week_label;
          dayResults.push({
            day,
            arrivalHour: times[day],
            recommended: data.recommended,
            all_schedules: data.all_schedules,
          });
        }
      }

      setWeekLabel(foundWeekLabel);

      if (dayResults.length === 0 || dayResults.every(d => d.all_schedules.length === 0)) {
        setSearchStatus('error');
        setErrorMessage('No hay horarios para esta semana. Presiona "Actualizar desde Facebook" para buscarlos.');
        return;
      }

      setResults(dayResults);
      setSearchStatus('done');
    } catch {
      setSearchStatus('error');
      setErrorMessage('No se pudo conectar con el servidor.');
    }
  };

  const handleRefresh = async () => {
    setRefreshStatus('loading');
    setRefreshMessage('');

    try {
      const res = await fetch('/api/refresh', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setRefreshStatus('success');
        setRefreshMessage(data.message);
      } else {
        setRefreshStatus('error');
        setRefreshMessage(data.error || data.message || 'Ocurrió un error');
      }
    } catch {
      setRefreshStatus('error');
      setRefreshMessage('No se pudo conectar con el servidor.');
    }
  };

  const formatTime = (t: string | null) => {
    if (!t) return '--:--';
    return t.substring(0, 5);
  };

  return (
    <div className="space-y-8">
      {/* Time selectors */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-200">
          ¿A qué hora necesitas llegar a Valparaíso?
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Selecciona la hora deseada de llegada para cada día. Deja vacío los días que no necesites.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {DAYS.map(day => (
            <div key={day} className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-300">{day}</label>
              <input
                type="time"
                value={times[day]}
                onChange={e => handleTimeChange(day, e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  [color-scheme:dark]"
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleSearch}
            disabled={searchStatus === 'loading'}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-all
              bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-400
              text-white shadow-md hover:shadow-blue-500/25"
          >
            {searchStatus === 'loading' ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Buscando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Buscar Horarios
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error message */}
      {searchStatus === 'error' && (
        <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-300 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Results */}
      {searchStatus === 'done' && results.length > 0 && (
        <div className="space-y-6">
          {weekLabel && (
            <div className="text-center">
              <span className="inline-block px-4 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-sm text-gray-300">
                📅 Semana: <span className="text-emerald-400 font-medium">{weekLabel}</span>
              </span>
            </div>
          )}

          {results.map(dayResult => (
            <div key={dayResult.day} className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
              {/* Day header */}
              <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{dayResult.day}</h3>
                  {dayResult.arrivalHour && (
                    <p className="text-sm text-gray-400">
                      Hora deseada de llegada: <span className="text-blue-400 font-mono">{dayResult.arrivalHour}</span>
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {dayResult.all_schedules.length} bus{dayResult.all_schedules.length !== 1 ? 'es' : ''} disponible{dayResult.all_schedules.length !== 1 ? 's' : ''}
                </span>
              </div>

              {dayResult.all_schedules.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  No hay horarios disponibles para este día.
                </div>
              ) : (
                <div className="divide-y divide-gray-700/50">
                  {dayResult.all_schedules.map((schedule, idx) => {
                    const isRecommended = dayResult.recommended && dayResult.recommended.id === schedule.id;
                    return (
                      <div
                        key={schedule.id || idx}
                        className={`px-6 py-4 flex items-center gap-4 transition-all ${
                          isRecommended
                            ? 'bg-emerald-900/20 border-l-4 border-emerald-500'
                            : 'hover:bg-gray-750'
                        }`}
                      >
                        {/* Recommended badge */}
                        {isRecommended && (
                          <span className="shrink-0 text-xs font-bold px-2 py-1 rounded bg-emerald-500 text-emerald-950 uppercase tracking-wider">
                            ✓ Recomendado
                          </span>
                        )}

                        {/* Departure */}
                        <div className="shrink-0 text-center">
                          <div className={`text-2xl font-mono font-semibold ${isRecommended ? 'text-emerald-300' : 'text-white'}`}>
                            {formatTime(schedule.departure_time)}
                          </div>
                          <div className="text-[10px] text-gray-400 uppercase tracking-wide">Salida</div>
                        </div>

                        {/* Arrow */}
                        <div className="flex-1 border-t-2 border-dashed border-gray-600 relative min-w-[40px]">
                          <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-gray-800 px-1">
                            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>

                        {/* Arrival */}
                        <div className="shrink-0 text-center">
                          <div className={`text-xl font-mono ${isRecommended ? 'text-emerald-300' : 'text-gray-300'}`}>
                            {formatTime(schedule.arrival_time)}
                          </div>
                          <div className="text-[10px] text-gray-400 uppercase tracking-wide">Llegada Valpo</div>
                        </div>

                        {/* Route */}
                        <div className="hidden sm:block text-xs text-gray-500 truncate max-w-[200px]" title={schedule.route}>
                          {schedule.route}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Refresh from Facebook button */}
      <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Actualización manual</h3>
        <p className="text-xs text-gray-500 mb-4">
          Extrae los horarios más recientes desde la página de Facebook de Pullman Lago Peñuelas.
          Este proceso puede tomar hasta 1 minuto.
        </p>

        <button
          onClick={handleRefresh}
          disabled={refreshStatus === 'loading'}
          className="flex items-center gap-2 px-5 py-2 rounded-xl font-medium text-sm transition-all
            bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500
            text-gray-200 border border-gray-600"
        >
          {refreshStatus === 'loading' ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Extrayendo de Facebook... (puede tomar ~1 min)
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar desde Facebook
            </>
          )}
        </button>

        {refreshStatus === 'success' && (
          <p className="mt-3 text-sm text-emerald-400 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {refreshMessage}
          </p>
        )}

        {refreshStatus === 'error' && (
          <p className="mt-3 text-sm text-red-400 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Error: {refreshMessage}
          </p>
        )}
      </div>
    </div>
  );
}
