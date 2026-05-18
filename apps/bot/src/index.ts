import { Bot, Context, session } from 'grammy';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { UserProfile } from '@mentory/shared-types';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'YOUR_ANTHROPIC_KEY';

interface SessionData {
  userProfile?: UserProfile;
  step?: string;
}

type MyContext = Context & { session: SessionData };

const bot = new Bot<MyContext>(BOT_TOKEN);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

bot.use(session({ initial: (): SessionData => ({}) }));

// Command /start
bot.command('start', async (ctx) => {
  const user = ctx.from;
  if (!user) return;

  // Initialize session profile
  ctx.session.userProfile = {
    telegramId: user.id,
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    xp: 100,
    streak: 1,
    lastActiveDate: new Date().toISOString(),
    cefrLevel: 'B1',
    isSubscribedToChannel: false,
    isPremium: false,
    createdAt: new Date().toISOString(),
  };

  await ctx.reply(
    `👋 Salom, <b>${user.first_name}</b>!\n\n` +
      `<b>Mentory</b> — sizning shaxsiy AI ingliz tili ustozingiz va aqlli xotira ekotizimingizga xush kelibsiz.\n\n` +
      `Pastdagi tugmani bosib, zamonaviy <b>Mini App</b> ga kiring yoki o'zingiz xohlagan mavzuda suhbatlashish uchun menga ovozli / matnli xabar yuboring!`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🚀 Mentory Mini App ni ochish',
              web_app: { url: process.env.MINI_APP_URL || 'https://mentory-app-demo.vercel.app' },
            },
          ],
          [
            { text: '📢 Shaxsiy kanalga obuna', url: 'https://t.me/ElshodDev' },
            { text: '💡 Qanday ishlaydi?', callback_data: 'help_info' },
          ],
        ],
      },
    }
  );
});

// Help Callback
bot.callbackQuery('help_info', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    `🤖 <b>Mentory qanday ishlaydi?</b>\n\n` +
      `1️⃣ <b>Smart Reading:</b> Matnlarni o'qing, noma'lum so'zlarni bosing va AI xulosalaridan zavqlaning.\n` +
      `2️⃣ <b>Speaking & Voice:</b> Istalgan vaqtda menga ovozli xabar yuboring, talaffuzingiz va ravonligingizni tahlil qilib beraman.\n` +
      `3️⃣ <b>Gamification:</b> Har kuni dars qiling, Streak (🔥) yig'ing va peshqadam bo'ling!`,
    { parse_mode: 'HTML' }
  );
});

// Handle text messages with Anthropic Claude AI
bot.on('message:text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return;

  const userMsg = ctx.message.text;
  const replyMsg = await ctx.reply('<i>AI ustoz o‘ylamoqda... 🤖</i>', { parse_mode: 'HTML' });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      system:
        "You are 'Mentory', an encouraging, highly professional AI English tutor for Uzbek speakers. Provide clear corrections, encourage fluency, and explain grammatical nuances in warm Uzbek language when appropriate.",
      messages: [{ role: 'user', content: userMsg }],
    });

    const aiText = response.content.map(block => block.type === 'text' ? block.text : '').join('');
    await ctx.api.editMessageText(ctx.chat.id, replyMsg.message_id, aiText, { parse_mode: 'HTML' });
  } catch (error) {
    await ctx.api.editMessageText(
      ctx.chat.id,
      replyMsg.message_id,
      "⚠️ Kechirasiz, AI xizmatiga ulanishda xatolik yuz berdi. Iltimos, API kalitni tekshiring."
    );
  }
});

export { bot };
