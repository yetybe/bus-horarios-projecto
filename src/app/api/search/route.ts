import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const day = searchParams.get('day');
    const arrivalHour = searchParams.get('arrival_hour');

    const client = await pool.connect();

    try {
      // If no params, return all schedules for the week
      if (!day && !arrivalHour) {
        const res = await client.query(
          'SELECT * FROM weekly_schedules ORDER BY day_date ASC, departure_time ASC'
        );

        const weekLabel = res.rows.length > 0 ? res.rows[0].week_label : null;

        return NextResponse.json({
          success: true,
          week_label: weekLabel,
          all_schedules: res.rows,
          recommended: null,
        });
      }

      // Query schedules for the specific day
      let query = 'SELECT * FROM weekly_schedules';
      const params: string[] = [];

      if (day) {
        params.push(day);
        query += ` WHERE LOWER(day_of_week) = LOWER($1)`;
      }

      query += ' ORDER BY departure_time ASC';

      const res = await client.query(query, params);
      const schedules = res.rows;
      const weekLabel = schedules.length > 0 ? schedules[0].week_label : null;

      // Find recommended bus if arrival_hour is specified
      let recommended = null;
      if (arrivalHour && schedules.length > 0) {
        const requestedMinutes = timeToMinutes(arrivalHour);

        // Find the best bus: arrival_time <= requested time, closest to it
        let bestMatch = null;
        let bestDiff = Infinity;

        for (const schedule of schedules) {
          // Use arrival_time if available, otherwise estimate as departure + 90 min
          let arrivalMinutes: number;
          if (schedule.arrival_time) {
            const arrTimeStr = typeof schedule.arrival_time === 'string'
              ? schedule.arrival_time
              : schedule.arrival_time.substring(0, 5);
            arrivalMinutes = timeToMinutes(arrTimeStr);
          } else {
            const depTimeStr = typeof schedule.departure_time === 'string'
              ? schedule.departure_time
              : schedule.departure_time.substring(0, 5);
            arrivalMinutes = timeToMinutes(depTimeStr) + 90; // estimate 1.5h
          }

          const diff = requestedMinutes - arrivalMinutes;

          // Bus arrives before or at the requested time
          if (diff >= 0 && diff < bestDiff) {
            bestDiff = diff;
            bestMatch = schedule;
          }
        }

        // If no bus arrives before, recommend the earliest bus after
        if (!bestMatch) {
          let closestAfter = null;
          let closestDiff = Infinity;

          for (const schedule of schedules) {
            let arrivalMinutes: number;
            if (schedule.arrival_time) {
              const arrTimeStr = typeof schedule.arrival_time === 'string'
                ? schedule.arrival_time
                : schedule.arrival_time.substring(0, 5);
              arrivalMinutes = timeToMinutes(arrTimeStr);
            } else {
              const depTimeStr = typeof schedule.departure_time === 'string'
                ? schedule.departure_time
                : schedule.departure_time.substring(0, 5);
              arrivalMinutes = timeToMinutes(depTimeStr) + 90;
            }

            const diff = arrivalMinutes - requestedMinutes;
            if (diff >= 0 && diff < closestDiff) {
              closestDiff = diff;
              closestAfter = schedule;
            }
          }

          bestMatch = closestAfter;
        }

        recommended = bestMatch;
      }

      return NextResponse.json({
        success: true,
        week_label: weekLabel,
        recommended,
        all_schedules: schedules,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Search error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}
