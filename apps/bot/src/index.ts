import { Bot, Context, session, InlineKeyboard } from 'grammy';
import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { dbManager, UserProfile as DbUserProfile } from './repositories/db.repository';
import { handleWritingQuery } from './handlers/writing.handler';
import { handleStartCommand, handleOnboardingCallback, subCheckKeyboard, mainMenuKeyboard } from './handlers/start.handler';
import { createApiRouter } from './controllers/api.controller';
import { UserService } from './services/user.service';
import { handlePhotoMessage } from './handlers/photo.handler';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BOT_TOKEN = process.env.BOT_TOKEN!;
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME || '@Elshod_Makhammadivich_I';
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://aaalr-185-139-138-130.run.pinggy-free.link';

if (!BOT_TOKEN) throw new Error('BOT_TOKEN topilmadi!');

type UserProfile = DbUserProfile;

interface SessionData {
  profile?: UserProfile;
  waitingFor?: 'writing_essay' | 'grammar_check' | 'writing_tutor' | null;
}

export type MyContext = Context & { session: SessionData };

// ─── Bot yaratish ──────────────────────────────────────────────────────────
const bot = new Bot<MyContext>(BOT_TOKEN);
bot.use(session({ initial: (): SessionData => ({}) }));

// ═══════════════════════════════════════════════════════════════════════════
// Buyruqlar
// ═══════════════════════════════════════════════════════════════════════════
bot.command('start', handleStartCommand);

bot.callbackQuery(/onboard_(a1|b1|c1)/, handleOnboardingCallback);

bot.on('message:photo', handlePhotoMessage);

bot.on('message:voice', async (ctx) => {
  const waitMsg = await ctx.reply("🎙 Ovozli xabar qabul qilindi. Tahlil qilinmoqda...");
  try {
    const file = await ctx.api.getFile(ctx.message.voice.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    
    // Download the file
    const axios = require('axios');
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');
    const base64Audio = buffer.toString('base64');
    
    const { AIService } = require('./services/ai.service');
    // Default topic for free-form voice messages
    const evaluation = await AIService.evaluateVoiceAssessment(base64Audio, 'audio/ogg', "Erkin mavzu (Free speaking)");
    
    // Add XP
    await UserService.addXP(ctx.from.id, 20);

    await ctx.api.editMessageText(
      ctx.chat.id, waitMsg.message_id,
      `🎯 *IELTS Speaking Tahlili*\n\n` +
      `🗣 *Sizning gapingiz:* _"${evaluation.transcript}"_\n\n` +
      `📈 *Tahminiy Ball:* *${evaluation.bandScore}*\n\n` +
      `💡 *Feedback (O'zbek tilida):*\n${evaluation.feedbackUz}\n\n` +
      `✨ +20 XP berildi!`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error("Voice eval error", error);
    await ctx.api.editMessageText(ctx.chat.id, waitMsg.message_id, "❌ Uzr, ovozingizni tahlil qilishda xatolik yuz berdi. Iltimos keyinroq qayta urinib ko'ring.");
  }
});

// Catch YouTube links
bot.on('message:text', async (ctx, next) => {
  const text = ctx.message.text;
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([a-zA-Z0-9_-]{11})/;
  const ytMatch = text.match(youtubeRegex);
  
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    
    await ctx.reply(
      "🎬 *YouTube videoni interaktiv rejimda ko'rish!*\n\nBu videoni ingliz tilini o'rganish rejimida ochish uchun quyidagi tugmani bosing:",
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: "🎬 Videoni ochish va so'zlarni o'rganish", web_app: { url: `${MINI_APP_URL}?video=${videoId}` } }]]
        }
      }
    );
    return;
  }

  // Check for Instagram link
  const igRegex = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/i;
  const igMatch = text.match(igRegex);

  if (igMatch) {
    const waitMsg = await ctx.reply("⏳ Instagram videoni yuklab olyapman, kuting...");
    try {
      const { instagramDownload } = require('@mrnima/instagram-downloader');
      const res = await instagramDownload(text);
      if (res && res.data && res.data.length > 0) {
        // Find video or image
        const item = res.data[0];
        if (item.url) {
          if (item.type === 'video') {
            await ctx.replyWithVideo(item.url, { caption: "Mana sizning videongiz! 🚀\n\n_P.S. Ingliz tilini ham Mentory bilan o'rganing!_", parse_mode: 'Markdown' });
          } else {
            await ctx.replyWithPhoto(item.url, { caption: "Mana rasm! 🚀\n\n_P.S. Ingliz tilini ham Mentory bilan o'rganing!_", parse_mode: 'Markdown' });
          }
        }
      } else {
        await ctx.reply("❌ Uzr, bu linkdan hech narsa topa olmadim yoki video yopiq profilda.");
      }
    } catch (e) {
      console.error(e);
      await ctx.reply("❌ Uzr, videoni yuklab olishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    } finally {
      await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
    }
    return;
  }

  await next();
});

