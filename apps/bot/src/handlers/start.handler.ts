import { Context, InlineKeyboard } from 'grammy';
import { UserService } from '../services/user.service';
import { dbManager } from '../repositories/db.repository';

const MINI_APP_URL = process.env.MINI_APP_URL || 'https://aaalr-185-139-138-130.run.pinggy-free.link';
const CHANNEL_LINK = 'https://t.me/Elshod_Makhammadivich_I';
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME || '@Elshod_Makhammadivich_I';

export function subCheckKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url('📢 Kanalga obuna bo\'lish', CHANNEL_LINK)
    .row()
    .text('✅ Obuna bo\'ldim, tekshir!', 'check_sub');
}

export function mainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .webApp('🚀 Mentory Mini App (Ochish)', MINI_APP_URL).row()
    .text('✍️ Writing',   'menu_writing').text('📖 Grammar', 'menu_grammar').row()
    .text('🗣️ Speaking',  'menu_speaking').text('📚 Vocab',  'menu_vocab').row()
    .text('📊 Mening profilim', 'menu_profile').row();
}

async function checkSubscription(ctx: Context): Promise<boolean> {
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

export async function handleStartCommand(ctx: any) {
  ctx.session.waitingFor = null;
  const profile = UserService.getOrCreateUser(ctx.from!.id, ctx.from!.first_name, ctx.from!.username);

  // Onboarding (Darajani tanlash) faqat yangi foydalanuvchilarga
  if (profile.xp === 0 && profile.totalLessons === 0) {
    await ctx.reply(
      `🎉 <b>Mentory AI</b> ga xush kelibsiz, <b>${ctx.from!.first_name}</b>!\n\n` +
      `Sizga mos darsliklarni tanlashim uchun, iltimos, ingliz tili darajangizni belgilang. ` +
      `Tanlovingizga qarab sizga boshlang'ich bonus XP taqdim etiladi!`,
      {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('🌱 Beginner (A1-A2)', 'onboard_a1').row()
          .text('📘 Intermediate (B1-B2)', 'onboard_b1').row()
          .text('🏆 Advanced (C1-C2)', 'onboard_c1')
      }
    );
    return;
  }

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
  const lvl = UserService.getLevel(profile.xp);

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
}

export async function handleOnboardingCallback(ctx: any) {
  await ctx.answerCallbackQuery();
  const data = ctx.callbackQuery.data;
  let bonusXp = 0;
  let league = 'Bronze';
  
  if (data === 'onboard_a1') { bonusXp = 50; league = 'Bronze'; }
  if (data === 'onboard_b1') { bonusXp = 350; league = 'Silver'; }
  if (data === 'onboard_c1') { bonusXp = 1050; league = 'Gold'; }

  const profile = UserService.getOrCreateUser(ctx.from!.id, ctx.from!.first_name, ctx.from!.username);
  profile.xp += bonusXp;
  profile.league = league;
  dbManager.updateUser(profile);

  const lvl = UserService.getLevel(profile.xp);

  await ctx.editMessageText(
    `✅ Daraja qabul qilindi!\n\n` +
    `🎉 Sizga <b>+${bonusXp} XP</b> bonus berildi va siz <b>${league} League</b> ga qo'shildingiz!\n\n` +
    `📊 Hozirgi holatingiz:\n` +
    `${lvl.emoji} Daraja: <b>${lvl.title}</b> (Level ${lvl.level})\n` +
    `⚡ XP: <b>${profile.xp}</b>\n\n` +
    `Quyidan kerakli bo'limni tanlang:`,
    { parse_mode: 'HTML', reply_markup: mainMenuKeyboard() }
  );
}
