import React, { useState } from 'react';
import { BookOpen, Sparkles, Trophy, Mic, Bookmark, Flame, CheckCircle2, ChevronRight, RefreshCw, Star, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import WebApp from '@twa-dev/sdk';

export default function App() {
  const [activeTab, setActiveTab] = useState<'reading' | 'cards' | 'voice' | 'leaderboard'>('reading');
  const [streak, setStreak] = useState(5);
  const [xp, setXp] = useState(450);

  // Smart Reading Flow simulation state
  const [readingStep, setReadingStep] = useState<'text' | 'ai_summary' | 'speaking_bridge' | 'completed'>('text');
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [activeWordPopup, setActiveWordPopup] = useState<{ word: string; trans: string } | null>(null);

  const sampleReadingText = [
    { word: "Artificial", trans: "Sun'iy", isHard: true },
    { word: "intelligence", trans: "Intellekt", isHard: true },
    { word: "has", trans: "ega", isHard: false },
    { word: "fundamentally", trans: "Asosiy jihatdan", isHard: true },
    { word: "transformed", trans: "O'zgartirib yubordi", isHard: true },
    { word: "modern", trans: "Zamonaviy", isHard: false },
    { word: "pedagogy", trans: "Pedagogika (ta'lim uslubi)", isHard: true },
    { word: "by", trans: "orqali", isHard: false },
    { word: "providing", trans: "Taqdim etish", isHard: false },
    { word: "adaptive", trans: "Moslashuvchan", isHard: true },
    { word: "immersion", trans: "To'liq sho'ng'ish / Muhit", isHard: true },
    { word: "environments.", trans: "Muhitlar.", isHard: false }
  ];

  const handleWordClick = (item: { word: string; trans: string; isHard: boolean }) => {
    try { WebApp.HapticFeedback.impactOccurred('light'); } catch (e) {}
    setActiveWordPopup(item);

    if (item.isHard && !selectedWords.includes(item.word)) {
      const newWords = [...selectedWords, item.word];
      setSelectedWords(newMsg => newWords);
      // Trigger AI summary if 3+ hard words clicked
      if (newWords.length >= 3 && readingStep === 'text') {
        setTimeout(() => setReadingStep('ai_summary'), 1200);
      }
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 text-white flex flex-col pb-24 font-sans selection:bg-indigo-500">
      {/* Top Header */}
      <header className="sticky top-0 z-50 glassmorphism px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/30">
            M
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight tracking-wide bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
              Mentory AI
            </h1>
            <p className="text-xs text-slate-400 font-medium">B1 • Intermediate</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-dark-800/80 px-3 py-1.5 rounded-full border border-white/10">
          <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
            <Flame className="w-4 h-4 fill-amber-500" /> {streak}
          </div>
          <div className="h-3 w-[1px] bg-white/20"></div>
          <div className="flex items-center gap-1 text-indigo-400 font-bold text-sm">
            <Sparkles className="w-4 h-4" /> {xp} XP
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'reading' && (
            <motion.div key="reading" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-4">
                <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                  Smart Reading Flow
                </span>
                <h2 className="text-2xl font-extrabold mt-2 tracking-tight">AI & Modern Education</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Matndagi noma'lum so'zlarni bosing. 3 ta qiyin so'z bosilganda AI avtomatik yordamga keladi.
                </p>
              </div>

              {/* Text Container */}
              <div className="glassmorphism p-5 rounded-2xl border border-white/10 leading-relaxed text-lg mb-6 shadow-xl">
                <div className="flex flex-wrap gap-x-2 gap-y-3">
                  {sampleReadingText.map((item, idx) => {
                    const isClicked = selectedWords.includes(item.word);
                    return (
                      <button
                        key={idx}
                        onClick={() => handleWordClick(item)}
                        className={`transition-all duration-200 px-1.5 py-0.5 rounded-lg font-medium cursor-pointer ${
                          isClicked
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                            : 'hover:bg-white/10 active:scale-95'
                        }`}
                      >
                        {item.word}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Word Popup */}
              {activeWordPopup && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glassmorphism p-4 rounded-2xl border border-indigo-500/30 bg-indigo-950/40 mb-6 flex items-center justify-between shadow-2xl">
                  <div>
                    <div className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-0.5">Tarjima va Ovoz</div>
                    <div className="text-xl font-bold text-white flex items-center gap-2">
                      {activeWordPopup.word} <span className="text-sm text-slate-400 font-normal">/phonetic/</span>
                    </div>
                    <div className="text-amber-400 font-semibold text-base mt-1">🇺🇿 {activeWordPopup.trans}</div>
                  </div>
                  <button className="w-11 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 active:scale-95 transition-all">
                    <Mic className="w-5 h-5" />
                  </button>
                </motion.div>
              )}

              {/* AI Summary Intervention Step */}
              {readingStep === 'ai_summary' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-3xl bg-gradient-to-b from-indigo-900/80 to-purple-900/80 border border-indigo-400/40 shadow-2xl relative overflow-hidden mb-6">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl -z-10"></div>
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm uppercase tracking-wider mb-2">
                    <Sparkles className="w-5 h-5 animate-spin" /> AI Xulosa Trigger (3+ so'z)
                  </div>
                  <h3 className="text-xl font-extrabold mb-2">AI tushuntirishi:</h3>
                  <p className="text-indigo-100 text-sm leading-relaxed mb-4 bg-black/30 p-3.5 rounded-xl border border-white/10 font-medium">
                    "Ushbu matnda AI texnologiyalari ta'lim muhitini butunlay o'zgartirib, insonni til muhitiga to'liq sho'ng'itishi (immersion) haqida so'z bormoqda."
                  </p>
                  <button
                    onClick={() => setReadingStep('speaking_bridge')}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold flex items-center justify-center gap-2 hover:opacity-95 shadow-xl shadow-amber-500/20 transition-all"
                  >
                    Qiynalgan so'zlar bilan Speaking'ga o'tish <ChevronRight className="w-5 h-5" />
                  </button>
                </motion.div>
              )}

              {/* Speaking Bridge Step */}
              {readingStep === 'speaking_bridge' && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glassmorphism p-6 rounded-3xl border border-amber-500/40 text-center relative overflow-hidden mb-6">
                  <div className="w-16 h-16 bg-amber-500/20 rounded-2xl mx-auto flex items-center justify-center mb-3 text-amber-400 border border-amber-500/30">
                    <Mic className="w-8 h-8 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold mb-1">Speaking Aktivlashtirish</h3>
                  <p className="text-slate-400 text-xs mb-4">
                    Siz <span className="text-amber-400 font-bold">pedagogy</span> va <span className="text-amber-400 font-bold">immersion</span> so'zlarida qiynaldingiz. Ular ishtirokida bitta gap tuzib mikrofonga ayting!
                  </p>
                  <button
                    onClick={() => {
                      setXp(x => x + 50);
                      setReadingStep('completed');
                      try { WebApp.HapticFeedback.notificationOccurred('success'); } catch(e){}
                    }}
                    className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 transition-all active:scale-95"
                  >
                    Ovozli javob yozish (Simulyatsiya)
                  </button>
                </motion.div>
              )}

              {/* Completed Step */}
              {readingStep === 'completed' && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-6 rounded-3xl bg-gradient-to-tr from-emerald-900/60 to-emerald-600/40 border border-emerald-500/40 text-center mb-6 shadow-2xl">
                  <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-3 animate-bounce" />
                  <h3 className="text-2xl font-extrabold text-white mb-1">+50 XP Bonus!</h3>
                  <p className="text-emerald-200 text-sm mb-4">Siz qiyin so'zlardan muvaffaqiyatli gap tuzdingiz!</p>
                  <button onClick={() => { setReadingStep('text'); setSelectedWords([]); }} className="px-6 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl text-sm transition-all border border-white/20">
                    Yangi matn o'qish
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Flashcards Tab */}
          {activeTab === 'cards' && (
            <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-full mb-3 inline-block">
                Spaced Repetition
              </span>
              <h2 className="text-3xl font-extrabold mb-6 tracking-tight">So'z Kartochkalari</h2>
              <div className="w-full h-80 glassmorphism rounded-3xl border border-indigo-500/30 flex flex-col items-center justify-center p-6 relative overflow-hidden shadow-2xl bg-gradient-to-b from-indigo-950/50 to-slate-900/80">
                <div className="absolute top-4 right-4 text-xs font-bold px-2.5 py-1 rounded-lg bg-white/10 text-slate-300">
                  1 / 15
                </div>
                <Bookmark className="w-12 h-12 text-indigo-400 mb-3" />
                <h3 className="text-4xl font-extrabold text-white tracking-wider mb-2">Immersion</h3>
                <p className="text-lg text-amber-400 font-semibold mb-6">🇺🇿 To'liq sho'ng'ish / Muhit</p>
                <div className="text-xs text-slate-400 italic bg-black/30 px-4 py-2 rounded-xl border border-white/5">
                  "Immersion is the best way to master English."
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button onClick={() => setXp(x => x + 10)} className="flex-1 py-4 rounded-2xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-bold text-base active:scale-95 transition-all">
                  Qiyin (Qaytarish)
                </button>
                <button onClick={() => setXp(x => x + 25)} className="flex-1 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-base shadow-lg shadow-emerald-500/30 active:scale-95 transition-all">
                  Oson (Yodladim)
                </button>
              </div>
            </motion.div>
          )}

          {/* Voice Chat Tab */}
          {activeTab === 'voice' && (
            <motion.div key="voice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-6 text-center">
              <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold rounded-full mb-3 inline-block">
                Claude 3.5 Sonnet Voice
              </span>
              <h2 className="text-3xl font-extrabold mb-2">AI Ovozli Tandem</h2>
              <p className="text-slate-400 text-sm mb-8">O'zingiz xohlagan mavzuda inglizcha erkin suhbatlashing</p>

              <div className="w-48 h-48 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 mx-auto flex items-center justify-center p-2 shadow-2xl shadow-indigo-500/40 cursor-pointer animate-pulse border-4 border-white/20">
                <Mic className="w-20 h-20 text-white" />
              </div>
              <p className="text-xs text-indigo-300 font-semibold tracking-wider mt-6 uppercase">Gapirish uchun bosing</p>
            </motion.div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4">
              <h2 className="text-2xl font-extrabold mb-4 flex items-center gap-2">
                <Trophy className="text-amber-400 w-7 h-7" /> Haftalik Peshqadamlar
              </h2>
              <div className="space-y-3">
                {[
                  { pos: 1, name: "Azizbek Rahimov", xp: 3420, isUser: false },
                  { pos: 2, name: "Shahnoza IELTS", xp: 2890, isUser: false },
                  { pos: 3, name: "Siz (Mentory AI)", xp: 450, isUser: true },
                  { pos: 4, name: "Timur Dev", xp: 410, isUser: false },
                ].map((u, i) => (
                  <div key={i} className={`p-4 rounded-2xl flex items-center justify-between font-bold border transition-all ${
                    u.isUser
                      ? 'bg-gradient-to-r from-indigo-600/40 to-purple-600/40 border-indigo-400 text-white shadow-lg shadow-indigo-500/20 scale-102'
                      : 'glassmorphism border-white/10 text-slate-300'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                        u.pos === 1 ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30' :
                        u.pos === 2 ? 'bg-slate-300 text-black' :
                        u.pos === 3 ? 'bg-amber-700 text-white' : 'bg-white/10'
                      }`}>{u.pos}</span>
                      <span>{u.name}</span>
                    </div>
                    <span className="text-indigo-400 font-extrabold">{u.xp} XP</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glassmorphism border-t border-white/10 px-6 py-3 flex items-center justify-around max-w-md mx-auto">
        {[
          { id: 'reading', label: 'Reading', icon: BookOpen },
          { id: 'cards', label: 'SRS Cards', icon: Bookmark },
          { id: 'voice', label: 'Voice AI', icon: Mic },
          { id: 'leaderboard', label: 'Top', icon: Trophy },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { WebApp.HapticFeedback.selectionChanged(); setActiveTab(tab.id as any); }}
              className={`flex flex-col items-center gap-1 transition-all ${
                isActive ? 'text-indigo-400 scale-110 font-bold' : 'text-slate-400 hover:text-white font-medium'
              }`}
            >
              <Icon className={`w-6 h-6 transition-all ${isActive ? 'drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]' : ''}`} />
              <span className="text-[10px] tracking-wide">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
