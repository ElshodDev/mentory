import mongoose, { Schema, Document } from 'mongoose';

// ================= TYPES =================

export interface DailyQuest {
  id: string;
  title: string;
  target: number;
  progress: number;
  completed: boolean;
}

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
  league: string;
  referrals?: number;
  referredBy?: number;
  wins?: number;
  losses?: number;
  isPremium?: boolean;
  englishLevel?: string; // e.g. A1, A2, B1, B2, C1, IELTS
  dailyQuests?: DailyQuest[];
  studyTime?: string; // e.g. "20:30"
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

// ================= SCHEMAS =================

const QuestSchema = new Schema<DailyQuest>({
  id: { type: String, required: true },
  title: { type: String, required: true },
  target: { type: Number, required: true },
  progress: { type: Number, default: 0 },
  completed: { type: Boolean, default: false }
});

const UserSchema = new Schema<UserProfile>({
  telegramId: { type: Number, required: true, unique: true },
  firstName: { type: String, required: true },
  username: { type: String, required: false },
  xp: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  lastActiveDate: { type: String, default: '' },
  totalLessons: { type: Number, default: 0 },
  isSubscribed: { type: Boolean, default: false },
  joinedAt: { type: String, default: '' },
  league: { type: String, default: 'Bronze' },
  referrals: { type: Number, default: 0 },
  referredBy: { type: Number, required: false },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  isPremium: { type: Boolean, default: false },
  englishLevel: { type: String, default: 'Intermediate' },
  dailyQuests: { type: [QuestSchema], default: [] },
  studyTime: { type: String, default: '' }
});

const WordSchema = new Schema<SavedWord>({
  id: { type: String, required: true, unique: true },
  userId: { type: Number, required: true },
  word: { type: String, required: true },
  translation: { type: String, required: true },
  sentence: { type: String, default: '' },
  interval: { type: Number, default: 1 },
  repetitions: { type: Number, default: 0 },
  easeFactor: { type: Number, default: 2.5 },
  nextReviewDate: { type: String, required: true },
});

const FeedbackSchema = new Schema<UserFeedback>({
  id: { type: String, required: true, unique: true },
  userId: { type: Number, required: true },
  rating: { type: Number, required: true },
  comment: { type: String, default: '' },
  createdAt: { type: String, required: true },
});

// Models
const UserModel = mongoose.model<UserProfile>('User', UserSchema);
const WordModel = mongoose.model<SavedWord>('Word', WordSchema);
const FeedbackModel = mongoose.model<UserFeedback>('Feedback', FeedbackSchema);

// ================= MANAGER =================

export const dbManager = {
  // Connection
  async connect(uri: string) {
    if (mongoose.connection.readyState === 1) return;
    try {
      await mongoose.connect(uri);
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB Connection Error:', error);
    }
  },

  // User Methods
  async getUser(telegramId: number): Promise<UserProfile | null> {
    return UserModel.findOne({ telegramId }).lean();
  },

  async createUser(profile: UserProfile): Promise<UserProfile> {
    const user = new UserModel(profile);
    await user.save();
    return user.toObject();
  },

  async updateUser(profile: UserProfile): Promise<UserProfile | null> {
    return UserModel.findOneAndUpdate({ telegramId: profile.telegramId }, profile, { new: true, upsert: true }).lean();
  },

  async getLeaderboard(limit = 100): Promise<UserProfile[]> {
    return UserModel.find().sort({ xp: -1 }).limit(limit).lean();
  },

  async getInactiveUsers(todayDate: string): Promise<UserProfile[]> {
    return UserModel.find({ 
      lastActiveDate: { $nin: [todayDate, ''] }, 
      isSubscribed: true 
    }).lean();
  },

  async getUsersByStudyTime(timeStr: string): Promise<UserProfile[]> {
    return UserModel.find({ studyTime: timeStr }).lean();
  },

  // Word Methods
  async getWords(userId: number): Promise<SavedWord[]> {
    return WordModel.find({ userId }).lean();
  },

  async getWordsToReview(userId: number, todayDate: string): Promise<SavedWord[]> {
    return WordModel.find({ userId, nextReviewDate: { $lte: todayDate } }).lean();
  },

  async saveWord(word: SavedWord): Promise<void> {
    await WordModel.findOneAndUpdate({ id: word.id }, word, { new: true, upsert: true });
  },

  async getWord(userId: number, wordStr: string): Promise<SavedWord | null> {
    const id = `${wordStr.toLowerCase()}_${userId}`;
    return WordModel.findOne({ id }).lean();
  },

  async deleteWord(userId: number, wordStr: string): Promise<void> {
    const id = `${wordStr.toLowerCase()}_${userId}`;
    await WordModel.deleteOne({ id });
  },

  // Feedback Methods
  async addFeedback(feedback: UserFeedback): Promise<void> {
    const fb = new FeedbackModel(feedback);
    await fb.save();
  }
};
