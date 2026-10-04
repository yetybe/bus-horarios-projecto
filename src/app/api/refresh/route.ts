import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/pipeline';

// Endpoint público (sin auth) para el botón del dashboard personal.
// Solo tú tienes acceso al link del dashboard, así que no es necesaria mayor protección.
export async function POST() {
  try {
    const result = await runPipeline();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Refresh falló:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