bot.command('writing', async (ctx) => {
  ctx.session.waitingFor = 'writing_tutor';
  await ctx.reply(
    `✍️ *Mentory AI Writing Coach* ga xush kelibsiz!\n\n` +
    `Men sizga Multilevel (CEFR B1-B2) imtihoni uchun Writing qismini o'rgataman.\n\n` +
    `📌 *Mavjud komandalar:*\n` +
    `• /task11 — Do'stga xat (50 so'z) strukturasi\n` +
    `• /task12 — Rasmiy xat (120-150 so'z) strukturasi\n` +
    `• /task2 — Online discussion / Opinion (180-200 so'z)\n` +
    `• /sample — Sample (namuna) javob olish\n\n` +
    `✏️ Istalgan savolingizni yoki yozgan javobingizni (esse/xat) menga yuboring, tahlil qilib beraman!\n\n` +
    `*(Muloqotni yakunlash uchun /start yozing)*`,
    { parse_mode: 'Markdown' }
  );
});

bot.command('task11', async (ctx) => {
  ctx.session.waitingFor = 'writing_tutor';
  await handleWritingQuery(ctx, "Menga Task 1.1 (do'stga xat) strukturasini tushuntir va template ber");
});

bot.command('task12', async (ctx) => {
  ctx.session.waitingFor = 'writing_tutor';
  await handleWritingQuery(ctx, "Menga Task 1.2 (rasmiy xat shikoyat, taklif, so'rov) strukturasini tushuntir va template ber");
});

bot.command('task2', async (ctx) => {
  ctx.session.waitingFor = 'writing_tutor';
  await handleWritingQuery(ctx, "Menga Task 2 (Esse / Opinion / Discussion) strukturasini tushuntir va foydali iboralar ber");
});

bot.command('sample', async (ctx) => {
  ctx.session.waitingFor = 'writing_tutor';
  await handleWritingQuery(ctx, "Iltimos menga IELTS Writing bo'yicha yuqori balli qisqa Sample yozib ber");
});

bot.on('message:text', async (ctx) => {
  if (ctx.session.waitingFor === ('ai_onboarding' as any)) {
    const text = ctx.message.text || '';
    const waitMsg = await ctx.reply("🤔 Darajangizni tahlil qilyapman...");
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
      const prompt = `Analyze this english text written by a user and estimate their CEFR level (Beginner, Pre-Intermediate, Intermediate, Upper-Intermediate, Advanced). Respond with ONLY the single level word, nothing else. Text: "${text}"`;
      const result = await model.generateContent(prompt);
      let level = result.response.text().trim();
      const validLevels = ['Beginner', 'Pre-Intermediate', 'Intermediate', 'Upper-Intermediate', 'Advanced'];
      if (!validLevels.includes(level)) level = 'Beginner';

      const profile = await dbManager.getUser(ctx.from!.id);
      if (profile) {
        profile.englishLevel = level;
        profile.xp += 100;
        await dbManager.updateUser(profile);
      }
      ctx.session.waitingFor = null;
      await ctx.api.editMessageText(
        ctx.chat.id, waitMsg.message_id,
        `✅ Zo'r! Men sizning darajangizni <b>${level}</b> deb baholadim.\n\n🎉 Sizga +100 XP boshlang'ich bonus berildi! Pastdagi tugma orqali ilovaga kiring va darslarni boshlang:`,
        { parse_mode: 'HTML', reply_markup: mainMenuKeyboard() }
      );
    } catch (e) {
      await ctx.api.editMessageText(ctx.chat.id, waitMsg.message_id, "Xatolik yuz berdi. Iltimos, /start buyrug'ini bosib yordam oling.");
      ctx.session.waitingFor = null;
    }
    return;
  }

  if (ctx.session.waitingFor === 'writing_tutor') {
    await handleWritingQuery(ctx);
    return;
  }
  
  // Quick Dictionary check (<= 5 words)
  const wordsCount = (ctx.message.text || '').split(/\s+/).length;
  if (wordsCount > 0 && wordsCount <= 5) {
    try {
      const { AIService } = require('./services/ai.service');
      const text = ctx.message.text as string;
      const data = await AIService.translateWord(text, text);
      
      const newWord = {
        id: `${text.toLowerCase()}_${ctx.from.id}`,
        userId: ctx.from.id,
        word: text,
        translation: data.translation,
        sentence: data.sentence || '',
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5,
        nextReviewDate: new Date().toISOString().split('T')[0]
      };
      await dbManager.saveWord(newWord);

      await ctx.reply(
        `🇺🇸 *${text}*\n` +
        `🇺🇿 *${data.translation}*\n\n` +
        `📖 _Misol:_ ${data.sentence || ''}\n\n` +
        `✅ _Bu so'z sizning shaxsiy Mentory lug'atingizga saqlandi!_`,
        { parse_mode: 'Markdown' }
      );
      return;
    } catch(e) {
      // ignore and fallback
    }
  }

  // Agar boshqa narsa kutilmayotgan bo'lsa
  await ctx.reply(
    "Men faqat Mini App orqali yoki maxsus bo'limlarda ishlayman.\n\n" +
    "Yozma xatolaringizni tekshirish uchun /writing komandasini bosing yoki ilovaga kiring:",
    {
      reply_markup: new InlineKeyboard().webApp('🚀 Mentory Mini App', MINI_APP_URL)
    }
  );
});

