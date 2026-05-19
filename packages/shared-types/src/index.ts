export interface UserProfile {
  telegramId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  xp: number;
  streak: number;
  lastActiveDate: string;
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  isSubscribedToChannel: boolean;
  isPremium: boolean;
  createdAt: string;
}

export interface WordCard {
  id: string;
  word: string;
  translation: string;
  phonetic?: string;
  audioUrl?: string;
  exampleSentence: string;
  exampleTranslation: string;
  difficultyRating: number; // 1-5 for SRS
  nextReviewDate: string;
}

export interface ReadingSession {
  id: string;
  title: string;
  text: string;
  clickedWords: string[];
  summaryTriggered: boolean;
  aiSummaryExplanation?: string;
  aiSummaryImageUrl?: string;
  completed: boolean;
  xpEarned: number;
}

export interface SpeakingPracticeResult {
  id: string;
  audioUrl: string;
  transcript: string;
  fluencyScore: number; // 0-100 or IELTS 0-9
  accuracyScore: number;
  pronunciationScore: number;
  aiFeedback: string;
  correctedTranscript?: string;
}

export type TaskType = 'task1_1' | 'task1_2' | 'task2';
export type SituationType = 'cancellation' | 'change' | 'feedback' | 'new_plans' | 'complaint' | 'preference';
export type Sentiment = 'positive' | 'negative' | 'mixed';
export type Task2Type = 'advantages_disadvantages' | 'opinion';

export interface WritingRequest {
  taskType: TaskType;
  situationType?: SituationType;
  sentiment?: Sentiment;
  task2Type?: Task2Type;
  userText?: string; // tekshirish uchun
}

export interface WritingResponse {
  structure: string;
  sample: string;
  wordCount: number;
  score?: number;
  feedback?: string;
}
