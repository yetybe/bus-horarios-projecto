'use client';

import { useState } from 'react';

export default function RefreshButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleRefresh = async () => {
    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/refresh', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
        // Recargar la página para mostrar los nuevos horarios
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setStatus('error');
        setMessage(data.error || 'Ocurrió un error desconocido');
      }
    } catch {
      setStatus('error');
      setMessage('No se pudo conectar con el servidor');
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 mt-6">
      <button
        onClick={handleRefresh}
        disabled={status === 'loading'}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all
          bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-400
          text-white shadow-md hover:shadow-blue-500/25"
      >
        {status === 'loading' ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Buscando horarios en Facebook...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar Horarios
          </>
        )}
      </button>

      {status === 'success' && (
        <p className="text-sm text-emerald-400 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {message}
        </p>
      )}

      {status === 'error' && (
        <p className="text-sm text-red-400 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Error: {message}
        </p>
      )}

      <p className="text-xs text-gray-600">
        Los horarios se actualizan automáticamente cada día a las 8:00 AM
      </p>
    </div>
  );
}
