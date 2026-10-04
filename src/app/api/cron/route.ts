import { NextResponse } from 'next/server';
import { fetchLatestFacebookImages } from '@/lib/apify';
import { extractSchedulesFromImage } from '@/lib/ai';
import { pool } from '@/lib/db';

export async function GET(request: Request) {
  // 1. Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    console.log("Starting cron job to check for new schedules...");
    
    // 2. Fetch images from Facebook
    const facebookPage = "https://www.facebook.com/PullmanLagoPenuelas";
    const images = await fetchLatestFacebookImages(facebookPage, 3);
    
    if (images.length === 0) {
      return NextResponse.json({ message: "No images found in recent posts" });
    }

    let allExtractedSchedules: any[] = [];
    
    // 3. Process each image with Gemini
    // (In a real scenario, you might want to track which images you've already processed
    // to avoid re-processing the same image every day. For simplicity, we process the latest).
    for (const imageUrl of images.slice(0, 2)) {
      console.log(`Processing image: ${imageUrl}`);
      const schedules = await extractSchedulesFromImage(imageUrl);
      
      if (schedules && schedules.length > 0) {
        allExtractedSchedules.push({ imageUrl, schedules });
      }
    }
    
    // 4. Save to Database
    if (allExtractedSchedules.length > 0) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Optionally clear old schedules or merge them. Here we just insert new ones.
        // In a production app, you'd want to truncate the table or update existing rows.
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
        console.log("Successfully saved new schedules to database.");
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Successfully processed schedules",
      data: allExtractedSchedules 
    });
    
  } catch (error: any) {
    console.error("Cron Job Failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
