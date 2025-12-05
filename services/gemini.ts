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
    const base64Audio = await blobToBase64(audioBlob);
    
    // Determine the system instruction based on user preference or default behavior
    let typeContext = "";
    if (noteType === NoteType.MEETING) {
      typeContext = "Treat this recording explicitly as a Meeting. Format the output as Meeting Minutes (Attendees, Decisions, Action Items, etc.).";
    } else if (noteType === NoteType.LECTURE) {
      typeContext = "Treat this recording explicitly as a Learning Lecture. Format the output as Study Notes/Summary (Key Topics, Important Concepts, Summary, etc.).";
    } else {
      typeContext = "Analyze the audio to determine if it is a Meeting or a Lecture. If it sounds like a meeting, format as Meeting Minutes. If it sounds like a lecture/tutorial, format as Study Notes.";
    }

    const prompt = `
      You are an expert transcriber and summarizer. 
      The audio provided is in ${language} language.
      
      Your task:
      1. Listen to the audio carefully.
      2. ${typeContext}
      3. **CRITICAL**: The final output MUST be in the Myanmar (Burmese) language. Use English only for specific technical terms that are hard to translate.
      4. Ensure the formatting is clean, using Markdown (headings, bullet points, bold text).
      5. Do not include any preamble like "Here is the summary". Start directly with the content.
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
            text: prompt
          }
        ]
      },
      config: {
        temperature: 0.4, // Lower temperature for more accurate transcription/summarization
      }
    });

    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Error generating notes:", error);
    throw error;
  }
};