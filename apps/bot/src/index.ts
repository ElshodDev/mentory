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
  if (ctx.message) {
    ctx.message.text = "Menga Task 1.1 (do'stga xat) strukturasini tushuntir va template ber";
  }
  await handleWritingQuery(ctx);
});

bot.command('task12', async (ctx) => {
  ctx.session.waitingFor = 'writing_tutor';
  if (ctx.message) {
    ctx.message.text = "Menga Task 1.2 (rasmiy xat shikoyat, taklif, so'rov) strukturasini tushuntir va template ber";
  }
  await handleWritingQuery(ctx);
});

bot.command('task2', async (ctx) => {
  ctx.session.waitingFor = 'writing_tutor';
  if (ctx.message) {
    ctx.message.text = "Menga Task 2 (Esse / Opinion / Discussion) strukturasini tushuntir va foydali iboralar ber";
  }
  await handleWritingQuery(ctx);
});

bot.command('sample', async (ctx) => {
  ctx.session.waitingFor = 'writing_tutor';
  if (ctx.message) {
    ctx.message.text = "Iltimos menga IELTS Writing bo'yicha yuqori balli qisqa Sample yozib ber";
  }
  await handleWritingQuery(ctx);
});

bot.on('message:text', async (ctx) => {
  if (ctx.session.waitingFor === 'writing_tutor') {
    await handleWritingQuery(ctx);
    return;
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

bot.callbackQuery('check_sub', async (ctx) => {
  try {
    const member = await ctx.api.getChatMember(CHANNEL_USERNAME, ctx.from.id);
    if (['member', 'administrator', 'creator'].includes(member.status)) {
      const profile = dbManager.getUser(ctx.from.id);
      if (profile) {
        profile.isSubscribed = true;
        dbManager.updateUser(profile);
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
app.use(express.json());

// Load API routes
app.use('/api', createApiRouter(bot, CHANNEL_USERNAME));

app.listen(3000, () => {
  console.log('✅ Express API server 3000-portda ishga tushdi!');
});

// ─── Daily Streak Reminder (Runs every day at 19:00) ────────────────────────
cron.schedule('0 19 * * *', async () => {
  try {
    const today = UserService.getTodayDate();
    const users = dbManager.getAllUsers();
    
    for (const u of users) {
      if (u.lastActiveDate && u.lastActiveDate !== today && u.isSubscribed) {
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
    }
  } catch (error) {
    console.error("Reminder cron failed:", error);
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
    } catch (err) {
      console.error('❌ Bot komandalarini o\'rnatishda xatolik:', err);
    }
  },
});
