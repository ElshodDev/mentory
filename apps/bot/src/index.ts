import { Bot, Context, session, InlineKeyboard } from 'grammy';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import express from 'express';
import cors from 'cors';
import { dbManager, UserProfile as DbUserProfile } from './db';
import { handleWritingQuery } from './handlers/writing.handler';
import { WRITING_TUTOR_PROMPT } from './prompts/writing-tutor.prompt';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BOT_TOKEN = process.env.BOT_TOKEN!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME || '@Elshod_Makhammadivich_I';
const CHANNEL_LINK = 'https://t.me/Elshod_Makhammadivich_I';
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://aaalr-185-139-138-130.run.pinggy-free.link';

if (!BOT_TOKEN) throw new Error('BOT_TOKEN topilmadi!');
if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY topilmadi!');

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// Use DB interface
type UserProfile = DbUserProfile;

interface SessionData {
  profile?: UserProfile;
  waitingFor?: 'writing_essay' | 'grammar_check' | 'writing_tutor' | null;
}

type MyContext = Context & { session: SessionData };

// ─── Yordamchi funksiyalar ─────────────────────────────────────────────────
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getOrCreateUser(ctx: MyContext): UserProfile {
  const user = ctx.from!;
  let profile = dbManager.getUser(user.id);
  if (!profile) {
    profile = dbManager.createUser({
      telegramId: user.id,
      firstName: user.first_name,
      username: user.username,
      xp: 0,
      streak: 0,
      lastActiveDate: '',
      totalLessons: 0,
      isSubscribed: false,
      joinedAt: getTodayDate(),
    });
  }
  return profile;
}

function addXP(userId: number, amount: number): UserProfile {
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
      joinedAt: getTodayDate(),
    });
  }
  profile.xp += amount;
  const today = getTodayDate();

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

function getLevel(xp: number): { level: number; title: string; emoji: string } {
  if (xp < 100)  return { level: 1, title: 'Beginner',     emoji: '🌱' };
  if (xp < 300)  return { level: 2, title: 'Elementary',   emoji: '📗' };
  if (xp < 600)  return { level: 3, title: 'Pre-Intermediate', emoji: '📘' };
  if (xp < 1000) return { level: 4, title: 'Intermediate', emoji: '📙' };
  if (xp < 1500) return { level: 5, title: 'Upper-Intermediate', emoji: '🏆' };
  return         { level: 6, title: 'Advanced',      emoji: '💎' };
}

async function checkSubscription(ctx: MyContext): Promise<boolean> {
  try {
    const member = await ctx.api.getChatMember(CHANNEL_USERNAME, ctx.from!.id);
    const isOk = ['member', 'administrator', 'creator'].includes(member.status);
    const profile = dbManager.getUser(ctx.from!.id);
    if (profile) {
      profile.isSubscribed = isOk;
      dbManager.updateUser(profile);
    }
    return isOk;
  } catch {
    return false;
  }
}

function subCheckKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url('📢 Kanalga obuna bo\'lish', CHANNEL_LINK)
    .row()
    .text('✅ Obuna bo\'ldim, tekshir!', 'check_sub');
}

function mainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .webApp('🚀 Mentory Mini App (Ochish)', MINI_APP_URL).row()
    .text('✍️ Writing',   'menu_writing').text('📖 Grammar', 'menu_grammar').row()
    .text('🗣️ Speaking',  'menu_speaking').text('📚 Vocab',  'menu_vocab').row()
    .text('📊 Mening profilim', 'menu_profile').row();
}

// ─── Bot yaratish ──────────────────────────────────────────────────────────
const bot = new Bot<MyContext>(BOT_TOKEN);
bot.use(session({ initial: (): SessionData => ({}) }));

