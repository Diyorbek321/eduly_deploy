import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;
try {
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
  }
} catch (err) {
  console.warn("Gemini init failed:", err);
  ai = null;
}

export async function askTutor(question: string, context?: string): Promise<string> {
  if (!ai) {
    return "AI Tutor is disabled. Set GEMINI_API_KEY in .env.local to enable.";
  }
  try {
    const systemInstruction = `
      You are an expert AI Tutor for "Student Quest," a gamified learning platform.
      Your goal is to explain complex topics (Math, Science, History, etc.) in an engaging,
      clear, and encouraging way.

      Always try to use relatable analogies (sports, gaming, movies) when explaining
      difficult concepts. Keep your responses concise but thorough.

      Current Student Context: ${context || 'General study session'}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: question,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text ?? "";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having a bit of a brain fog right now. Could you try asking again in a moment?";
  }
}
