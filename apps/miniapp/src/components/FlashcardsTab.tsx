import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, RefreshCw, Volume2, Plus, X } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { apiService } from '../services/api';
import { SavedWord } from '../App'; // We need to export SavedWord from App.tsx or shared types

interface FlashcardsTabProps {
  telegramId: number;
  onXpEarned: (amount: number) => void;
}

export function FlashcardsTab({ telegramId, onXpEarned }: FlashcardsTabProps) {
  const [words, setWords] = useState<SavedWord[]>([]);
  const [loadingWords, setLoadingWords] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [newSentence, setNewSentence] = useState('');

  const fetchWords = async () => {
    setLoadingWords(true);
    const cached = localStorage.getItem(`mentory_words_${telegramId}`);
    if (cached) {
      setWords(JSON.parse(cached));
    }

    try {
      const data = await apiService.fetchWords(telegramId);
      const today = new Date().toISOString().split('T')[0];
      const sorted = data.sort((a: SavedWord, b: SavedWord) => {
        if (a.nextReviewDate <= today && b.nextReviewDate > today) return -1;
        if (a.nextReviewDate > today && b.nextReviewDate <= today) return 1;
        return a.nextReviewDate.localeCompare(b.nextReviewDate);
      });
      setWords(sorted);
      localStorage.setItem(`mentory_words_${telegramId}`, JSON.stringify(sorted));
      setCurrentCardIndex(0);
      setShowAnswer(false);
    } catch (e) {
      console.error("Error loading words:", e);
    } finally {
      setLoadingWords(false);
    }
  };

  useEffect(() => {
    fetchWords();
  }, [telegramId]);

  const speakWord = (word: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try { WebApp.HapticFeedback.impactOccurred('light'); } catch(e){}
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleReview = async (difficulty: 'easy' | 'hard') => {
    if (words.length === 0) return;
    try { WebApp.HapticFeedback.notificationOccurred(difficulty === 'easy' ? 'success' : 'warning'); } catch(e){}

    const currentWord = words[currentCardIndex];
    try {
      const res = await apiService.reviewWord(telegramId, currentWord.word, difficulty);
      if (res) {
        const xpEarned = difficulty === 'easy' ? 15 : 5;
        onXpEarned(xpEarned);
        
        if (currentCardIndex + 1 < words.length) {
          setCurrentCardIndex(currentCardIndex + 1);
          setShowAnswer(false);
        } else {
          fetchWords();
        }
      }
    } catch (e) {
      console.error("Error submitting review:", e);
    }
  };

  const handleManualAdd = async () => {
    if (!newWord.trim() || !newTranslation.trim()) {
      try { WebApp.showAlert("So'z va tarjimani kiriting!"); } catch(e){}
      return;
    }
    try {
      await apiService.saveWord(telegramId, newWord.trim(), newTranslation.trim(), newSentence.trim());
      try { WebApp.HapticFeedback.notificationOccurred('success'); } catch(e){}
      setIsAdding(false);
      setNewWord('');
      setNewTranslation('');
      setNewSentence('');
      fetchWords();
    } catch (e) {
      try { WebApp.showAlert("Xatolik yuz berdi"); } catch(e){}
    }
  };

  return (
    <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2 pb-24 px-2">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-black flex items-center gap-2 tracking-tight">
          <Bookmark className="text-indigo-400 w-6 h-6 stroke-[2.5px]" /> Lug'atim
        </h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="p-2 bg-indigo-500/20 text-indigo-400 rounded-full hover:bg-indigo-500/30 transition-all"
        >
          {isAdding ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="bg-[#121424] rounded-2xl p-4 border border-indigo-500/30 shadow-lg">
              <h3 className="text-white font-bold mb-3 text-sm">Yangi so'z qo'shish</h3>
              <input 
                type="text" 
                placeholder="Inglizcha so'z" 
                value={newWord} 
                onChange={e => setNewWord(e.target.value)} 
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white mb-2 text-sm outline-none focus:border-indigo-500/50" 
              />
              <input 
                type="text" 
                placeholder="Tarjimasi (o'zbekcha)" 
                value={newTranslation} 
                onChange={e => setNewTranslation(e.target.value)} 
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white mb-2 text-sm outline-none focus:border-indigo-500/50" 
              />
              <input 
                type="text" 
                placeholder="Misol gap (ixtiyoriy)" 
                value={newSentence} 
                onChange={e => setNewSentence(e.target.value)} 
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white mb-3 text-sm outline-none focus:border-indigo-500/50" 
              />
              <button 
                onClick={handleManualAdd} 
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3.5 rounded-xl text-sm transition-all"
              >
                Lug'atga saqlash
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {loadingWords && words.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white/5 rounded-3xl border border-white/5">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-xs text-slate-400 font-medium">So'zlar yuklanmoqda...</p>
        </div>
      ) : words.length === 0 ? (
        <div className="bg-[#121424] border border-white/5 rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-2">
            <Bookmark className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-white font-bold text-lg tracking-tight">Lug'atingiz bo'sh</h3>
          <p className="text-slate-400 text-xs leading-relaxed max-w-[200px] mx-auto">
            Hozircha saqlangan so'zlar yo'q. O'qish (Reading) bo'limida noma'lum so'zlarni tanlab, lug'atga qo'shishingiz mumkin.
          </p>
        </div>
      ) : (
        <>
          <p className="text-slate-400 text-xs mb-3">
            Haftalik takrorlash. Javobni bilish uchun kartani bosing.
          </p>
          
          <motion.div 
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, { offset }) => {
              const swipe = offset.x;
              if (swipe < -80) handleReview('hard');
              else if (swipe > 80) handleReview('easy');
            }}
            whileDrag={{ scale: 1.05 }}
            onClick={() => setShowAnswer(!showAnswer)}
            className="w-full min-h-[220px] bg-[#121424] hover:bg-[#15172b] cursor-pointer rounded-3xl border border-indigo-500/20 flex flex-col items-center justify-center p-6 relative overflow-hidden shadow-2xl transition-all active:scale-98 touch-none"
          >
            <div className="absolute top-4 right-4 text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-white/5 text-slate-400 border border-white/5">
              {currentCardIndex + 1} / {words.length}
            </div>

            <Bookmark className="w-8 h-8 text-indigo-500/80 mb-3" />
            
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-3xl font-black text-white tracking-wide">
                {words[currentCardIndex].word}
              </h3>
              <button 
                onClick={(e) => speakWord(words[currentCardIndex].word, e)}
                className="p-2 rounded-full bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all active:scale-95"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-indigo-400 font-semibold mb-4">
              Review interval: {words[currentCardIndex].interval} kun
            </p>

            <AnimatePresence mode="wait">
              {showAnswer ? (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="w-full text-center"
                >
                  <p className="text-xl text-amber-400 font-bold mb-3">🇺🇿 {words[currentCardIndex].translation}</p>
                  {words[currentCardIndex].sentence && (
                    <div className="text-xs text-slate-300 italic bg-black/40 px-3.5 py-2.5 rounded-xl border border-white/5 max-w-sm mx-auto leading-relaxed">
                      "{words[currentCardIndex].sentence}"
                    </div>
                  )}
                </motion.div>
              ) : (
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                  Tarjimani ko'rish uchun bosing
                </p>
              )}
            </AnimatePresence>
          </motion.div>

          <div className="flex gap-4 mt-5">
            <button 
              onClick={() => handleReview('hard')} 
              className="flex-1 py-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-black text-sm active:scale-95 transition-all"
            >
              Qiyin (+5 XP)
            </button>
            <button 
              onClick={() => handleReview('easy')} 
              className="flex-1 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              Oson (+15 XP)
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
