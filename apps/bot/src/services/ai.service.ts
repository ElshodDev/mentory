import { GoogleGenerativeAI } from '@google/generative-ai';
import { WRITING_TUTOR_PROMPT } from '../prompts/writing-tutor.prompt';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

export class AIService {
  static async translateWord(word: string, sentence: string): Promise<string> {
    const prompt = `Act as an English teacher. Translate the word/phrase "${word}" to Uzbek in the context of the sentence: "${sentence}". Provide ONLY the translation and a very brief explanation.`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }

  static async generateReadingPassage(level: string): Promise<any> {
    const prompt = `You are an IELTS English teacher. Create a short, interesting reading passage (about 80-120 words) suitable for IELTS level ${level}.
Topic: A random interesting topic (e.g., science, technology, history, environment, psychology, or culture).
You must return ONLY a JSON object with this exact structure:
{
  "title": "A short engaging title",
  "text": "The full reading passage text",
  "hardWords": [
    { "word": "word1", "trans": "translation of word1 in Uzbek", "isHard": true },
    { "word": "word2", "trans": "translation of word2 in Uzbek", "isHard": true },
    { "word": "word3", "trans": "translation of word3 in Uzbek", "isHard": true }
  ]
}
Ensure the passage has at least 3-4 advanced/academic words for that level that are listed in "hardWords".
Do not include any markdown formatting, backticks, or text before/after the JSON. Just the raw JSON.`;
    
    const result = await model.generateContent(prompt);
    const resText = result.response.text().trim();
    const cleanJson = resText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleanJson);
  }

  static async chatWithWritingTutor(message: string): Promise<string> {
    const writingModel = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: WRITING_TUTOR_PROMPT,
    });
    const result = await writingModel.generateContent(message);
    return result.response.text();
  }

  static async evaluateVoiceAssessment(audioBuffer: string, mimeType: string, topic?: string): Promise<any> {
    const prompt = `You are an expert IELTS Speaking examiner. Evaluate this spoken response from a student.
${topic ? `The speaking prompt topic is: "${topic}"` : ''}

You MUST return ONLY a raw JSON object (do not wrap in markdown code blocks, do not output any other text) matching this TypeScript structure:
{
  "transcript": "Exact transcription of what the student said in English",
  "corrections": [
    {
      "original": "Incorrect or clumsy phrase/word used by user",
      "corrected": "Improved or corrected version of that phrase/word",
      "explanation": "Brief explanation in Uzbek of the mistake and how to fix it"
    }
  ],
  "pronunciation": "Feedback on their pronunciation, accent, and word stress in Uzbek",
  "fluency": "Feedback on their speaking pace, hesitation, and sentence flow in Uzbek",
  "bandScore": "Estimated IELTS Speaking band score (e.g. 5.0, 6.0, 7.5)"
}

Keep all Uzbek explanations short, clear, and encouraging. Ensure the JSON is valid and parsing-friendly.`;

    const chatModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await chatModel.generateContent([
      prompt,
      {
        inlineData: {
          data: audioBuffer,
          mimeType: mimeType || "audio/webm"
        }
      }
    ]);

    const resText = result.response.text().trim();
    const cleanJson = resText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    
    try {
      return JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("JSON PARSE ERROR on Gemini output:", resText);
      return {
        transcript: "Listening completed, failed to structure JSON.",
        corrections: [],
        pronunciation: "Talaffuz tahlil qilinib bo'lmadi.",
        fluency: "Ravonlik tahlil qilinib bo'lmadi.",
        bandScore: "N/A",
        rawText: resText
      };
    }
  }

  static async generateQuiz(level: string): Promise<any> {
    const prompt = `You are an expert English teacher. Create a short multiple-choice grammar and vocabulary quiz for an IELTS/CEFR student at ${level} level.
You MUST return ONLY a raw JSON array of 5 questions (do not wrap in markdown code blocks). Use this structure:
[
  {
    "question": "The sentence with a blank or the question text.",
    "options": ["A) option 1", "B) option 2", "C) option 3", "D) option 4"],
    "correctAnswer": 0, // index of the correct option (0-3)
    "explanation": "Brief explanation in Uzbek why this is the correct answer."
  }
]`;

    const result = await model.generateContent(prompt);
    const resText = result.response.text().trim();
    const cleanJson = resText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    
    try {
      return JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("JSON PARSE ERROR on Quiz generation:", resText);
      return [];
    }
  }
}
