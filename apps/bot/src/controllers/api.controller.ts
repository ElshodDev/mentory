import { Router } from 'express';
import { AIService } from '../services/ai.service';
import { UserService } from '../services/user.service';
import { dbManager } from '../repositories/db.repository';
import { Bot } from 'grammy';

export function createApiRouter(bot: Bot<any>, channelUsername: string) {
  const router = Router();

  router.post('/translate', async (req, res) => {
    try {
      const { word, sentence } = req.body;
      const translation = await AIService.translateWord(word, sentence);
      res.json({ translation });
    } catch (error) {
      res.status(500).json({ error: "Tarjimada xatolik" });
    }
  });

  router.get('/profile/:id', async (req, res) => {
    const userId = Number(req.params.id);
    let profile = UserService.getOrCreateUser(
      userId,
      req.query.firstName ? String(req.query.firstName) : 'GUEST',
      req.query.username ? String(req.query.username) : 'guest_user'
    );

    if (profile.totalLessons >= 1) {
      try {
        const member = await bot.api.getChatMember(channelUsername, userId);
        const isOk = ['member', 'administrator', 'creator'].includes(member.status);
        profile.isSubscribed = isOk;
        dbManager.updateUser(profile);
      } catch (err) {
        // Keep existing
      }
    }
    res.json(profile);
  });

  router.get('/user/subscription/:id', async (req, res) => {
    const userId = Number(req.params.id);
    try {
      const member = await bot.api.getChatMember(channelUsername, userId);
      const isOk = ['member', 'administrator', 'creator'].includes(member.status);
      const profile = dbManager.getUser(userId);
      if (profile) {
        profile.isSubscribed = isOk;
        dbManager.updateUser(profile);
      }
      res.json({ isSubscribed: isOk });
    } catch (error) {
      res.json({ isSubscribed: false });
    }
  });

  router.get('/reading', async (req, res) => {
    try {
      const level = req.query.level ? String(req.query.level) : 'B1';
      const readingData = await AIService.generateReadingPassage(level);
      res.json(readingData);
    } catch (error: any) {
      console.error("READING GENERATION ERROR:", error);
      res.status(500).json({ error: "Yangi matn generatsiya qilishda xatolik yuz berdi" });
    }
  });

  router.post('/words', (req, res) => {
    try {
      const { userId, word, translation, sentence } = req.body;
      if (!userId || !word || !translation) {
        return res.status(400).json({ error: "Missing fields" });
      }
      const saved = dbManager.saveWord(Number(userId), word, translation, sentence || '');
      res.json(saved);
    } catch (error) {
      res.status(500).json({ error: "So'zni saqlashda xatolik" });
    }
  });

  router.get('/words/:userId', (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const words = dbManager.getWordsForUser(userId);
      res.json(words);
    } catch (error) {
      res.status(500).json({ error: "So'zlarni yuklashda xatolik" });
    }
  });

  router.post('/words/review', (req, res) => {
    try {
      const { userId, word, difficulty } = req.body;
      if (!userId || !word || !difficulty) {
        return res.status(400).json({ error: "Missing fields" });
      }
      const updated = dbManager.reviewWord(Number(userId), word, difficulty);
      if (updated) {
        res.json(updated);
      } else {
        res.status(404).json({ error: "So'z topilmadi" });
      }
    } catch (error) {
      res.status(500).json({ error: "SRS yangilashda xatolik" });
    }
  });

  router.get('/leaderboard', (req, res) => {
    try {
      const users = dbManager.getAllUsers();
      const sorted = users.sort((a, b) => b.xp - a.xp).slice(0, 10);
      res.json(sorted);
    } catch (error) {
      res.status(500).json({ error: "Leaderboard yuklashda xatolik" });
    }
  });

  router.post('/user/xp', (req, res) => {
    try {
      const { userId, amount } = req.body;
      if (!userId || amount === undefined) {
        return res.status(400).json({ error: "Missing fields" });
      }
      const updatedProfile = UserService.addXP(Number(userId), Number(amount));
      res.json(updatedProfile);
    } catch (error) {
      res.status(500).json({ error: "XP qo'shishda xatolik" });
    }
  });

  router.post('/user/lesson-completed', (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
      }
      const updated = UserService.completeLesson(Number(userId));
      if (updated) {
        res.json(updated);
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Lesson update failed" });
    }
  });

  router.post('/writing', async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Missing message field" });
      }
      const reply = await AIService.chatWithWritingTutor(message);
      res.json({ reply });
    } catch (error: any) {
      console.error("EXPRESS WRITING ERROR:", error);
      res.status(500).json({ error: error.message || error });
    }
  });

  router.post('/voice-assessment', async (req, res) => {
    try {
      const { userId, audio, mimeType, topic } = req.body;
      if (!userId || !audio) {
        return res.status(400).json({ error: "Missing fields: userId and audio are required" });
      }
      
      const assessment = await AIService.evaluateVoiceAssessment(audio, mimeType, topic);
      const updatedProfile = UserService.addXP(Number(userId), 20);

      res.json({ assessment, profile: updatedProfile });
    } catch (error: any) {
      console.error("VOICE ASSESSMENT ERROR:", error);
      res.status(500).json({ error: error.message || error });
    }
  });

  router.post('/feedback', (req, res) => {
    try {
      const { userId, rating, comment } = req.body;
      if (!userId || rating === undefined || comment === undefined) {
        return res.status(400).json({ error: "Missing fields" });
      }
      const feedback = dbManager.saveFeedback(Number(userId), Number(rating), comment);
      res.json(feedback);
    } catch (error) {
      console.error("FEEDBACK ERROR:", error);
      res.status(500).json({ error: "Feedback saqlashda xatolik" });
    }
  });

  return router;
}
