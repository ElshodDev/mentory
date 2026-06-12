import { motion } from 'framer-motion';
import { Crown, Check, ArrowRight, Star } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

export function PremiumTab() {
  const handleUpgrade = () => {
    // Show an alert to indicate it's coming soon or mock payment
    WebApp.showAlert("Tez orada: Telegram Stars orqali to'lov tizimi ishga tushadi!");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-6 pb-24">
      <div className="flex justify-center mb-6">
        <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full p-[3px] shadow-[0_0_30px_rgba(251,191,36,0.4)] relative">
          <div className="absolute -top-2 -right-2 bg-white text-yellow-600 text-[10px] font-black px-2 py-1 rounded-full shadow-lg border border-yellow-200 uppercase tracking-widest">
            Pro
          </div>
          <div className="w-full h-full bg-[#121424] rounded-full flex items-center justify-center">
            <Crown className="w-12 h-12 text-yellow-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
          </div>
        </div>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-3xl font-black mb-2 flex items-center justify-center gap-2">
          Mentory <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600">Premium</span>
        </h2>
        <p className="text-slate-400 text-sm max-w-[250px] mx-auto leading-relaxed">
          Ingliz tilini tezroq o'rganish uchun chegaralarni olib tashlang.
        </p>
      </div>

      <div className="bg-gradient-to-br from-[#1a1c2e] to-[#121424] border border-yellow-500/20 rounded-3xl p-6 mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl"></div>
        
        <ul className="space-y-4 relative z-10">
          <li className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 border border-emerald-500/30">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-sm text-slate-200 font-medium">Limitsiz AI Voice qatnashish</span>
          </li>
          <li className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 border border-emerald-500/30">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-sm text-slate-200 font-medium">Limitsiz Writing insholar tekshiruvi</span>
          </li>
          <li className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 border border-emerald-500/30">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-sm text-slate-200 font-medium">VIP profildagi oltin toj belgisi</span>
          </li>
          <li className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 border border-emerald-500/30">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-sm text-slate-200 font-medium">1v1 Janglarda 2x tajriba (XP)</span>
          </li>
        </ul>
      </div>

      <button 
        onClick={handleUpgrade}
        className="w-full py-4 relative group overflow-hidden bg-gradient-to-r from-yellow-500 to-amber-600 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95 transition-all"
      >
        <div className="absolute inset-0 bg-white/20 w-0 group-hover:w-full transition-all duration-300 ease-out"></div>
        <div className="flex items-center justify-center gap-2 text-white font-black text-sm relative z-10">
          <Star className="w-5 h-5 fill-white" />
          500 Telegram Stars / Oylik
          <ArrowRight className="w-4 h-4 ml-1" />
        </div>
      </button>

      <p className="text-center text-[10px] text-slate-500 mt-4 uppercase tracking-wider font-bold">
        Tez orada boshqa to'lov turlari ulanadi
      </p>
    </motion.div>
  );
}
