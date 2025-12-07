import { GoogleGenAI } from "@google/genai";
import { NoteType, SourceLanguage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Converts a Blob to a Base64 string.
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:audio/wav;base64,")
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Generates notes from audio using Gemini.
 */
export const generateNotesFromAudio = async (audioBlob: Blob, noteType: NoteType, language: SourceLanguage): Promise<string> => {
  try {
    // Check size limit (Gemini inline data limit approx 20MB, using 18MB as safe margin)
    const sizeInMB = audioBlob.size / (1024 * 1024);
    if (sizeInMB > 18) {
      throw new Error("အသံဖိုင်အရွယ်အစား ကြီးလွန်းပါသည် (Max 18MB). ကျေးဇူးပြု၍ အသံသွင်းချိန် လျှော့ချပါ။");
    }

    const base64Audio = await blobToBase64(audioBlob);
    
    // Determine the type context
    let typeContext = "";
    if (noteType === NoteType.MEETING) {
      typeContext = "Treat this recording explicitly as a Meeting. Format the output as Meeting Minutes (Attendees, Decisions, Action Items, etc.).";
    } else if (noteType === NoteType.LECTURE) {
      typeContext = "Treat this recording explicitly as a Learning Lecture. Format the output as Study Notes/Summary (Key Topics, Important Concepts, Summary, etc.).";
    } else {
      typeContext = "Analyze the audio to determine if it is a Meeting or a Lecture. If it sounds like a meeting, format as Meeting Minutes. If it sounds like a lecture/tutorial, format as Study Notes.";
    }

    // Determine Language Context
    let languageInstruction = "";
    if (language === SourceLanguage.AUTO) {
      languageInstruction = "Detect the source audio language automatically (it is likely English, Russian, or Burmese).";
    } else {
      languageInstruction = `The source audio language is ${language}.`;
    }

    const systemInstruction = `You are an expert transcriber and summarizer for Myanmar (Burmese) speaking users. 
    ${languageInstruction}
    ${typeContext}
    
    Output Rules:
    1. **Language**: The final output MUST be in the Myanmar (Burmese) language.
    2. **Terminology**: Use English only for specific technical terms or proper nouns that are hard to translate accurately.
    3. **Formatting**: Use clean, professional Markdown (headers, bullet points, bold text).
    4. **Structure**: Do not include introductory phrases. Start directly with the content.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioBlob.type, 
              data: base64Audio
            }
          },
          {
            text: "Please generate the notes now."
          }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.4, 
      }
    });

    return response.text || "Could not generate summary.";
  } catch (error: any) {
    console.error("Error generating notes:", error);
    // Propagate the specific error message if it's our size check
    if (error.message && error.message.includes("Max 18MB")) {
      throw error;
    }
    throw new Error("လုပ်ဆောင်ချက် မအောင်မြင်ပါ။ အင်တာနက်လိုင်း စစ်ဆေးပြီး ပြန်ကြိုးစားကြည့်ပါ။");
  }
};