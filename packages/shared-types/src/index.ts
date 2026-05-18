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
