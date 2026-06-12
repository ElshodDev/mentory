import { dbManager, UserProfile as DbUserProfile } from '../repositories/db.repository';

export class UserService {
  static getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  static getLevel(xp: number): { level: number; title: string; emoji: string } {
    if (xp < 100)  return { level: 1, title: 'Beginner',     emoji: '🌱' };
    if (xp < 300)  return { level: 2, title: 'Elementary',   emoji: '📗' };
    if (xp < 600)  return { level: 3, title: 'Pre-Intermediate', emoji: '📘' };
    if (xp < 1000) return { level: 4, title: 'Intermediate', emoji: '📙' };
    if (xp < 1500) return { level: 5, title: 'Upper-Intermediate', emoji: '🏆' };
    return         { level: 6, title: 'Advanced',      emoji: '💎' };
  }

  static getOrCreateUser(telegramId: number, firstName: string, username?: string): DbUserProfile {
    let profile = dbManager.getUser(telegramId);
    if (!profile) {
      profile = dbManager.createUser({
        telegramId,
        firstName,
        username,
        xp: 0,
        streak: 0,
        lastActiveDate: '',
        totalLessons: 0,
        isSubscribed: false,
        joinedAt: UserService.getTodayDate(),
        league: 'Bronze',
      });
    }
    return profile;
  }

  static addXP(userId: number, amount: number): DbUserProfile {
    let profile = dbManager.getUser(userId);
    if (!profile) {
      profile = dbManager.createUser({
        telegramId: userId,
        firstName: 'GUEST',
        xp: 0,
        streak: 1,
        lastActiveDate: '',
        totalLessons: 0,
        isSubscribed: true,
        joinedAt: UserService.getTodayDate(),
        league: 'Bronze',
      });
    }
    profile.xp += amount;
    const today = UserService.getTodayDate();

    if (profile.lastActiveDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (profile.lastActiveDate === yesterdayStr) {
        profile.streak += 1; // Streak davom etmoqda
      } else {
        profile.streak = 1; // Streak qayta boshlandi
      }
      profile.lastActiveDate = today;
      profile.totalLessons += 1;
    }

    return dbManager.updateUser(profile);
  }

  static completeLesson(userId: number): DbUserProfile | null {
    const profile = dbManager.getUser(userId);
    if (profile) {
      profile.totalLessons += 1;
      return dbManager.updateUser(profile);
    }
    return null;
  }
}
