import { motion } from 'framer-motion';
import { Users, Copy, CheckCircle, Share2 } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { useState } from 'react';

interface ReferralsTabProps {
  telegramId: number;
  referralsCount: number;
}

export function ReferralsTab({ telegramId, referralsCount }: ReferralsTabProps) {
  const [copied, setCopied] = useState(false);
  const botUsername = 'MentoryAI_bot'; // Todo: get dynamic bot username
  const refLink = `https://t.me/${botUsername}?start=ref_${telegramId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    try { WebApp.HapticFeedback.notificationOccurred('success'); } catch(e){}
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = () => {
    const text = "Men bilan ingliz tilini o'rganing! Bepul IELTS va CEFR Mentory AI boti 🚀";
    WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(text)}`);
  };

  return (
    <motion.div key="referrals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2 pb-24 flex flex-col items-center">
      <h2 className="text-2xl font-black mb-1.5 flex items-center gap-2 tracking-tight w-full">
        <Users className="text-cyan-400 w-6 h-6 stroke-[2.5px]" /> Do'stlarni Taklif
      </h2>
      <p className="text-xs text-slate-400 mb-6 leading-relaxed w-full">
        Do'stingizni taklif qiling va har bir yangi ishtirokchi uchun <b className="text-cyan-400">+500 XP</b> bonusga ega bo'ling!
      </p>

      <div className="w-full bg-gradient-to-br from-[#121424] to-[#1a2035] border border-cyan-500/20 p-5 rounded-3xl shadow-xl mb-6 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-cyan-500/30">
            <Users className="w-8 h-8 text-cyan-400" />
          </div>
          <h3 className="text-3xl font-black text-white">{referralsCount}</h3>
          <p className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold mt-1">Taklif qilingan do'stlar</p>
        </div>

        <div className="bg-black/30 p-3 rounded-2xl border border-white/5 flex items-center justify-between gap-3 mb-4">
          <div className="flex-1 overflow-hidden">
            <p className="text-xs text-slate-300 truncate font-medium">{refLink}</p>
          </div>
          <button 
            onClick={copyLink}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-95"
          >
            {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>

        <button 
          onClick={shareLink}
          className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Share2 className="w-4 h-4" /> Telegramda ulashish
        </button>
      </div>

      <div className="w-full bg-[#121424] border border-white/5 rounded-3xl p-5">
        <h4 className="text-sm font-bold text-white mb-3">Qanday ishlaydi?</h4>
        <ul className="space-y-3">
          <li className="flex items-start gap-3 text-xs text-slate-400 leading-relaxed">
            <div className="w-5 h-5 bg-cyan-500/10 rounded-full flex items-center justify-center flex-shrink-0 text-cyan-400 font-bold text-[10px]">1</div>
            Havolani nusxalang yoki do'stlaringizga yuboring.
          </li>
          <li className="flex items-start gap-3 text-xs text-slate-400 leading-relaxed">
            <div className="w-5 h-5 bg-cyan-500/10 rounded-full flex items-center justify-center flex-shrink-0 text-cyan-400 font-bold text-[10px]">2</div>
            Ular botga kirishadi va o'z darajasini tanlashadi.
          </li>
          <li className="flex items-start gap-3 text-xs text-slate-400 leading-relaxed">
            <div className="w-5 h-5 bg-cyan-500/10 rounded-full flex items-center justify-center flex-shrink-0 text-cyan-400 font-bold text-[10px]">3</div>
            Sizga va do'stingizga avtomatik tarzda +500 XP yoziladi.
          </li>
        </ul>
      </div>
    </motion.div>
  );
}
