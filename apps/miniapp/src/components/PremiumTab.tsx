import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Check, Star, CreditCard, ChevronRight, Zap } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

export function PremiumTab() {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = (method?: 'stars' | 'click') => {
    setIsProcessing(true);
    WebApp.HapticFeedback.impactOccurred('medium');
    setTimeout(() => {
      setIsProcessing(false);
      WebApp.showAlert("Ushbu xususiyat tez kunda (Update'da) ishga tushadi! 🚀 Hozircha barcha imkoniyatlar bepul.");
    }, 1500);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-6 pb-32 px-4">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center mb-8 relative">
        <div className="absolute top-10 w-full h-32 bg-yellow-500/20 blur-[50px] -z-10 rounded-full"></div>
        
        <div className="w-24 h-24 bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-600 rounded-[2rem] p-[2px] shadow-[0_0_40px_rgba(245,158,11,0.3)] mb-4 rotate-3">
          <div className="w-full h-full bg-[#121424] rounded-[1.8rem] flex items-center justify-center -rotate-3 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent"></div>
            <Crown className="w-12 h-12 text-yellow-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]" />
          </div>
        </div>
        
        <h2 className="text-3xl font-black mb-2 text-white">
          Mentory <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">PRO</span>
        </h2>
        <p className="text-slate-400 text-sm px-4">
          Ingliz tilini o'rganishda hech qanday chegaralarsiz, eng kuchli AI vositalaridan foydalaning.
        </p>
      </div>

      {/* Features List */}
      <div className="bg-[#1a1c2e] border border-white/5 rounded-3xl p-6 mb-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/5 rounded-full blur-3xl"></div>
        
        <ul className="space-y-4 relative z-10">
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 border border-yellow-500/30">
              <Check className="w-3.5 h-3.5 text-yellow-400" />
            </div>
            <div>
              <span className="text-sm text-white font-bold block">Limitsiz IELTS Mock Testlar</span>
              <span className="text-[11px] text-slate-400">Har kuni istalgancha Speaking test topshiring</span>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 border border-yellow-500/30">
              <Check className="w-3.5 h-3.5 text-yellow-400" />
            </div>
            <div>
              <span className="text-sm text-white font-bold block">Limitsiz YouTube Tarjimalar</span>
              <span className="text-[11px] text-slate-400">Videolardagi cheksiz so'zlarni analiz qiling</span>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 border border-yellow-500/30">
              <Check className="w-3.5 h-3.5 text-yellow-400" />
            </div>
            <div>
              <span className="text-sm text-white font-bold block">AI Xatolarni tuzatuvchi</span>
              <span className="text-[11px] text-slate-400">Writing insholarini mukammal darajada tekshirish</span>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 border border-yellow-500/30">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
            </div>
            <div>
              <span className="text-sm text-white font-bold block">Navbatsiz tezkor javoblar</span>
              <span className="text-[11px] text-slate-400">AI sizga eng birinchi bo'lib xizmat ko'rsatadi</span>
            </div>
          </li>
        </ul>
      </div>

      {/* Pricing Cards */}
      <div className="flex gap-3 mb-8">
        <button 
          onClick={() => setSelectedPlan('monthly')}
          className={`flex-1 p-4 rounded-3xl border-2 text-left transition-all relative overflow-hidden ${selectedPlan === 'monthly' ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/5 bg-[#121424] opacity-70'}`}
        >
          {selectedPlan === 'monthly' && <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/20 rounded-bl-full"></div>}
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">1 Oylik</div>
          <div className="text-2xl font-black text-white mb-1">30<span className="text-sm text-slate-400 font-medium"> ming</span></div>
          <div className="text-[10px] text-yellow-400 font-medium">Yoki 150 Stars ⭐️</div>
        </button>

        <button 
          onClick={() => setSelectedPlan('yearly')}
          className={`flex-1 p-4 rounded-3xl border-2 text-left transition-all relative overflow-hidden ${selectedPlan === 'yearly' ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/5 bg-[#121424] opacity-70'}`}
        >
          {selectedPlan === 'yearly' && <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/20 rounded-bl-full"></div>}
          <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[9px] font-black px-2 py-1 rounded-bl-xl uppercase tracking-wider">
            -20%
          </div>
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">6 Oylik</div>
          <div className="text-2xl font-black text-white mb-1">150<span className="text-sm text-slate-400 font-medium"> ming</span></div>
          <div className="text-[10px] text-yellow-400 font-medium">Yoki 750 Stars ⭐️</div>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button 
          disabled={isProcessing}
          onClick={() => handleUpgrade('stars')}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(59,130,246,0.3)] transition-all active:scale-95 disabled:opacity-70"
        >
          {isProcessing ? (
            <span className="animate-pulse">Iltimos kuting...</span>
          ) : (
            <>
              <Star className="w-5 h-5 fill-current text-yellow-300" />
              Telegram Stars bilan to'lash
              <ChevronRight className="w-5 h-5 opacity-50" />
            </>
          )}
        </button>
        
        <button 
          disabled={isProcessing}
          onClick={() => handleUpgrade('click')}
          className="w-full bg-[#1a1c2e] hover:bg-[#252840] border border-white/10 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70"
        >
          <CreditCard className="w-5 h-5 text-blue-400" />
          Plastik karta (Click / Payme)
        </button>
      </div>

      <p className="text-center text-[10px] text-slate-500 mt-6 px-4">
        To'lov xavfsiz Telegram tomonidan himoyalangan. Agar obuna xarid qilsangiz, avtomatik ravishda qabul qilinadi.
      </p>
    </motion.div>
  );
}
