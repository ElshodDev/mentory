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

  static async extractWordsFromImage(imageBuffer: string, mimeType: string): Promise<any> {
    const prompt = `You are an expert English teacher. I am providing you an image (e.g. a book page, sign, or screenshot).
1. Read the text from the image.
2. Identify up to 10 of the most difficult or important English words/phrases in the text.
3. Translate them into Uzbek.
4. You MUST return ONLY a raw JSON array matching this exact structure:
[
  {
    "word": "English word",
    "translation": "Uzbek translation",
    "sentence": "A short example sentence in English using this word"
  }
]
Do not wrap in markdown code blocks. Just the raw JSON array.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBuffer,
          mimeType: mimeType
        }
      }
    ]);

    const resText = result.response.text().trim();
    const cleanJson = resText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    
    try {
      return JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("JSON PARSE ERROR on OCR:", resText);
      return [];
    }
  }

  static async generateShadowingSentence(level: string): Promise<{ sentence: string; translation: string }> {
    const prompt = `Generate one single English sentence suitable for level ${level} to be used for pronunciation shadowing. 
Also provide its Uzbek translation.
Return ONLY raw JSON in this format:
{
  "sentence": "The English sentence here.",
  "translation": "O'zbekcha tarjimasi."
}`;
    const result = await model.generateContent(prompt);
    const resText = result.response.text().trim();
    const cleanJson = resText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    try {
      return JSON.parse(cleanJson);
    } catch (e) {
      return { sentence: "Practice makes perfect.", translation: "Mashq qilish mukammallikka olib keladi." };
    }
  }

  static async evaluateShadowing(audioBase64: string, mimeType: string, targetSentence: string): Promise<any> {
    const prompt = `You are an expert English pronunciation coach. I am providing an audio recording of a student trying to say this exact sentence: "${targetSentence}".
1. Listen to the audio.
2. Evaluate their pronunciation, accent, and fluency.
3. Give a score from 0 to 100.
4. Provide a brief feedback in Uzbek (e.g., which words were mispronounced).
Return ONLY raw JSON matching this structure:
{
  "score": 85,
  "feedback": "Siz 'perfect' so'zidagi 'r' harfini juda qattiq aytdingiz. Umumiy intonatsiya yaxshi."
}
Do not wrap in markdown code blocks.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: audioBase64,
          mimeType: mimeType
        }
      }
    ]);

    const resText = result.response.text().trim();
    const cleanJson = resText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    
    try {
      return JSON.parse(cleanJson);
    } catch (parseError) {
      return { score: 0, feedback: "Ovozni tahlil qilishda xatolik yuz berdi." };
    }
  }

  static async generateMockQuestions(): Promise<any> {
    const prompt = `Generate a standard IELTS Speaking test.
Return ONLY raw JSON matching this structure exactly:
{
  "part1": ["Question 1 about hometown?", "Question 2 about hobbies?"],
  "part2": {
    "topic": "Describe a book you read recently.",
    "bulletPoints": ["What the book is", "When you read it", "What it is about", "And explain why you liked it"]
  },
  "part3": ["Follow up question 1?", "Follow up question 2?"]
}
Do not wrap in markdown.`;

    const result = await model.generateContent(prompt);
    const resText = result.response.text().trim();
    const cleanJson = resText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleanJson);
  }

  static async evaluateMockIELTS(audioPartsBase64: string[], mimeType: string, questions: any): Promise<any> {
    // If we have 5 audio parts (2 from part1, 1 from part2, 2 from part3)
    const prompt = `You are a strict IELTS Speaking examiner. I will provide you with a student's audio recordings for a mock test.
The test consisted of these questions:
${JSON.stringify(questions, null, 2)}

1. Listen to all audio parts carefully.
2. Evaluate Fluency, Lexical Resource, Grammatical Range, and Pronunciation.
3. Give an overall IELTS Band Score (e.g. 6.0, 6.5, 7.0).
4. Provide detailed feedback in Uzbek.
Return ONLY raw JSON matching this structure:
{
  "bandScore": 6.5,
  "feedback": "Umumiy fikringiz...",
  "strengths": ["Kuchli jihat 1", "Kuchli jihat 2"],
  "weaknesses": ["Xato 1", "Xato 2"]
}
Do not wrap in markdown code blocks.`;

    const contentParts: any[] = [prompt];
    for (const audio of audioPartsBase64) {
      if (audio) {
        contentParts.push({
          inlineData: {
            data: audio,
            mimeType: mimeType
          }
        });
      }
    }

    const result = await model.generateContent(contentParts);
    const resText = result.response.text().trim();
    const cleanJson = resText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    try {
      return JSON.parse(cleanJson);
    } catch (e) {
      return { bandScore: 0, feedback: "Kechirasiz, audiolarni baholashda xatolik yuz berdi.", strengths: [], weaknesses: [] };
    }
  }

  static async extractVideoVocabulary(transcript: string, limit: number = 10): Promise<any[]> {
    // Take first 5000 chars of transcript to avoid huge tokens if video is 2 hours long,
    // we just want general vocab from the video
    const limitedTranscript = transcript.substring(0, 5000);
    
    const prompt = `Here is a transcript from a YouTube video:
"${limitedTranscript}"

Extract ${limit} of the most useful/complex English words from this transcript for an intermediate English learner.
For each word, provide:
1. "word": The word in English
2. "translation": Its Uzbek translation based on context
3. "sentence": The example sentence from the transcript where it appeared.

Return ONLY raw JSON in this format (an array of objects):
[
  { "word": "example", "translation": "misol", "sentence": "This is an example sentence." }
]
Do not wrap in markdown code blocks.`;

    const result = await model.generateContent(prompt);
    const resText = result.response.text().trim();
    const cleanJson = resText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    try {
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error("Vocabulary extraction error", e);
      return [];
    }
  }
}
