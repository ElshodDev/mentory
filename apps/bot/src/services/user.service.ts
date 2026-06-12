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

  static async getOrCreateUser(telegramId: number, firstName: string, username?: string): Promise<DbUserProfile> {
    let profile = await dbManager.getUser(telegramId);
    const today = UserService.getTodayDate();

    if (!profile) {
      profile = await dbManager.createUser({
        telegramId,
        firstName,
        username,
        xp: 0,
        streak: 1,
        lastActiveDate: today,
        totalLessons: 0,
        isSubscribed: false,
        joinedAt: today,
        league: 'Bronze',
        referrals: 0,
        wins: 0,
        losses: 0,
        isPremium: false,
      });
    } else {
      // Update streak
      if (profile.lastActiveDate !== today) {
        if (!profile.lastActiveDate) {
          profile.streak = 1;
        } else {
          // Check if yesterday
          const lastDate = new Date(profile.lastActiveDate);
          const currentDate = new Date(today);
          const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            profile.streak += 1;
          } else if (diffDays > 1) {
            profile.streak = 1; // lost streak
          }
        }
        profile.lastActiveDate = today;
        await dbManager.updateUser(profile);
      }
    }
    return profile;
  }

  static async addXP(userId: number, amount: number): Promise<DbUserProfile> {
    let profile = await dbManager.getUser(userId);
    if (!profile) {
      profile = await dbManager.createUser({
        telegramId: userId,
        firstName: 'GUEST',
        xp: 0,
        streak: 1,
        lastActiveDate: '',
        totalLessons: 0,
        isSubscribed: true,
        joinedAt: UserService.getTodayDate(),
        league: 'Bronze',
        referrals: 0,
        wins: 0,
        losses: 0,
        isPremium: false,
      });
    }
    profile.xp += amount;
    const today = UserService.getTodayDate();
    if (profile.lastActiveDate !== today) {
      profile.lastActiveDate = today;
      // Streak calculation is handled in getOrCreateUser primarily, but let's keep it robust
    }
    await dbManager.updateUser(profile);
    return profile;
  }

  static async getLeaderboard(): Promise<{ profile: DbUserProfile; levelInfo: any }[]> {
    const users = await dbManager.getLeaderboard(100);
    return users.map(u => ({
      profile: u,
      levelInfo: UserService.getLevel(u.xp)
    }));
  }

  static async registerReferral(referrerId: number, newUserId: number, firstName: string): Promise<boolean> {
    const existingUser = await dbManager.getUser(newUserId);
    if (existingUser) return false; // Already joined

    // Create the new user
    await dbManager.createUser({
      telegramId: newUserId,
      firstName,
      xp: 0,
      streak: 1,
      lastActiveDate: UserService.getTodayDate(),
      totalLessons: 0,
      isSubscribed: false,
      joinedAt: UserService.getTodayDate(),
      league: 'Bronze',
      referrals: 0,
      referredBy: referrerId,
      isPremium: false,
    });

    // Add referral count and XP to referrer
    const referrer = await dbManager.getUser(referrerId);
    if (referrer) {
      referrer.referrals = (referrer.referrals || 0) + 1;
      referrer.xp += 100; // 100 XP bonus for referring
      await dbManager.updateUser(referrer);
      return true;
    }
    return false;
  }
}
