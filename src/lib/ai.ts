import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Define the expected output structure using JSON schema
const scheduleSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      route: { type: Type.STRING, description: "The route, e.g., 'San Antonio - Valparaiso'" },
      departure_time: { type: Type.STRING, description: "Departure time in HH:MM format (24-hour)" },
      arrival_time: { type: Type.STRING, description: "Estimated arrival time in HH:MM format, if available. Otherwise omit." },
      day_of_week: { type: Type.STRING, description: "Days this schedule applies, e.g., 'Lunes a Viernes', 'Sábado', 'Domingo'" },
    },
    required: ["route", "departure_time", "day_of_week"],
  },
};

export async function extractSchedulesFromImage(imageUrl: string) {
  try {
    // 1. Fetch the image as base64
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    
    // 2. Call Gemini
    const result = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: "Extract the bus departure times from this schedule image. Look for routes between San Antonio and Valparaiso (via the coast: Cartagena, El Tabo, El Quisco, Algarrobo). Output strictly as JSON." },
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
