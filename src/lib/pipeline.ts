import { fetchFacebookPosts, findCurrentWeekPost } from './apify';
import { extractSchedulesFromImage } from './ai';
import { pool } from './db';

const DAY_OFFSETS: Record<string, number> = {
  'lunes': 0,
  'martes': 1,
  'miercoles': 2,
  'miércoles': 2,
  'jueves': 3,
  'viernes': 4,
  'sabado': 5,
  'sábado': 5,
  'domingo': 6,
};

function getMondayOfCurrentWeek(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sunday
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + distanceToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function computeDayDate(dayOfWeek: string): string | null {
  const monday = getMondayOfCurrentWeek();
  const key = dayOfWeek.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const offset = DAY_OFFSETS[key];
  if (offset === undefined) {
    // Try without accent normalization
    const offset2 = DAY_OFFSETS[dayOfWeek.toLowerCase()];
    if (offset2 === undefined) return null;
    const date = new Date(monday);
    date.setDate(monday.getDate() + offset2);
    return date.toISOString().split('T')[0];
  }
  const date = new Date(monday);
  date.setDate(monday.getDate() + offset);
  return date.toISOString().split('T')[0];
}

function buildWeekLabel(): string {
  const monday = getMondayOfCurrentWeek();
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const mDay = monday.getDate();
  const fDay = friday.getDate();
  const mMonth = months[monday.getMonth()];
  const fMonth = months[friday.getMonth()];

  if (mMonth === fMonth) {
    return `Lunes ${mDay} al Viernes ${fDay} de ${mMonth}`;
  }
  return `Lunes ${mDay} de ${mMonth} al Viernes ${fDay} de ${fMonth}`;
}

export async function runPipeline() {
  console.log("Iniciando pipeline de horarios...");

  // 1. Obtener posts de Facebook
  const facebookPage = "https://www.facebook.com/PullmanLagoPenuelas";
  const posts = await fetchFacebookPosts(facebookPage, 10);

  if (posts.length === 0) {
    return { success: false, message: "No se encontraron publicaciones en la página de Facebook.", schedules: [] };
  }

  // 2. Buscar el post de la semana actual
  const currentWeekPost = findCurrentWeekPost(posts);

  if (!currentWeekPost) {
    // Fallback: use the most recent post with images
    const fallbackPost = posts.find(p => p.images.length > 0);
    if (!fallbackPost) {
      return {
        success: false,
        message: "No se encontró la publicación de horarios para esta semana. Puede que aún no haya sido publicada.",
        schedules: []
      };
    }
    console.log("No se encontró post exacto de la semana actual, usando el más reciente con imágenes.");
  }

  const postToProcess = currentWeekPost || posts.find(p => p.images.length > 0)!;
  const weekLabel = buildWeekLabel();

  if (postToProcess.images.length === 0) {
    return { success: false, message: "La publicación encontrada no contiene imágenes.", schedules: [] };
  }

  // 3. Procesar cada imagen con Gemini
  let allExtractedSchedules: { imageUrl: string; schedules: any[] }[] = [];

  for (const imageUrl of postToProcess.images) {
    console.log(`Procesando imagen: ${imageUrl}`);
    try {
      const schedules = await extractSchedulesFromImage(imageUrl);
      if (schedules && schedules.length > 0) {
        allExtractedSchedules.push({ imageUrl, schedules });
      }
    } catch (err) {
      console.error(`Error procesando imagen ${imageUrl}:`, err);
      // Continue with other images
    }
  }

  if (allExtractedSchedules.length === 0) {
    return { success: false, message: "No se pudieron extraer horarios de las imágenes.", schedules: [] };
  }

  // 4. Guardar en la base de datos
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE weekly_schedules');

    for (const data of allExtractedSchedules) {
      for (const schedule of data.schedules) {
        const dayDate = computeDayDate(schedule.day_of_week);
        await client.query(
          `INSERT INTO weekly_schedules (day_of_week, day_date, departure_time, arrival_time, route, week_label, source_image_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            schedule.day_of_week,
            dayDate,
            schedule.departure_time,
            schedule.arrival_time || null,
            schedule.route,
            weekLabel,
            data.imageUrl
          ]
        );
      }
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  console.log("Pipeline completado con éxito.");
  return {
    success: true,
    message: `Horarios actualizados correctamente para la semana: ${weekLabel}`,
    week_label: weekLabel,
    schedules: allExtractedSchedules
  };
}
