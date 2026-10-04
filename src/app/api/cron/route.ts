import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/pipeline';

export async function GET(request: Request) {
  // Verificar cron secret (llamado por Vercel Cron automáticamente)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const result = await runPipeline();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Cron Job falló:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