bot.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query.trim();
  if (!query) return;

  try {
    const { AIService } = require('./services/ai.service');
    const corrected = await AIService.chatWithWritingTutor(`Please correct the grammar of this short text and return ONLY the corrected text without any extra explanation: "${query}"`);
    
    // clean up response just in case
    const cleanCorrected = corrected.replace(/^"|"$/g, '').trim();

    await ctx.answerInlineQuery([{
      type: 'article',
      id: 'grammar_check_1',
      title: 'Grammatikani to\'g\'rilash',
      description: cleanCorrected,
      input_message_content: {
        message_text: cleanCorrected
      }
    }], { cache_time: 0 });
  } catch (error) {
    console.error("Inline query error", error);
  }
});

bot.callbackQuery('check_sub', async (ctx) => {
  try {
    const member = await ctx.api.getChatMember(CHANNEL_USERNAME, ctx.from.id);
    if (['member', 'administrator', 'creator'].includes(member.status)) {
      const profile = await dbManager.getUser(ctx.from.id);
      if (profile) {
        profile.isSubscribed = true;
        await dbManager.updateUser(profile);
      }
      await ctx.editMessageText(
        `✅ Obuna tasdiqlandi! Rahmat.\n\nEndi botdan va ilovadan to'liq foydalanishingiz mumkin.`,
        { reply_markup: mainMenuKeyboard() }
      );
    } else {
      await ctx.answerCallbackQuery({
        text: "Hali kanalga obuna bo'lmagansiz!",
        show_alert: true
      });
    }
  } catch (error) {
    await ctx.answerCallbackQuery("Xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
  }
});

// ─── API SERVER (Mini App uchun) ───────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/api', createApiRouter(bot, CHANNEL_USERNAME));

app.listen(3000, () => {
  console.log('✅ Express API server 3000-portda ishga tushdi!');
});

// ─── Word of the Day (Runs every day at 10:00) ────────────────────────
cron.schedule('0 10 * * *', async () => {
  try {
    const wordOfTheDay = "Serendipity";
    const meaning = "Omadli tasodif, kutilmagan yaxshi narsa topish.";
    const example = "Meeting you here was pure serendipity! (Sizni bu yerda uchratishim omadli tasodif bo'ldi!)";
    
    const users = await dbManager.getLeaderboard(100000); 
    for (const u of users) {
      if (u.isSubscribed) {
        try {
          await bot.api.sendMessage(
            u.telegramId,
            `🌟 *Kun So'zi (Word of the Day)*\n\n` +
            `📚 **${wordOfTheDay}**\n` +
            `📝 Ma'nosi: _${meaning}_\n\n` +
            `💬 Misol: _${example}_\n\n` +
            `👇 Yangi so'zlarni Mentory Mini App da yod oling:`,
            {
              parse_mode: 'Markdown',
              reply_markup: new InlineKeyboard().webApp('🚀 Mentory Mini App', MINI_APP_URL)
            }
          );
        } catch (err) {}
      }
    }
  } catch (error) {
    console.error("Word of the day cron failed:", error);
  }
});

// ─── Daily Streak Reminder (Runs every day at 20:00) ────────────────────────
cron.schedule('0 20 * * *', async () => {
  try {
    const today = UserService.getTodayDate();
    const users = await dbManager.getInactiveUsers(today);
    
    for (const u of users) {
      try {
        const lvl = UserService.getLevel(u.xp);
        await bot.api.sendMessage(
          u.telegramId,
          `🔥 *Mentory AI Eslatma!*\n\n` +
          `Salom, *${u.firstName}*!\n` +
          `Sizning *${u.streak} kunlik streak* (olov) va ko'rsatkichlaringizni yo'qotib qo'ymaslik uchun bugun ilovaga kirib 1 ta matn o'qing!\n\n` +
          `Hozirgi holatingiz:\n` +
          `${lvl.emoji} Daraja: *${lvl.title}*\n` +
          `⚡ XP: *${u.xp}*\n\n` +
          `👇 Quyidagi tugmani bosib darslarni davom ettiring:`,
          {
            parse_mode: 'Markdown',
            reply_markup: new InlineKeyboard().webApp('🚀 Mentory Mini App', MINI_APP_URL)
          }
        );
      } catch (err) {}
    }
  } catch (error) {
    console.error("Reminder cron failed:", error);
  }
});

// ─── Custom Study Time Reminders (Runs every minute) ────────────────────
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    // Use local time for the bot environment or UTC? 
    // Usually users expect the time they input to be their local time. Let's assume the server runs on UTC+5 (Uzbekistan)
    const uzbekTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
    const h = String(uzbekTime.getUTCHours()).padStart(2, '0');
    const m = String(uzbekTime.getUTCMinutes()).padStart(2, '0');
    const currentTimeStr = `${h}:${m}`;

    const users = await dbManager.getUsersByStudyTime(currentTimeStr);
    if (users.length > 0) {
      const { AIService } = require('./services/ai.service');
      // Generate one reading for everyone to save API calls
      const readingData = await AIService.generateReadingPassage('B1');
      
      for (const u of users) {
        try {
          await bot.api.sendMessage(
            u.telegramId,
            `⏰ *Dars Vaqti Keldi!*\n\n` +
            `Siz belgilagan vaqt bo'ldi. Bugungi o'qish mashqingiz tayyor:\n\n` +
            `*${readingData.title}*\n\n` +
            `👇 O'qishni boshlash uchun ilovaga kiring:`,
            {
              parse_mode: 'Markdown',
              reply_markup: new InlineKeyboard().webApp('🚀 O\'qishni boshlash', MINI_APP_URL)
            }
          );
        } catch (err) {}
      }
    }
  } catch (error) {
    console.error("Custom reminder cron failed:", error);
  }
});

// ─── Botni ishga tushirish ─────────────────────────────────────────────────
bot.start({
  onStart: async (botInfo) => {
    console.log(`✅ Mentory bot ishga tushdi! @${botInfo.username}`);
    console.log(`📌 Kanal: ${CHANNEL_USERNAME}`);
    try {
      await bot.api.setMyCommands([
        { command: 'start',       description: '🚀 Botni qayta ishga tushirish' },
        { command: 'writing',     description: '✍️ Writing strukturalarini o\'rgan' },
        { command: 'task11',      description: '📝 Task 1.1 — Do\'stga xat (50 so\'z)' },
        { command: 'task12',      description: '📋 Task 1.2 — Rasmiy xat (120-150 so\'z)' },
        { command: 'task2',       description: '💬 Task 2 — Online munozara (180-200 so\'z)' },
        { command: 'sample',      description: '🎯 Sample javob yozib ber' },
      ]);
      console.log('✅ Bot komandalari Telegramda muvaffaqiyatli o\'rnatildi!');

      // Connect to MongoDB
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mentory';
      await dbManager.connect(mongoUri);
    } catch (err) {
      console.error('❌ Bot komandalarini o\'rnatishda xatolik:', err);
    }
  },
});
