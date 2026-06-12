import { Context } from 'grammy';
import { AIService } from '../services/ai.service';
import { dbManager } from '../repositories/db.repository';

export async function handlePhotoMessage(ctx: Context) {
  if (!ctx.message || !ctx.message.photo) return;
  const userId = ctx.from!.id;

  const waitMsg = await ctx.reply("📸 Rasm qabul qilindi! AI uni o'qib, yangi so'zlarni ajratib olmoqda. Iltimos kuting... ⏳");

  try {
    // Get highest resolution photo
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileId = photo.file_id;
    
    // Get file URL from Telegram
    const file = await ctx.api.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;
    
    // Download image buffer
    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    
    // Process with Gemini Vision
    const extractedWords = await AIService.extractWordsFromImage(base64Image, 'image/jpeg');

    if (!extractedWords || extractedWords.length === 0) {
      await ctx.api.editMessageText(ctx.chat!.id, waitMsg.message_id, "⚠️ Rasmdan hech qanday inglizcha so'z topilmadi yoki rasm xira.");
      return;
    }

    let responseText = "✅ <b>Topilgan yangi so'zlar:</b>\n\n";

    for (let i = 0; i < extractedWords.length; i++) {
      const { word, translation, sentence } = extractedWords[i];
      // Save to DB
      await dbManager.saveWord({
        id: `${word.toLowerCase()}_${userId}`,
        userId,
        word,
        translation,
        sentence: sentence || '',
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5,
        nextReviewDate: new Date().toISOString().split('T')[0]
      });
      responseText += `🔸 <b>${word}</b> - ${translation}\n`;
    }

    responseText += `\n<i>Barcha so'zlar sizning "Flashcards" bo'limingizga muvaffaqiyatli saqlandi! MiniApp'ga kirib yodlashni boshlashingiz mumkin.</i> 🚀`;

    await ctx.api.editMessageText(ctx.chat!.id, waitMsg.message_id, responseText, { parse_mode: 'HTML' });

  } catch (error) {
    console.error("Photo Handler Error:", error);
    await ctx.api.editMessageText(ctx.chat!.id, waitMsg.message_id, "❌ Xatolik yuz berdi. Iltimos boshqa rasm jo'natib ko'ring.");
  }
}
