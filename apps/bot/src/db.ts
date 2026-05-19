import fs from 'fs';
import path from 'path';

export interface UserProfile {
  telegramId: number;
  firstName: string;
  username?: string;
  xp: number;
  streak: number;
  lastActiveDate: string; // YYYY-MM-DD
  totalLessons: number;
  isSubscribed: boolean;
  joinedAt: string;
}

export interface SavedWord {
  id: string; // word_userId
  userId: number;
  word: string;
  translation: string;
  sentence: string;
  interval: number; // in days
  repetitions: number;
  easeFactor: number;
  nextReviewDate: string; // YYYY-MM-DD
}

export interface UserFeedback {
  id: string;
  userId: number;
  rating: number;
  comment: string;
  createdAt: string;
}

interface DatabaseSchema {
  users: UserProfile[];
  words: SavedWord[];
  feedbacks?: UserFeedback[];
}

const DB_FILE = path.resolve(__dirname, '../db.json');

// Initialize database file if it doesn't exist
function initDb(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    const defaultData: DatabaseSchema = { users: [], words: [], feedbacks: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(content) as DatabaseSchema;
    if (!data.feedbacks) {
      data.feedbacks = [];
    }
    return data;
  } catch (error) {
    console.error("Error reading database file, resetting:", error);
    const defaultData: DatabaseSchema = { users: [], words: [], feedbacks: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }
}

let dbCache = initDb();

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbCache, null, 2), 'utf-8');
  } catch (error) {
    console.error("Error saving database file:", error);
  }
}

export const dbManager = {
  getUser(telegramId: number): UserProfile | undefined {
    return dbCache.users.find(u => u.telegramId === telegramId);
  },

  createUser(profile: UserProfile): UserProfile {
    const existing = this.getUser(profile.telegramId);
    if (existing) return existing;
    dbCache.users.push(profile);
    saveDb();
    return profile;
  },

  updateUser(profile: UserProfile): UserProfile {
    const index = dbCache.users.findIndex(u => u.telegramId === profile.telegramId);
    if (index !== -1) {
      dbCache.users[index] = profile;
    } else {
      dbCache.users.push(profile);
    }
    saveDb();
    return profile;
  },

  getAllUsers(): UserProfile[] {
    return dbCache.users;
  },

  getWordsForUser(userId: number): SavedWord[] {
    return dbCache.words.filter(w => w.userId === userId);
  },

  saveWord(userId: number, word: string, translation: string, sentence: string): SavedWord {
    const wordId = `${word.toLowerCase()}_${userId}`;
    const today = new Date().toISOString().split('T')[0];
    
    const existing = dbCache.words.find(w => w.id === wordId);
    if (existing) {
      existing.translation = translation;
      existing.sentence = sentence;
      saveDb();
      return existing;
    }

    const newWord: SavedWord = {
      id: wordId,
      userId,
      word,
      translation,
      sentence,
      interval: 1,
      repetitions: 0,
      easeFactor: 2.5,
      nextReviewDate: today
    };

    dbCache.words.push(newWord);
    saveDb();
    return newWord;
  },

  reviewWord(userId: number, word: string, difficulty: 'easy' | 'hard'): SavedWord | undefined {
    const wordId = `${word.toLowerCase()}_${userId}`;
    const wordIndex = dbCache.words.findIndex(w => w.id === wordId);
    if (wordIndex === -1) return undefined;

    const savedWord = dbCache.words[wordIndex];
    const today = new Date();

    if (difficulty === 'easy') {
      savedWord.repetitions += 1;
      if (savedWord.repetitions === 1) {
        savedWord.interval = 1;
      } else if (savedWord.repetitions === 2) {
        savedWord.interval = 3;
      } else if (savedWord.repetitions === 3) {
        savedWord.interval = 7;
      } else {
        savedWord.interval = Math.round(savedWord.interval * savedWord.easeFactor);
      }
    } else {
      // Hard - reset repetitions and set interval to 1 day
      savedWord.repetitions = 0;
      savedWord.interval = 1;
    }

    const nextDate = new Date();
    nextDate.setDate(today.getDate() + savedWord.interval);
    savedWord.nextReviewDate = nextDate.toISOString().split('T')[0];

    dbCache.words[wordIndex] = savedWord;
    saveDb();
    return savedWord;
  },

  saveFeedback(userId: number, rating: number, comment: string): UserFeedback {
    if (!dbCache.feedbacks) {
      dbCache.feedbacks = [];
    }
    const feedback: UserFeedback = {
      id: `${userId}_${Date.now()}`,
      userId,
      rating,
      comment,
      createdAt: new Date().toISOString(),
    };
    dbCache.feedbacks.push(feedback);
    saveDb();
    return feedback;
  },

  getAllFeedbacks(): UserFeedback[] {
    return dbCache.feedbacks || [];
  }
};
