import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const scheduleSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      day_of_week: { type: Type.STRING, description: "The day of the week the image corresponds to (e.g. 'Lunes', 'Martes', 'Sábado')." },
      departure_time: { type: Type.STRING, description: "Departure time in HH:MM format (24-hour)." },
      arrival_time: { type: Type.STRING, description: "Arrival time at Valparaíso in HH:MM format, if shown. Otherwise omit or null." },
      route: { type: Type.STRING, description: "The full route description as shown in the image." },
    },
    required: ["day_of_week", "departure_time", "route"],
  },
};

export async function extractSchedulesFromImage(imageUrl: string) {
  try {
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');

    const prompt = `Analyze this bus schedule image and extract the bus schedules following these strict rules:
1. Identify which day of the week the image corresponds to (by reading the header/title in the image).
2. Extract ONLY the bus schedules whose route passes through the coastal route: Cartagena -> El Tabo -> El Quisco. Ignore any other routes (e.g., direct routes via Lagunillas, or routes that don't pass through these specific towns).
3. For each matching bus, extract:
   - departure_time: from San Antonio or the first listed stop.
   - arrival_time: at Valparaíso, if shown.
   - route: the full route description exactly as shown in the image.
   - day_of_week: the day identified in step 1.
4. Output strictly as JSON.`;

    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType: response.headers.get('content-type') || 'image/jpeg',
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: scheduleSchema,
      }
    });

    const text = result.text;
    if (!text) throw new Error("No text returned from Gemini");

    return JSON.parse(text);
  } catch (error) {
    console.error("Error extracting schedules:", error);
    throw error;
  }
}