// ═══════════════════════════════════════════════════════════════════════════
// /start buyrug'i
// ═══════════════════════════════════════════════════════════════════════════
bot.command('start', async (ctx) => {
  ctx.session.waitingFor = null;
  const profile = getOrCreateUser(ctx);

  // Obuna tekshiruv (faqat 1 ta dars tugatgandan keyin so'raladi)
  if (profile.totalLessons >= 1) {
    const isSubscribed = await checkSubscription(ctx);
    if (!isSubscribed) {
      await ctx.reply(
        `👋 Salom, <b>${ctx.from!.first_name}</b>!\n\n` +
        `🎓 Siz bepul 1-darsni muvaffaqiyatli yakunladingiz!\n\n` +
        `📌 Keyingi darslarni davom ettirish uchun homiy <b>kanalimizga obuna</b> bo'ling:\n` +
        `Yangiliklar, darslar va maxsus materiallar shu yerda e'lon qilinadi!\n\n` +
        `⬇️ Obuna bo'lgach, <b>"✅ Obuna bo'ldim, tekshir!"</b> tugmasini bosing.`,
        { parse_mode: 'HTML', reply_markup: subCheckKeyboard() }
      );
      return;
    }
  }

  // Foydalanuvchi allaqachon obuna — xush kelibsiz
  profile.isSubscribed = true;
  const lvl = getLevel(profile.xp);

  await ctx.reply(
    `🎉 <b>Mentory AI</b> ga xush kelibsiz, <b>${ctx.from!.first_name}</b>!\n\n` +
    `📊 Sizning holatiz:\n` +
    `${lvl.emoji} Daraja: <b>${lvl.title}</b> (Level ${lvl.level})\n` +
    `⚡ XP: <b>${profile.xp}</b>\n` +
    `🔥 Streak: <b>${profile.streak} kun</b>\n` +
    `📝 Jami darslar: <b>${profile.totalLessons}</b>\n\n` +
    `Quyidan kerakli bo'limni tanlang:`,
    { parse_mode: 'HTML', reply_markup: mainMenuKeyboard() }
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// Writing Tutor buyruqlari
// ═══════════════════════════════════════════════════════════════════════════
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
    ctx.message.text = "Menga Task 1.2 (menejerga rasmiy xat) strukturasini tushuntir va template ber";
  }
  await handleWritingQuery(ctx);
});

bot.command('task2', async (ctx) => {
  ctx.session.waitingFor = 'writing_tutor';
  if (ctx.message) {
    ctx.message.text = "Menga Task 2 (Advantages/Disadvantages va Opinion) strukturalarini tushuntir va template ber";
  }
  await handleWritingQuery(ctx);
});

bot.command('sample', async (ctx) => {
  ctx.session.waitingFor = 'writing_tutor';
  if (ctx.message) {
    ctx.message.text = "Menga Multilevel writing imtihoni uchun bitta mavzuga sample (namuna) javob yozib ber";
  }
  await handleWritingQuery(ctx);
});

