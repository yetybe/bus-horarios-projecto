import ScheduleSearch from '@/components/ScheduleSearch';

export const dynamic = 'force-dynamic';

export default function Home() {
  const now = new Date();
  const currentStr = now.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Santiago',
    hour12: false,
  });

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100 p-6 sm:p-12 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
            Horarios Pullman Lago Peñuelas
          </h1>
          <p className="text-gray-400">
            Ruta Costera: Cartagena → El Tabo → El Quisco → Valparaíso
          </p>
          <div className="mt-4 inline-block px-4 py-1 rounded-full bg-gray-800 border border-gray-700 text-sm">
            Hora actual: <span className="font-mono text-emerald-400">{currentStr}</span>
          </div>
        </header>

        <ScheduleSearch />
      </div>
    </main>
  );
}
