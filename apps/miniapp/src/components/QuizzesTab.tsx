import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, CheckCircle, XCircle, RefreshCw, Trophy } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { apiService } from '../services/api';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizzesTabProps {
  currentLevel: string;
  onXpEarned: (amount: number) => void;
  telegramId: number;
}

export function QuizzesTab({ currentLevel, onXpEarned, telegramId }: QuizzesTabProps) {
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const fetchNewQuizzes = async () => {
    setLoading(true);
    setQuizCompleted(false);
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
    setShowExplanation(false);
    try {
      const data = await apiService.fetchQuizzes(currentLevel);
      setQuizzes(data);
    } catch (e) {
      console.error("Quizzes yuklashda xato:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewQuizzes();
  }, [currentLevel]);

  const handleOptionSelect = (index: number) => {
    if (selectedOption !== null) return; // Prevent double clicking
    setSelectedOption(index);
    const isCorrect = index === quizzes[currentIndex].correctAnswer;
    
    if (isCorrect) {
      try { WebApp.HapticFeedback.notificationOccurred('success'); } catch(e){}
      setScore(prev => prev + 1);
    } else {
      try { WebApp.HapticFeedback.notificationOccurred('error'); } catch(e){}
    }
    
    setShowExplanation(true);
  };

  const handleNext = async () => {
    if (currentIndex < quizzes.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setQuizCompleted(true);
      const finalScore = score + (selectedOption === quizzes[currentIndex].correctAnswer ? 1 : 0);
      const xpReward = finalScore * 10; // 10 XP per correct answer
      if (xpReward > 0) {
        onXpEarned(xpReward);
        try {
          await apiService.completeLesson(telegramId);
        } catch(e){}
      }
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">AI testlarni shakllantirmoqda...</p>
      </div>
    );
  }

  if (quizCompleted) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-10 flex flex-col items-center justify-center text-center">
        <Trophy className="w-20 h-20 text-yellow-400 mb-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
        <h2 className="text-2xl font-black mb-2">Test Yakunlandi!</h2>
        <p className="text-slate-300 mb-6">Natijangiz: <span className="font-black text-white">{score} / {quizzes.length}</span></p>
        
        <div className="bg-indigo-500/20 border border-indigo-500/30 p-4 rounded-2xl mb-8 w-full max-w-xs">
          <p className="text-indigo-300 text-sm font-bold uppercase tracking-wider mb-1">Bonus XP</p>
          <p className="text-3xl font-black text-white">+{score * 10} XP</p>
        </div>

        <button 
          onClick={fetchNewQuizzes}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-2xl active:scale-95 transition-all shadow-lg shadow-indigo-600/30"
        >
          Yangi Test Boshlash
        </button>
      </motion.div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-400 mb-4">Testlarni yuklab bo'lmadi.</p>
        <button onClick={fetchNewQuizzes} className="px-6 py-2 bg-white/10 rounded-xl text-sm font-bold">Qayta urinish</button>
      </div>
    );
  }

  const currentQuiz = quizzes[currentIndex];

  return (
    <motion.div key="quiz" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="py-2 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black flex items-center gap-2 tracking-tight">
          <Target className="text-indigo-400 w-6 h-6 stroke-[2.5px]" /> Quizzes
        </h2>
        <div className="bg-white/10 px-3 py-1 rounded-xl font-black text-xs text-indigo-300 border border-white/5">
          {currentIndex + 1} / {quizzes.length}
        </div>
      </div>

      <div className="bg-[#121424] border border-white/5 p-6 rounded-3xl shadow-xl relative overflow-hidden mb-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <h3 className="text-lg font-bold text-white leading-relaxed mb-6 relative z-10">
          {currentQuiz.question}
        </h3>

        <div className="space-y-3 relative z-10">
          {currentQuiz.options.map((option, idx) => {
            let btnClass = "w-full p-4 rounded-2xl text-left text-sm font-medium transition-all border flex items-center justify-between ";
            let icon = null;

            if (selectedOption === null) {
              btnClass += "bg-white/5 hover:bg-white/10 border-white/10 text-slate-200 active:scale-95";
            } else {
              if (idx === currentQuiz.correctAnswer) {
                btnClass += "bg-emerald-500/20 border-emerald-500/50 text-emerald-100";
                icon = <CheckCircle className="w-5 h-5 text-emerald-400" />;
              } else if (idx === selectedOption) {
                btnClass += "bg-rose-500/20 border-rose-500/50 text-rose-100";
                icon = <XCircle className="w-5 h-5 text-rose-400" />;
              } else {
                btnClass += "bg-white/5 border-white/5 text-slate-500 opacity-50";
              }
            }

            return (
              <button 
                key={idx} 
                onClick={() => handleOptionSelect(idx)}
                disabled={selectedOption !== null}
                className={btnClass}
              >
                <span>{option}</span>
                {icon}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {showExplanation && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-3xl"
          >
            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-2">Tushuntirish:</h4>
            <p className="text-sm text-indigo-100 leading-relaxed">{currentQuiz.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedOption !== null && (
        <motion.button 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleNext}
          className="w-full py-4 bg-white text-indigo-600 font-black text-sm rounded-2xl shadow-xl active:scale-95 transition-all"
        >
          {currentIndex < quizzes.length - 1 ? 'Keyingi Savol' : 'Natijani Ko\'rish'}
        </motion.button>
      )}
    </motion.div>
  );
}
