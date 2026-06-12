import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Sparkles, Mic, ChevronRight, CheckCircle2, Volume2, Plus, Image } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { apiService } from '../services/api';

interface ReadingData {
  title: string;
  text: string;
  hardWords: { word: string; trans: string; isHard: boolean }[];
}

interface ReadingTabProps {
  telegramId: number;
  currentLevel: { cefr: string };
  onXpEarned: (amount: number) => void;
  onLessonCompleted: () => void;
}

export function ReadingTab({ telegramId, currentLevel, onXpEarned, onLessonCompleted }: ReadingTabProps) {
  const [readingData, setReadingData] = useState<ReadingData | null>(null);
  const [loadingReading, setLoadingReading] = useState(false);
  const [readingStep, setReadingStep] = useState<'text' | 'ai_summary' | 'speaking_bridge' | 'completed'>('text');
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [activeWordPopup, setActiveWordPopup] = useState<{ word: string; trans: string; isTranslating?: boolean; type?: string } | null>(null);
  const [aiSummary, setAiSummary] = useState<string>('');

  // Custom reading states
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customImage, setCustomImage] = useState<File | null>(null);
  const [customImagePreview, setCustomImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchNewReading = async () => {
    setLoadingReading(true);
    setReadingStep('text');
    setSelectedWords([]);
    setActiveWordPopup(null);
    setAiSummary('');
    try {
      const data = await apiService.fetchReading(currentLevel.cefr);
      setReadingData(data);
      localStorage.setItem('mentory_last_reading', JSON.stringify(data));
      setAiSummary(`Ushbu matnda "${data.title}" mavzusi, ya'ni darajangizga mos asosiy ingliz tili tushunchalari va yangi iboralar o'rganilishi haqida so'z boradi.`);
    } catch (e) {
      console.error("Error loading reading passage:", e);
      const cached = localStorage.getItem('mentory_last_reading');
      if (cached) {
        const data = JSON.parse(cached);
        setReadingData(data);
        setAiSummary(`Ushbu matnda "${data.title}" mavzusi, ya'ni darajangizga mos asosiy ingliz tili tushunchalari va yangi iboralar o'rganilishi haqida so'z boradi.`);
      }
    } finally {
      setLoadingReading(false);
    }
  };

  useEffect(() => {
    if (!readingData) {
      const cached = localStorage.getItem('mentory_last_reading');
      if (cached) {
        setReadingData(JSON.parse(cached));
      } else {
        fetchNewReading();
      }
    }
  }, [readingData]);

  const saveWordToDb = async (word: string, translation: string) => {
    try {
      await apiService.saveWord(telegramId, word, translation, readingData?.text || '');
    } catch (e) {
      console.error("Error saving word:", e);
    }
  };

  const speakWord = (word: string) => {
    try { WebApp.HapticFeedback.impactOccurred('light'); } catch(e){}
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCustomSubmit = async () => {
    if (!customText && !customImage) {
      WebApp.showAlert("Iltimos, matn kiriting yoki rasm yuklang!");
      return;
    }

    setLoadingReading(true);
    setShowCustomModal(false);
    setReadingStep('text');
    setSelectedWords([]);
    setActiveWordPopup(null);
    try {
      let base64Image: string | undefined;
      let mimeType: string | undefined;

      if (customImage) {
        const buffer = await customImage.arrayBuffer();
        base64Image = Buffer.from(buffer).toString('base64');
        mimeType = customImage.type;
      }

      const data = await apiService.generateCustomReading(telegramId, customText, base64Image, mimeType);
      setReadingData(data);
      setAiSummary(`Ushbu shaxsiy matnda "${data.title}" mavzusi yoritilgan.`);
    } catch (e) {
      console.error("Custom reading error:", e);
      WebApp.showAlert("Matnni o'qishda xatolik yuz berdi. Boshqa matn/rasm ko'ring.");
    } finally {
      setLoadingReading(false);
      setCustomText('');
      setCustomImage(null);
      setCustomImagePreview(null);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setCustomImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleWordClick = async (rawWord: string) => {
    try { WebApp.HapticFeedback.impactOccurred('light'); } catch (e) {}
    
    const cleanWord = rawWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim();
    if (!cleanWord) return;

    if (!selectedWords.includes(cleanWord)) {
      const newSelected = [...selectedWords, cleanWord];
      setSelectedWords(newSelected);
      onXpEarned(5);

      if (newSelected.length >= 3 && readingStep === 'text') {
        setTimeout(() => setReadingStep('ai_summary'), 1500);
      }
    }

    const hardMatch = readingData?.hardWords.find(hw => hw.word.toLowerCase() === cleanWord.toLowerCase());
    
    if (hardMatch) {
      setActiveWordPopup({ word: cleanWord, trans: hardMatch.trans });
      saveWordToDb(cleanWord, hardMatch.trans);
    } else {
      setActiveWordPopup({ word: cleanWord, trans: 'Tarjima qilinmoqda...', isTranslating: true });
      try {
        const sentence = readingData?.text || '';
        const data = await apiService.translateWord(cleanWord, sentence);
        setActiveWordPopup({ word: cleanWord, trans: data.translation, type: data.type });
        saveWordToDb(cleanWord, data.translation);
      } catch (e) {
        setActiveWordPopup({ word: cleanWord, trans: 'Tarjima yuklashda xato' });
      }
    }
  };

  const renderInteractiveText = (text: string) => {
    return text.split(' ').map((word, i) => {
      const clean = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase();
      const isHard = readingData?.hardWords.some(hw => hw.word.toLowerCase() === clean);
      const isSelected = selectedWords.includes(word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim());
      
      let className = "relative inline-block cursor-pointer transition-colors px-0.5 rounded ";
      if (isSelected) className += "bg-indigo-500/30 text-indigo-300 font-medium ";
      else if (isHard) className += "text-amber-400 font-medium border-b border-amber-400/30 border-dashed hover:bg-white/5 ";
      else className += "text-slate-300 hover:bg-white/5 ";

      return (
        <span key={i} onClick={() => handleWordClick(word)} className={className}>
          {word}
        </span>
      );
    });
  };

  return (
    <motion.div key="reading" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-extrabold px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
            Smart Reading
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowCustomModal(true)}
              className="p-2 hover:bg-white/5 active:scale-95 transition-all text-slate-400 hover:text-white rounded-xl border border-white/5 bg-white/5 flex items-center gap-1 text-xs font-bold"
            >
              <Plus className="w-4 h-4" /> Matn
            </button>
            <button 
              onClick={fetchNewReading}
              disabled={loadingReading}
              className="p-2 hover:bg-white/5 active:scale-95 transition-all text-slate-400 hover:text-white rounded-xl border border-white/5 bg-white/5 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingReading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <h2 className="text-2xl font-black mt-2 tracking-tight">
          {loadingReading ? "Yangi mavzu qidirilmoqda..." : (readingData?.title || "AI & Modern Education")}
        </h2>
        <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
          Noma'lum so'zni tanlang. Uning tarjimasi AI yordamida o'zbekchaga o'giriladi va avtomatik <b>SRS Lug'atga</b> saqlanadi.
        </p>
      </div>

      {loadingReading ? (
        <div className="bg-white/5 border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center gap-4 py-20">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-xs text-indigo-200 text-center font-medium">Gemini AI sizning darajangizga mos darslik yozmoqda...</p>
        </div>
      ) : (
        <>
          {/* Text Container */}
          <div className="bg-[#121424] p-5 rounded-3xl border border-white/5 leading-relaxed text-[17px] mb-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -z-10"></div>
            <div className="flex flex-wrap gap-x-1.5 gap-y-2.5">
              {readingData?.text ? renderInteractiveText(readingData.text) : "Matn yuklanmadi. Qayta urinib ko'ring."}
            </div>
          </div>

          {/* Word Translation Popup */}
          {activeWordPopup && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="bg-gradient-to-r from-indigo-950/70 to-purple-950/70 p-5 rounded-2xl border border-indigo-500/30 mb-4 flex items-center justify-between shadow-2xl backdrop-blur-md"
            >
              <div className="flex-1 pr-2">
                <div className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider mb-0.5">Lug'at va AI Tarjima</div>
                <div className="text-lg font-extrabold text-white flex items-center gap-2">
                  {activeWordPopup.word}
                  <button 
                    onClick={() => speakWord(activeWordPopup.word)}
                    className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-indigo-400 transition-colors"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  {activeWordPopup.type && (
                    <span className="bg-indigo-500/20 text-indigo-300 text-[9px] px-1.5 py-0.5 rounded-md uppercase font-bold">
                      {activeWordPopup.type}
                    </span>
                  )}
                </div>
                <div className="text-amber-400 font-bold text-sm mt-1 flex items-center gap-1.5">
                  {activeWordPopup.isTranslating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  ) : "🇺🇿"}
                  <span>{activeWordPopup.trans}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1.5 rounded-xl">
                  Saved +5 XP
                </span>
              </div>
            </motion.div>
          )}

          {/* Step: AI Summary Intervention */}
          {readingStep === 'ai_summary' && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-3xl bg-gradient-to-b from-indigo-900/60 to-purple-950/60 border border-indigo-500/30 shadow-2xl relative overflow-hidden mb-4">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -z-10"></div>
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4 animate-bounce text-amber-400" /> AI Xulosa (3+ so'z)
              </div>
              <h3 className="text-base font-extrabold mb-1.5 text-white">Dars Xulosasi:</h3>
              <p className="text-indigo-100 text-xs leading-relaxed mb-4 bg-black/35 p-3 rounded-xl border border-white/5 font-medium">
                {aiSummary}
              </p>
              <button
                onClick={() => setReadingStep('speaking_bridge')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-sm flex items-center justify-center gap-2 hover:opacity-95 shadow-xl shadow-amber-500/20 active:scale-95 transition-all"
              >
                Speaking Mashqini Boshlash <ChevronRight className="w-4 h-4 stroke-[3px]" />
              </button>
            </motion.div>
          )}

          {/* Step: Speaking Practice Bridge */}
          {readingStep === 'speaking_bridge' && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#121424] p-5 rounded-3xl border border-amber-500/30 text-center relative overflow-hidden mb-4">
              <div className="w-14 h-14 bg-amber-500/10 rounded-2xl mx-auto flex items-center justify-center mb-3 text-amber-400 border border-amber-500/20">
                <Mic className="w-7 h-7 animate-pulse text-amber-400" />
              </div>
              <h3 className="text-lg font-extrabold mb-1">Speaking Aktivlashtirish</h3>
              <p className="text-slate-400 text-xs mb-4 max-w-xs mx-auto leading-relaxed">
                Siz o'rgangan so'zlar: <span className="text-amber-400 font-bold">{selectedWords.slice(0, 3).join(', ')}</span>.
                Ularni ishtirokida gap tuzing va botga (ovozda) gapiring!
              </p>
              <button
                onClick={async () => {
                  try {
                    await apiService.completeLesson(telegramId);
                    onLessonCompleted();
                  } catch (e) {
                    console.error("Error completing lesson:", e);
                  }
                  onXpEarned(30);
                  setReadingStep('completed');
                  try { WebApp.HapticFeedback.notificationOccurred('success'); } catch(e){}
                }}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
              >
                Ovozli Topshirdim (+30 XP)
              </button>
            </motion.div>
          )}

          {/* Step: Completed */}
          {readingStep === 'completed' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 rounded-3xl bg-gradient-to-tr from-emerald-950/60 to-emerald-900/40 border border-emerald-500/30 text-center mb-4 shadow-2xl">
              <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-xl font-black text-white mb-0.5">Ajoyib Natija!</h3>
              <p className="text-emerald-200 text-xs mb-4">Ushbu dars yakunlandi. +30 XP profilingizga qo'shildi.</p>
              <button 
                onClick={fetchNewReading} 
                className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-xs transition-all border border-white/10 active:scale-95"
              >
                Keyingi Matnni O'qish
              </button>
            </motion.div>
          )}
        </>
      )}

      {/* Custom Reading Modal */}
      <AnimatePresence>
        {showCustomModal && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ y: 300, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: 300, opacity: 0 }}
              className="bg-[#121424] w-full rounded-t-3xl border-t border-white/10 p-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowCustomModal(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white/5 rounded-full"
              >
                ✕
              </button>
              
              <h3 className="text-xl font-black mb-4">Shaxsiy matn qo'shish</h3>
              
              <textarea 
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                placeholder="Matnni shu yerga tashlang yoki yozing..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white mb-4 outline-none focus:border-indigo-500 min-h-[120px]"
              />

              <div className="flex gap-4 mb-6">
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  onChange={handleImageChange}
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-3 bg-indigo-500/10 text-indigo-400 font-bold rounded-xl border border-indigo-500/20 flex items-center justify-center gap-2"
                >
                  <Image className="w-5 h-5" /> Rasm yuklash
                </button>
              </div>

              {customImagePreview && (
                <div className="mb-6 relative rounded-xl overflow-hidden border border-white/10 h-32 w-full">
                  <img src={customImagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center font-bold text-white">
                    Rasm tanlandi
                  </div>
                </div>
              )}

              <button 
                onClick={handleCustomSubmit}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2"
              >
                O'qishni boshlash <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
