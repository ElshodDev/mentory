import { Context } from 'grammy';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { WRITING_TUTOR_PROMPT } from '../prompts/writing-tutor.prompt';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function handleWritingQuery(ctx: Context) {
  const userMessage = ctx.message?.text;
  if (!userMessage) return;

  const loadingMsg = await ctx.reply('✍️ *AI Writing Coach o\'ylamoqda...*', { parse_mode: 'Markdown' });

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: WRITING_TUTOR_PROMPT,
    });

    const chat = model.startChat({
      history: [],
    });

    const result = await chat.sendMessage(userMessage);
    let response = result.response.text();

    // Clean markdown formatting if any HTML parsing issue occurs, or use Markdown format
    // Replace markdown tags to standard telegram supported ones or just send as Markdown
    // Telegram's Markdown parsing can be strict. Let's send using Markdown mode (V1 or V2).
    // GrammY's parse_mode: 'Markdown' supports standard markdown like *bold*, _italic_, `code`
    await ctx.api.editMessageText(ctx.chat!.id, loadingMsg.message_id, response, { parse_mode: 'Markdown' });
  } catch (error: any) {
    console.error("WRITING HANDLER ERROR:", error);
    await ctx.api.editMessageText(ctx.chat!.id, loadingMsg.message_id, `⚠️ Xatolik yuz berdi: ${error.message || error}`);
  }
}