// ═══════════════════════════════════════════════════════════════════════════
// Obuna tekshiruv callback
// ═══════════════════════════════════════════════════════════════════════════
bot.callbackQuery('check_sub', async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏳ Tekshirilmoqda...' });
  const isSubscribed = await checkSubscription(ctx);

  if (!isSubscribed) {
    await ctx.editMessageText(
      `❌ Siz hali kanalga obuna bo'lmagansiz!\n\n` +
      `📢 Iltimos, avval kanalga obuna bo'ling, so'ng qayta tekshiring.`,
      { parse_mode: 'HTML', reply_markup: subCheckKeyboard() }
    );
    return;
  }

  const profile = getOrCreateUser(ctx);
  profile.isSubscribed = true;
  const lvl = getLevel(profile.xp);

  await ctx.editMessageText(
    `✅ <b>Obuna tasdiqlandi!</b>\n\n` +
    `🎉 Xush kelibsiz, <b>${ctx.from.first_name}</b>!\n\n` +
    `${lvl.emoji} Daraja: <b>${lvl.title}</b>\n` +
    `⚡ XP: <b>${profile.xp}</b> | 🔥 Streak: <b>${profile.streak} kun</b>\n\n` +
    `Quyidan kerakli bo'limni tanlang:`,
    { parse_mode: 'HTML', reply_markup: mainMenuKeyboard() }
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// Asosiy menyu callbacklari
// ═══════════════════════════════════════════════════════════════════════════

// ✍️ Writing bo'limi
bot.callbackQuery('menu_writing', async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.waitingFor = 'writing_essay';

  const topics = [
    'Social media is making people less social. Do you agree?',
    'Should universities be free for all students?',
    'Technology is changing the way we communicate. Discuss.',
    'Is online education as effective as traditional education?',
    'Environmental problems can only be solved by governments. Discuss.',
  ];
  const topic = topics[Math.floor(Math.random() * topics.length)];

  await ctx.reply(
    `✍️ <b>Writing Mashqi</b>\n\n` +
    `📝 Bugungi mavzu:\n<i>"${topic}"</i>\n\n` +
    `📌 Qoidalar:\n` +
    `• Kamida <b>150 so'z</b> yozing\n` +
    `• O'z fikringizni asoslab bering\n` +
    `• Grammatikaga e'tibor bering\n\n` +
    `✏️ Esseyingizni yozing (matn sifatida yuboring):`,
    { parse_mode: 'HTML' }
  );
});

// 📖 Grammar bo'limi
bot.callbackQuery('menu_grammar', async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.waitingFor = 'grammar_check';

  await ctx.reply(
    `📖 <b>Grammar Tekshiruv</b>\n\n` +
    `Inglizcha gapingizni yuboring — men xatolaringizni topib, tushuntiraman!\n\n` +
    `<b>Misol:</b>\n` +
    `<code>I have went to school yesterday</code>\n\n` +
    `✏️ Gapingizni yuboring:`,
    { parse_mode: 'HTML' }
  );
});

// 🗣️ Speaking bo'limi
bot.callbackQuery('menu_speaking', async (ctx) => {
  await ctx.answerCallbackQuery();

  await ctx.reply(
    `🗣️ <b>Speaking Mashqi</b>\n\n` +
    `Ovozli xabar yuboring — men talaffuz va ravonligingizni tahlil qilaman!\n\n` +
    `📌 Mavzular:\n` +
    `• O'zingiz haqingizda 1 daqiqa gapirib bering\n` +
    `• Sevimli kitobingizni tasvirlab bering\n` +
    `• Kelajak rejalaringiz haqida gapirib bering\n\n` +
    `🎙️ <b>Mikrofon tugmasini bosib, gapirishni boshlang!</b>`,
    { parse_mode: 'HTML' }
  );
});

// 📚 Vocabulary bo'limi
bot.callbackQuery('menu_vocab', async (ctx) => {
  await ctx.answerCallbackQuery();
  const profile = addXP(ctx.from.id, 10);

  const words = [
    { word: 'Eloquent', meaning: 'Notiq, so\'zga chechan', example: 'She is an eloquent speaker.' },
    { word: 'Resilient', meaning: 'Bardoshli, chidamli', example: 'He is resilient in tough times.' },
    { word: 'Ambiguous', meaning: 'Noaniq, ikki ma\'noli', example: 'The statement was ambiguous.' },
    { word: 'Diligent', meaning: 'Mehnatsevar, tirishqoq', example: 'Diligent students succeed.' },
    { word: 'Persevere', meaning: 'Sabr qilmoq, intilmoq', example: 'Persevere and you will succeed.' },
  ];
  const w = words[Math.floor(Math.random() * words.length)];

  await ctx.reply(
    `📚 <b>Bugungi Yangi So'z</b> (+10 XP qo'shildi!)\n\n` +
    `🔤 <b>${w.word}</b>\n` +
    `🇺🇿 Ma'nosi: <i>${w.meaning}</i>\n` +
    `📝 Misol: <i>${w.example}</i>\n\n` +
    `⚡ Umumiy XP: <b>${profile.xp}</b> | 🔥 Streak: <b>${profile.streak} kun</b>\n\n` +
    `Yana bir so'z o'rganish uchun qayta bosing! 👇`,
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('🔄 Yangi so\'z', 'menu_vocab').text('🏠 Bosh menyu', 'go_home')
    }
  );
});

