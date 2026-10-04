import { pool } from '@/lib/db';
import RefreshButton from '@/components/RefreshButton';

// Disable caching for this page so it always shows the latest DB state
export const dynamic = 'force-dynamic';

export default async function Home() {
  let schedules = [];
  let error = null;
  
  try {
    const client = await pool.connect();
    // Fetch all schedules, ordered by time
    const res = await client.query('SELECT * FROM schedules ORDER BY departure_time ASC');
    schedules = res.rows;
    client.release();
  } catch (e: any) {
    console.error(e);
    error = e.message;
  }

  // Get current hour/minute in Chile time to highlight next bus
  // This logic is simple and assumes the server timezone is set correctly 
  // or you handle timezone offsets appropriately.
  const now = new Date();
  const currentStr = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago', hour12: false });

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100 p-6 sm:p-12 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
            Horarios Pullman Lago Peñuelas
          </h1>
          <p className="text-gray-400">Ruta Costera (San Antonio ↔ Valparaíso)</p>
          <div className="mt-4 inline-block px-4 py-1 rounded-full bg-gray-800 border border-gray-700 text-sm">
            Hora actual: <span className="font-mono text-emerald-400">{currentStr}</span>
          </div>
          <RefreshButton />
        </header>

        {error && (
          <div className="p-4 mb-8 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            <strong>Error cargando la base de datos:</strong> {error}
            <p className="text-sm mt-2 opacity-80">
              (Asegúrate de configurar las variables de entorno en Vercel o en tu archivo .env.local)
            </p>
          </div>
        )}

        {schedules.length === 0 && !error ? (
          <div className="text-center p-12 bg-gray-800 rounded-2xl border border-gray-700">
            <svg className="w-16 h-16 mx-auto text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-semibold mb-2">No hay horarios guardados aún</h2>
            <p className="text-gray-400">El cron job extraerá los horarios de Facebook pronto.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {schedules.map((bus, i) => {
              // Simple check to see if this bus is the "Next" one
              const isNext = bus.departure_time >= currentStr;
              // Only highlight the FIRST one that is after the current time
              const highlight = isNext && (i === 0 || schedules[i-1].departure_time < currentStr);

              return (
                <div 
                  key={bus.id} 
                  className={`p-5 rounded-2xl border transition-all ${
                    highlight 
                      ? 'bg-emerald-900/20 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                      : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-medium px-2.5 py-0.5 rounded bg-gray-700 text-gray-300">
                      {bus.day_of_week}
                    </span>
                    {highlight && (
                      <span className="text-xs font-bold px-2 py-1 rounded bg-emerald-500 text-emerald-950 uppercase tracking-wider animate-pulse">
                        Próximo
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div>
                      <div className="text-3xl font-mono font-semibold">{bus.departure_time.substring(0, 5)}</div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Salida (Sn. Antonio)</div>
                    </div>
                    
                    <div className="flex-1 border-t-2 border-dashed border-gray-600 relative">
                      <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-gray-800 px-2 text-gray-500">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-mono text-gray-300">{bus.arrival_time ? bus.arrival_time.substring(0,5) : '--:--'}</div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Llegada (Valpo)</div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-400 flex items-center justify-between">
                    <span className="truncate pr-4">{bus.route}</span>
                    {bus.source_image_url && (
                      <a href={bus.source_image_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 whitespace-nowrap">
                        Ver Fuente
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
