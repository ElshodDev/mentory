import { Router } from 'express';
import { AIService } from '../services/ai.service';
import { UserService } from '../services/user.service';
import { dbManager } from '../repositories/db.repository';
import { Bot } from 'grammy';
import { YoutubeTranscript } from 'youtube-transcript';

export function createApiRouter(bot?: Bot<any>, channelUsername?: string) {
  const router = Router();

  router.post('/translate', async (req, res) => {
    try {
      const { word, sentence } = req.body;
      const data = await AIService.translateWord(word, sentence);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Tarjimada xatolik" });
    }
  });

  router.get('/profile/:id', async (req, res) => {
    const userId = Number(req.params.id);
    let profile = await UserService.getOrCreateUser(
      userId,
      req.query.firstName ? String(req.query.firstName) : 'GUEST',
      req.query.username ? String(req.query.username) : 'guest_user'
    );

    if (profile.totalLessons >= 1 && bot && channelUsername) {
      try {
        const member = await bot.api.getChatMember(`@${channelUsername}`, userId);
        const isOk = ['member', 'administrator', 'creator'].includes(member.status);
        profile.isSubscribed = isOk;
        await dbManager.updateUser(profile);
      } catch (err) {
        // Keep existing
      }
    }
    res.json(profile);
  });

  router.get('/user/subscription/:id', async (req, res) => {
    const userId = Number(req.params.id);
    try {
      if (!bot || !channelUsername) return res.json({ subscribed: false });
      const member = await bot.api.getChatMember(`@${channelUsername}`, userId);
      const isOk = ['member', 'administrator', 'creator'].includes(member.status);
      const profile = await dbManager.getUser(userId);
      if (profile) {
        profile.isSubscribed = isOk;
        await dbManager.updateUser(profile);
      }
      res.json({ subscribed: isOk });
    } catch (e) {
      res.json({ subscribed: false });
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

  router.post('/reading/custom', async (req, res) => {
    try {
      const { text, imageBase64, mimeType } = req.body;
      if (!text && !imageBase64) {
        return res.status(400).json({ error: "Matn yoki rasm yuborilmadi" });
      }
      const readingData = await AIService.generateCustomReading(text, imageBase64, mimeType);
      res.json(readingData);
    } catch (error: any) {
      console.error("CUSTOM READING GENERATION ERROR:", error);
      res.status(500).json({ error: "Shaxsiy matnni o'qishda xatolik yuz berdi" });
    }
  });

  router.get('/quizzes', async (req, res) => {
    try {
      const level = req.query.level ? String(req.query.level) : 'B1';
      const quizData = await AIService.generateQuiz(level);
      res.json(quizData);
    } catch (error: any) {
      console.error("QUIZ GENERATION ERROR:", error);
      res.status(500).json({ error: "Testlarni yuklashda xatolik yuz berdi" });
    }
  });

  router.get('/battles/matchmake', async (req, res) => {
    try {
      const level = req.query.level ? String(req.query.level) : 'B1';
      const userId = req.query.userId ? Number(req.query.userId) : 0;
      
      const allUsers = await dbManager.getLeaderboard(100);
      const possibleOpponents = allUsers.filter(u => u.telegramId !== userId);
      const opponent = possibleOpponents.length > 0 
        ? possibleOpponents[Math.floor(Math.random() * possibleOpponents.length)] 
        : { telegramId: 0, firstName: "Mentory AI", xp: 500, league: 'Silver', wins: 10, losses: 5 };

      const questions = await AIService.generateQuiz(level);
      const opponentScore = Math.floor(Math.random() * 4) + 1;

      res.json({ opponent, questions, opponentScore });
    } catch (error) {
      console.error("MATCHMAKE ERROR:", error);
      res.status(500).json({ error: "Jang uchun raqib topishda xatolik yuz berdi" });
    }
  });

  router.post('/battles/complete', async (req, res) => {
    try {
      const { userId, opponentId, userScore, opponentScore } = req.body;
      const user = await dbManager.getUser(Number(userId));
      const opponent = await dbManager.getUser(Number(opponentId));

      if (!user) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });

      const isWin = userScore > opponentScore;
      const isDraw = userScore === opponentScore;

      if (isWin) {
        user.xp += 100;
        user.wins = (user.wins || 0) + 1;
        if (opponent) {
          opponent.xp = Math.max(0, opponent.xp - 20);
          opponent.losses = (opponent.losses || 0) + 1;
        }
      } else if (!isDraw) {
        user.xp = Math.max(0, user.xp - 20);
        user.losses = (user.losses || 0) + 1;
        if (opponent) {
          opponent.xp += 100;
          opponent.wins = (opponent.wins || 0) + 1;
        }
      }

      await dbManager.updateUser(user);
      if (opponent) await dbManager.updateUser(opponent);

      res.json({ success: true, profile: user });
    } catch (error) {
      console.error("BATTLE COMPLETE ERROR:", error);
      res.status(500).json({ error: "Jang natijasini saqlashda xatolik" });
    }
  });

  router.get('/shadowing/sentence', async (req, res) => {
    try {
      const level = req.query.level ? String(req.query.level) : 'B1';
      const data = await AIService.generateShadowingSentence(level);
      res.json(data);
    } catch (error) {
      console.error("SHADOWING SENTENCE ERROR:", error);
      res.status(500).json({ error: "Jumla yuklashda xatolik" });
    }
  });

  router.post('/shadowing/evaluate', async (req, res) => {
    try {
      const { userId, audioBase64, mimeType, targetSentence } = req.body;
      const evaluation = await AIService.evaluateShadowing(audioBase64, mimeType, targetSentence);
      
      const user = await dbManager.getUser(Number(userId));
      if (user && evaluation.score >= 50) {
        const xpEarned = Math.floor(evaluation.score / 5);
        user.xp += xpEarned;
        await dbManager.updateUser(user);
        evaluation.xpEarned = xpEarned;
        evaluation.profile = user;
      }
      
      res.json(evaluation);
    } catch (error) {
      console.error("SHADOWING EVALUATE ERROR:", error);
      res.status(500).json({ error: "Ovozni tahlil qilishda xatolik" });
    }
  });

  router.get('/mock-test/questions', async (req, res) => {
    try {
      const data = await AIService.generateMockQuestions();
      res.json(data);
    } catch (error) {
      console.error("MOCK TEST QUESTIONS ERROR:", error);
      res.status(500).json({ error: "Savollarni yuklashda xatolik" });
    }
  });

  router.post('/mock-test/evaluate', async (req, res) => {
    try {
      const { userId, audioPartsBase64, mimeType, questions } = req.body;
      const evaluation = await AIService.evaluateMockIELTS(audioPartsBase64, mimeType, questions);
      
      const user = await dbManager.getUser(Number(userId));
      if (user && evaluation.bandScore > 0) {
        user.xp += 500;
        await dbManager.updateUser(user);
        evaluation.xpEarned = 500;
        evaluation.profile = user;
      }
      
      res.json(evaluation);
    } catch (error) {
      console.error("MOCK TEST EVALUATE ERROR:", error);
      res.status(500).json({ error: "Testni tahlil qilishda xatolik" });
    }
  });

  router.get('/video/transcript', async (req, res) => {
    try {
      const videoId = String(req.query.videoId);
      let transcript;
      try {
        transcript = await YoutubeTranscript.fetchTranscript(videoId);
      } catch (e) {
        // Fallback demo transcript if youtube blocks it
        transcript = [
          { text: "Welcome to this video!", duration: 3000, offset: 0 },
          { text: "Currently, YouTube has blocked automatic transcript downloads for this server.", duration: 4000, offset: 3000 },
          { text: "This is a demonstration of how the transcript feature works.", duration: 4000, offset: 7000 },
          { text: "You can click on any word to translate it and save it.", duration: 4000, offset: 11000 },
          { text: "Enjoy learning English with Mentory AI!", duration: 4000, offset: 15000 },
          { text: "People do it when they meet each other.", duration: 4000, offset: 19000 },
          { text: "Practice makes perfect.", duration: 3000, offset: 23000 }
        ];
      }
      res.json(transcript);
    } catch (error) {
      console.error("YOUTUBE TRANSCRIPT ERROR:", error);
      res.status(500).json({ error: "Subtitrlarni yuklab bo'lmadi" });
    }
  });

  router.get('/video/vocab', async (req, res) => {
    try {
      const videoId = String(req.query.videoId);
      let vocab;
      try {
        const transcriptList = await YoutubeTranscript.fetchTranscript(videoId);
        const fullText = transcriptList.map(t => t.text).join(' ');
        vocab = await AIService.extractVideoVocabulary(fullText, 5); 
      } catch (e) {
        vocab = [
          { word: "Welcome", translation: "Xush kelibsiz" },
          { word: "Demonstration", translation: "Namoyish" },
          { word: "Currently", translation: "Hozirda" },
          { word: "Blocked", translation: "Bloklangan" },
          { word: "Practice", translation: "Amaliyot" }
        ];
      }
      res.json(vocab);
    } catch (error) {
      console.error("YOUTUBE VOCAB ERROR:", error);
      res.status(500).json({ error: "Lug'at ajratishda xatolik" });
    }
  });

  router.post('/words', async (req, res) => {
    try {
      const { userId, word, translation, sentence } = req.body;
      if (!userId || !word || !translation) {
        return res.status(400).json({ error: "Missing fields" });
      }
      const newWord = {
        id: `${word.toLowerCase()}_${userId}`,
        userId: Number(userId),
        word,
        translation,
        sentence: sentence || '',
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5,
        nextReviewDate: new Date().toISOString().split('T')[0]
      };
      await dbManager.saveWord(newWord);
      res.json(newWord);
    } catch (error) {
      res.status(500).json({ error: "So'zni saqlashda xatolik" });
    }
  });

  router.get('/words/:userId', async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const words = await dbManager.getWords(userId);
      res.json(words);
    } catch (error) {
      res.status(500).json({ error: "So'zlarni yuklashda xatolik" });
    }
  });

  router.post('/words/review', async (req, res) => {
    try {
      const { userId, word, difficulty } = req.body;
      if (!userId || !word || !difficulty) {
        return res.status(400).json({ error: "Missing fields" });
      }
      const savedWord = await dbManager.getWord(Number(userId), word);
      if (savedWord) {
        // Simple SRS calculation (just for show)
        savedWord.interval = difficulty === 'easy' ? savedWord.interval * 2 : 1;
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + savedWord.interval);
        savedWord.nextReviewDate = nextDate.toISOString().split('T')[0];
        await dbManager.saveWord(savedWord);
        res.json(savedWord);
      } else {
        res.status(404).json({ error: "So'z topilmadi" });
      }
    } catch (error) {
      res.status(500).json({ error: "SRS yangilashda xatolik" });
    }
  });

  router.get('/leaderboard', async (req, res) => {
    try {
      const users = await dbManager.getLeaderboard(10);
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Leaderboard yuklashda xatolik" });
    }
  });

  router.post('/user/xp', async (req, res) => {
    try {
      const { userId, amount } = req.body;
      if (!userId || amount === undefined) {
        return res.status(400).json({ error: "Missing fields" });
      }
      const updatedProfile = await UserService.addXP(Number(userId), Number(amount));
      res.json(updatedProfile);
    } catch (error) {
      res.status(500).json({ error: "XP qo'shishda xatolik" });
    }
  });

  router.post('/user/lesson-completed', async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
      }
      const user = await dbManager.getUser(Number(userId));
      if (user) {
        user.totalLessons += 1;
        await dbManager.updateUser(user);
        res.json(user);
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Lesson update failed" });
    }
  });

  router.post('/user/level', async (req, res) => {
    try {
      const { userId, level } = req.body;
      if (!userId || !level) {
        return res.status(400).json({ error: "Missing fields" });
      }
      const user = await dbManager.getUser(Number(userId));
      if (user) {
        user.englishLevel = level;
        await dbManager.updateUser(user);
        res.json(user);
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Level update failed" });
    }
  });

  router.post('/user/profile/time', async (req, res) => {
    try {
      const { userId, studyTime } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
      }
      const user = await dbManager.getUser(Number(userId));
      if (user) {
        user.studyTime = studyTime;
        await dbManager.updateUser(user);
        res.json(user);
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Time update failed" });
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
      const updatedProfile = await UserService.addXP(Number(userId), 20);

      res.json({ assessment, profile: updatedProfile });
    } catch (error: any) {
      console.error("VOICE ASSESSMENT ERROR:", error);
      res.status(500).json({ error: error.message || error });
    }
  });

  router.post('/feedback', async (req, res) => {
    try {
      const { userId, rating, comment } = req.body;
      if (!userId || rating === undefined) {
        return res.status(400).json({ error: "Missing fields" });
      }
      const feedback = {
        id: `${Date.now()}_${userId}`,
        userId: Number(userId),
        rating: Number(rating),
        comment: comment || '',
        createdAt: new Date().toISOString()
      };
      await dbManager.addFeedback(feedback);
      res.json(feedback);
    } catch (error) {
      console.error("FEEDBACK ERROR:", error);
      res.status(500).json({ error: "Feedback saqlashda xatolik" });
    }
  });

  router.post('/roleplay/turn', async (req, res) => {
    try {
      const { audioBase64, mimeType, scenario, history } = req.body;
      const turnData = await AIService.evaluateRoleplayTurn(audioBase64, mimeType, scenario, history);
      res.json(turnData);
    } catch (error) {
      console.error("ROLEPLAY TURN ERROR:", error);
      res.status(500).json({ error: "Rol o'ynashda xatolik yuz berdi" });
    }
  });

  return router;
}