// 📊 Profil
bot.callbackQuery('menu_profile', async (ctx) => {
  await ctx.answerCallbackQuery();
  const profile = getOrCreateUser(ctx);
  const lvl = getLevel(profile.xp);

  const nextLevelXP = [100, 300, 600, 1000, 1500, 9999];
  const currentNextXP = nextLevelXP[lvl.level - 1];
  const progressPercent = Math.min(Math.floor((profile.xp / currentNextXP) * 100), 100);
  const progressBar = '█'.repeat(Math.floor(progressPercent / 10)) + '░'.repeat(10 - Math.floor(progressPercent / 10));

  await ctx.reply(
    `📊 <b>Sizning Profilingiz</b>\n\n` +
    `👤 Ism: <b>${profile.firstName}</b>\n` +
    `📅 A'zo bo'lgan: <b>${profile.joinedAt}</b>\n\n` +
    `${lvl.emoji} Daraja: <b>${lvl.title}</b> (Level ${lvl.level})\n` +
    `⚡ XP: <b>${profile.xp}</b> / ${currentNextXP}\n` +
    `[${progressBar}] ${progressPercent}%\n\n` +
    `🔥 Streak: <b>${profile.streak} kun</b>\n` +
    `📝 Jami darslar: <b>${profile.totalLessons}</b>\n\n` +
    `💡 <i>Har kuni mashq qiling va streakingizni ushlab turing!</i>`,
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('🏠 Bosh menyu', 'go_home')
    }
  );
});

