import { fetchLatestFacebookImages } from './apify';
import { extractSchedulesFromImage } from './ai';
import { pool } from './db';

export async function runPipeline() {
  console.log("Iniciando pipeline de horarios...");

  // 1. Obtener imágenes de Facebook
  const facebookPage = "https://www.facebook.com/PullmanLagoPenuelas";
  const images = await fetchLatestFacebookImages(facebookPage, 3);

  if (images.length === 0) {
    return { success: true, message: "No se encontraron imágenes recientes.", schedules: [] };
  }

  let allExtractedSchedules: { imageUrl: string; schedules: any[] }[] = [];

  // 2. Procesar imágenes con Gemini
  for (const imageUrl of images.slice(0, 2)) {
    console.log(`Procesando imagen: ${imageUrl}`);
    const schedules = await extractSchedulesFromImage(imageUrl);
    if (schedules && schedules.length > 0) {
      allExtractedSchedules.push({ imageUrl, schedules });
    }
  }

  if (allExtractedSchedules.length === 0) {
    return { success: true, message: "No se extrajeron horarios de las imágenes.", schedules: [] };
  }

  // 3. Guardar en la base de datos
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE schedules');
    for (const data of allExtractedSchedules) {
      for (const schedule of data.schedules) {
        await client.query(
          `INSERT INTO schedules (route, departure_time, arrival_time, day_of_week, source_image_url)
           VALUES ($1, $2, $3, $4, $5)`,
          [schedule.route, schedule.departure_time, schedule.arrival_time, schedule.day_of_week, data.imageUrl]
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
  return { success: true, message: "Horarios actualizados correctamente.", schedules: allExtractedSchedules };
}