// 🏠 Bosh menyu
bot.callbackQuery('go_home', async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.waitingFor = null;
  const profile = getOrCreateUser(ctx);
  const lvl = getLevel(profile.xp);

  await ctx.reply(
    `🏠 <b>Bosh menyu</b>\n\n` +
    `${lvl.emoji} <b>${lvl.title}</b> | ⚡ ${profile.xp} XP | 🔥 ${profile.streak} kun\n\n` +
    `Bo'limni tanlang:`,
    { parse_mode: 'HTML', reply_markup: mainMenuKeyboard() }
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// Matn xabarlar — Writing va Grammar javoblari
// ═══════════════════════════════════════════════════════════════════════════
bot.on('message:text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return;

  // Obuna tekshiruv
  const isSubscribed = await checkSubscription(ctx);
  if (!isSubscribed) {
    await ctx.reply(
      `⛔ Botdan foydalanish uchun avval kanalga obuna bo'ling!`,
      { reply_markup: subCheckKeyboard() }
    );
    return;
  }

  const text = ctx.message.text;
  const waitingFor = ctx.session.waitingFor;

  // ─── Writing Tutor (Gemini Writing Coach) ────────────────────────
  if (waitingFor === 'writing_tutor') {
    await handleWritingQuery(ctx);
    return;
  }

  // ─── Writing tahlili ──────────────────────────────────────────────
  if (waitingFor === 'writing_essay') {
    ctx.session.waitingFor = null;
    const wordCount = text.trim().split(/\s+/).length;
    const profile = addXP(ctx.from!.id, 25);

    const loadingMsg = await ctx.reply('⏳ <i>AI ustoz esseyingizni o\'qimoqda...</i>', { parse_mode: 'HTML' });

    try {
      const prompt = `You are a professional IELTS writing examiner. Analyze this essay for vocabulary, grammar, coherence, and task response. Provide an estimated IELTS band score and brief constructive feedback in Uzbek language. Here is the essay:\n\n${text}`;
      
      const result = await model.generateContent(prompt);
      const feedbackText = result.response.text();

      await ctx.api.editMessageText(ctx.chat.id, loadingMsg.message_id, 
        `✅ <b>Writing Tahlili</b>\n\n` +
        `📊 So'zlar soni: <b>${wordCount}</b>\n` +
        `${feedbackText}\n\n` +
        `⚡ +25 XP qo'shildi! Jami: <b>${profile.xp} XP</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard()
            .text('🔄 Yangi mavzu', 'menu_writing').text('🏠 Menyu', 'go_home')
        }
      );
    } catch (e: any) {
      console.error("WRITING ERROR:", e);
      await ctx.api.editMessageText(ctx.chat.id, loadingMsg.message_id, "⚠️ AI tahlilida xatolik yuz berdi: " + (e?.message || e));
    }
    return;
  }

  // ─── Grammar tekshiruv ────────────────────────────────────────────
  if (waitingFor === 'grammar_check') {
    ctx.session.waitingFor = null;
    const profile = addXP(ctx.from!.id, 15);

    const loadingMsg = await ctx.reply('⏳ <i>AI ustoz gapingizni tekshirmoqda...</i>', { parse_mode: 'HTML' });

    try {
      const prompt = `Act as an English grammar teacher. Check the following sentence for grammatical, spelling, and stylistic errors. If there are errors, explain them clearly in Uzbek and provide the correct version. If it's correct, praise the student in Uzbek. Sentence: "${text}"`;
      
      const result = await model.generateContent(prompt);
      const feedbackText = result.response.text();

      await ctx.api.editMessageText(ctx.chat.id, loadingMsg.message_id, 
        `📖 <b>Grammar Tekshiruv</b>\n\n` +
        `📝 Sizning gap: <i>"${text}"</i>\n\n` +
        `${feedbackText}\n\n` +
        `⚡ +15 XP | Jami: <b>${profile.xp} XP</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard()
            .text('🔄 Yana tekshir', 'menu_grammar').text('🏠 Menyu', 'go_home')
        }
      );
    } catch (e) {
      await ctx.api.editMessageText(ctx.chat.id, loadingMsg.message_id, "⚠️ AI tekshiruvida xatolik yuz berdi.");
    }
    return;
  }

  // ─── Umumiy matn (AI muloqot) ─────────────────
  const loadingMsg = await ctx.reply('🤖 <i>AI ustoz o\'ylamoqda...</i>', { parse_mode: 'HTML' });
  try {
    const chatModel = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      systemInstruction: "Siz Mentory AI, o'zbek tilida so'zlashuvchilarga ingliz tilini o'rgatuvchi do'stona va aqlli ustozsiz. Har doim yordam berishga tayyor, xatolarni muloyim to'g'rilovchi va motivatsiya beruvchi bo'ling. Asosan o'zbek tilida javob bering, ammo inglizcha misollar keltiring."
    });
    
    const result = await chatModel.generateContent(text);
    const aiText = result.response.text();
    
    // Matn juda uzun bo'lsa HTML parse da muammo chiqmasligi uchun parse_mode ni olib tashlash mumkin, 
    // yoki Anthropic odatda toza javob beradi. Hozircha HTML emas oddiy tekst ko'rinishida jo'natgan ma'qul, chunki markdown qaytarishi mumkin.
    // Ammo MarkdownV2 da jo'natish xavfsizroq bo'lishi mumkin, biz HTML ni sinab ko'ramiz
    
    // Claude asosan markdown qaytaradi, uni tozalash kerak bo'lishi mumkin:
    const safeHtml = aiText
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>')
      .replace(/`(.*?)`/g, '<code>$1</code>');

    await ctx.api.editMessageText(ctx.chat.id, loadingMsg.message_id, safeHtml, { 
      parse_mode: 'HTML',
      reply_markup: mainMenuKeyboard()
    });
  } catch (e: any) {
    console.error("GENERAL CHAT ERROR:", e);
    await ctx.api.editMessageText(ctx.chat.id, loadingMsg.message_id, "⚠️ AI ustoz javob berishda xatolikka duch keldi: " + (e?.message || e));
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Ovozli xabar (Speaking)
// ═══════════════════════════════════════════════════════════════════════════
bot.on('message:voice', async (ctx) => {
  getOrCreateUser(ctx); // Foydalanuvchini xotirada yaratish (bot restart bo'lsa)
  const isSubscribed = await checkSubscription(ctx);
  if (!isSubscribed) {
    await ctx.reply('⛔ Avval kanalga obuna bo\'ling!', { reply_markup: subCheckKeyboard() });
    return;
  }

  const profile = addXP(ctx.from!.id, 20);
  const duration = ctx.message.voice.duration;
  
  if (duration > 60) {
    await ctx.reply("Iltimos, 1 daqiqadan qisqa audio yuboring. 😅");
    return;
  }

  const loadingMsg = await ctx.reply('🎧 <i>AI ustoz ovozingizni tinglamoqda...</i>', { parse_mode: 'HTML' });

  try {
    // 1. Faylni olish
    const file = await ctx.getFile();
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    
    // 2. Audioni yuklab olish
    const fileRes = await fetch(fileUrl);
    const arrayBuffer = await fileRes.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    // 3. Gemini ga jo'natish
    const prompt = `You are a professional IELTS speaking examiner. Listen to the following audio carefully.
Please provide:
1. The exact transcript of what I said.
2. Corrections for any grammatical or vocabulary errors.
3. Feedback on pronunciation or fluency.
4. An estimated IELTS Speaking band score.
Please write your feedback in the Uzbek language (but keep the transcript and English examples in English).`;

    const chatModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await chatModel.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Audio,
          mimeType: "audio/ogg"
        }
      }
    ]);

    const feedbackText = result.response.text();

    await ctx.api.editMessageText(ctx.chat.id, loadingMsg.message_id, 
      `🎙️ <b>Speaking Tahlili</b>\n\n` +
      `${feedbackText}\n\n` +
      `⚡ +20 XP qo'shildi! Jami: <b>${profile.xp} XP</b>\n` +
      `🔥 Streak: <b>${profile.streak} kun</b> — Davom eting!`,
      {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().text('🏠 Bosh menyu', 'go_home')
      }
    );
  } catch (e: any) {
    console.error("VOICE ERROR:", e);
    await ctx.api.editMessageText(ctx.chat.id, loadingMsg.message_id, "⚠️ AI audioni tahlil qilishda xatolikka duch keldi: " + (e?.message || e));
  }
});

// /profile buyrug'i
bot.command('profile', async (ctx) => {
  const profile = getOrCreateUser(ctx);
  const lvl = getLevel(profile.xp);
  await ctx.reply(
    `📊 <b>Profil</b>\n\n` +
    `${lvl.emoji} <b>${lvl.title}</b> (Level ${lvl.level})\n` +
    `⚡ XP: <b>${profile.xp}</b> | 🔥 Streak: <b>${profile.streak} kun</b>\n` +
    `📝 Darslar: <b>${profile.totalLessons}</b>`,
    { parse_mode: 'HTML' }
  );
});

// /menu buyrug'i
bot.command('menu', async (ctx) => {
  await ctx.reply('🏠 Bosh menyu:', { reply_markup: mainMenuKeyboard() });
});

// ─── Global Error Handler ──────────────────────────────────────────────────
bot.catch((err) => {
  console.error(`Error while handling update ${err.ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof Error) {
    console.error("Error Message:", e.message);
  } else {
    console.error("Unknown error:", e);
  }
});

// ─── API SERVER (Mini App uchun) ───────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/translate', async (req, res) => {
  try {
    const { word, sentence } = req.body;
    const prompt = `Act as an English teacher. Translate the word/phrase "${word}" to Uzbek in the context of the sentence: "${sentence}". Provide ONLY the translation and a very brief explanation.`;
    const result = await model.generateContent(prompt);
    res.json({ translation: result.response.text().trim() });
  } catch (error) {
    res.status(500).json({ error: "Tarjimada xatolik" });
  }
});

app.get('/api/profile/:id', async (req, res) => {
  const userId = Number(req.params.id);
  let profile = dbManager.getUser(userId);
  if (!profile) {
    profile = dbManager.createUser({
      telegramId: userId,
      firstName: req.query.firstName ? String(req.query.firstName) : 'GUEST',
      username: req.query.username ? String(req.query.username) : 'guest_user',
      xp: 0,
      streak: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
      totalLessons: 0,
      isSubscribed: false,
      joinedAt: new Date().toISOString().split('T')[0]
    });
  } else {
    // If they have >= 1 lesson, verify if they are actually subscribed
    if (profile.totalLessons >= 1) {
      try {
        const member = await bot.api.getChatMember(CHANNEL_USERNAME, userId);
        const isOk = ['member', 'administrator', 'creator'].includes(member.status);
        profile.isSubscribed = isOk;
        dbManager.updateUser(profile);
      } catch (err) {
        // Keep existing
      }
    }
  }
  res.json(profile);
});

app.get('/api/user/subscription/:id', async (req, res) => {
  const userId = Number(req.params.id);
  try {
    const member = await bot.api.getChatMember(CHANNEL_USERNAME, userId);
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

app.get('/api/reading', async (req, res) => {
  try {
    const level = req.query.level ? String(req.query.level) : 'B1';
    const prompt = `You are an IELTS English teacher. Create a short, interesting reading passage (about 80-120 words) suitable for IELTS level ${level}.
Topic: A random interesting topic (e.g., science, technology, history, environment, psychology, or culture).
You must return ONLY a JSON object with this exact structure:
{
  "title": "A short engaging title",
  "text": "The full reading passage text",
  "hardWords": [
    { "word": "word1", "trans": "translation of word1 in Uzbek", "isHard": true },
    { "word": "word2", "trans": "translation of word2 in Uzbek", "isHard": true },
    { "word": "word3", "trans": "translation of word3 in Uzbek", "isHard": true }
  ]
}
Ensure the passage has at least 3-4 advanced/academic words for that level that are listed in "hardWords".
Do not include any markdown formatting, backticks, or text before/after the JSON. Just the raw JSON.`;
    
    const result = await model.generateContent(prompt);
    const resText = result.response.text().trim();
    const cleanJson = resText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    const readingData = JSON.parse(cleanJson);
    res.json(readingData);
  } catch (error: any) {
    console.error("READING GENERATION ERROR:", error);
    res.status(500).json({ error: "Yangi matn generatsiya qilishda xatolik yuz berdi" });
  }
});

app.post('/api/words', (req, res) => {
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

app.get('/api/words/:userId', (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const words = dbManager.getWordsForUser(userId);
    res.json(words);
  } catch (error) {
    res.status(500).json({ error: "So'zlarni yuklashda xatolik" });
  }
});

app.post('/api/words/review', (req, res) => {
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

app.get('/api/leaderboard', (req, res) => {
  try {
    const users = dbManager.getAllUsers();
    const sorted = users.sort((a, b) => b.xp - a.xp).slice(0, 10);
    res.json(sorted);
  } catch (error) {
    res.status(500).json({ error: "Leaderboard yuklashda xatolik" });
  }
});

app.post('/api/user/xp', (req, res) => {
  try {
    const { userId, amount } = req.body;
    if (!userId || amount === undefined) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const updatedProfile = addXP(Number(userId), Number(amount));
    res.json(updatedProfile);
  } catch (error) {
    res.status(500).json({ error: "XP qo'shishda xatolik" });
  }
});

app.post('/api/user/lesson-completed', (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }
    const profile = dbManager.getUser(Number(userId));
    if (profile) {
      profile.totalLessons += 1;
      const updated = dbManager.updateUser(profile);
      res.json(updated);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Lesson update failed" });
  }
});

app.post('/api/writing', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Missing message field" });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: WRITING_TUTOR_PROMPT,
    });

    const result = await model.generateContent(message);
    res.json({ reply: result.response.text() });
  } catch (error: any) {
    console.error("EXPRESS WRITING ERROR:", error);
    res.status(500).json({ error: error.message || error });
  }
});

app.post('/api/voice-assessment', async (req, res) => {
  try {
    const { userId, audio, mimeType, topic } = req.body;
    if (!userId || !audio) {
      return res.status(400).json({ error: "Missing fields: userId and audio are required" });
    }

    const prompt = `You are an expert IELTS Speaking examiner. Evaluate this spoken response from a student.
${topic ? `The speaking prompt topic is: "${topic}"` : ''}

You MUST return ONLY a raw JSON object (do not wrap in markdown code blocks, do not output any other text) matching this TypeScript structure:
{
  "transcript": "Exact transcription of what the student said in English",
  "corrections": [
    {
      "original": "Incorrect or clumsy phrase/word used by user",
      "corrected": "Improved or corrected version of that phrase/word",
      "explanation": "Brief explanation in Uzbek of the mistake and how to fix it"
    }
  ],
  "pronunciation": "Feedback on their pronunciation, accent, and word stress in Uzbek",
  "fluency": "Feedback on their speaking pace, hesitation, and sentence flow in Uzbek",
  "bandScore": "Estimated IELTS Speaking band score (e.g. 5.0, 6.0, 7.5)"
}

Keep all Uzbek explanations short, clear, and encouraging. Ensure the JSON is valid and parsing-friendly.`;

    const chatModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await chatModel.generateContent([
      prompt,
      {
        inlineData: {
          data: audio,
          mimeType: mimeType || "audio/webm"
        }
      }
    ]);

    const resText = result.response.text().trim();
    const cleanJson = resText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    
    let voiceResult;
    try {
      voiceResult = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("JSON PARSE ERROR on Gemini output:", resText);
      voiceResult = {
        transcript: "Listening completed, failed to structure JSON.",
        corrections: [],
        pronunciation: "Talaffuz tahlil qilinib bo'lmadi.",
        fluency: "Ravonlik tahlil qilinib bo'lmadi.",
        bandScore: "N/A",
        rawText: resText
      };
    }

    // Award +20 XP
    const updatedProfile = addXP(Number(userId), 20);

    res.json({
      assessment: voiceResult,
      profile: updatedProfile
    });
  } catch (error: any) {
    console.error("VOICE ASSESSMENT ERROR:", error);
    res.status(500).json({ error: error.message || error });
  }
});

app.post('/api/feedback', (req, res) => {
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

app.listen(3000, () => {
  console.log('✅ Express API server 3000-portda ishga tushdi!');
});

// ─── Daily Streak Reminder (Runs every 1 hour) ──────────────────────────────
let notifiedUsersToday = new Set<number>();
let currentNotifiedDay = new Date().toISOString().split('T')[0];

setInterval(async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    if (today !== currentNotifiedDay) {
      notifiedUsersToday.clear();
      currentNotifiedDay = today;
    }
    
    const users = dbManager.getAllUsers();
    for (const u of users) {
      if (notifiedUsersToday.has(u.telegramId)) continue;
      
      // If user hasn't studied today and wasn't active today
      if (u.lastActiveDate && u.lastActiveDate !== today) {
        try {
          const lvl = getLevel(u.xp);
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
          notifiedUsersToday.add(u.telegramId);
        } catch (err) {
          // Silent catch for blocked users/other issues
        }
      }
    }
  } catch (error) {
    console.error("Reminder check failed:", error);
  }
}, 1000 * 60 * 60); // Every 1 hour

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
