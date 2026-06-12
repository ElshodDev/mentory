import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Swords, User, ShieldAlert, Trophy } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { apiService } from '../services/api';

interface BattleTabProps {
  telegramId: number;
  currentLevel: string;
  onProfileUpdated: (profile: any) => void;
}

export function BattleTab({ telegramId, currentLevel, onProfileUpdated }: BattleTabProps) {
  const [matchState, setMatchState] = useState<'finding' | 'ready' | 'playing' | 'result'>('finding');
  const [opponent, setOpponent] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [opponentScore, setOpponentScore] = useState(0);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const [battleResult, setBattleResult] = useState<'win' | 'loss' | 'draw' | null>(null);

  useEffect(() => {
    findMatch();
  }, []);

  const findMatch = async () => {
    setMatchState('finding');
    try {
      const data = await apiService.matchmakeBattle(telegramId, currentLevel);
      setOpponent(data.opponent);
      setQuestions(data.questions);
      setOpponentScore(data.opponentScore);
      setTimeout(() => setMatchState('ready'), 1500); // Fake delay for drama
    } catch (e) {
      console.error(e);
    }
  };

  const startBattle = () => {
    setMatchState('playing');
    setCurrentIndex(0);
    setMyScore(0);
    setSelectedOption(null);
  };

  const handleOptionSelect = (index: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(index);
    
    if (index === questions[currentIndex].correctAnswer) {
      try { WebApp.HapticFeedback.notificationOccurred('success'); } catch(e){}
      setMyScore(prev => prev + 1);
    } else {
      try { WebApp.HapticFeedback.notificationOccurred('error'); } catch(e){}
    }

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
      } else {
        finishBattle(myScore + (index === questions[currentIndex].correctAnswer ? 1 : 0));
      }
    }, 1000);
  };

  const finishBattle = async (finalScore: number) => {
    setMatchState('result');
    if (finalScore > opponentScore) setBattleResult('win');
    else if (finalScore < opponentScore) setBattleResult('loss');
    else setBattleResult('draw');

    try {
      const res = await apiService.completeBattle(telegramId, opponent.telegramId, finalScore, opponentScore);
      onProfileUpdated(res.profile);
    } catch(e) {}
  };

  if (matchState === 'finding') {
    return (
      <div className="py-20 flex flex-col items-center justify-center h-[60vh]">
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 border-4 border-rose-500/20 rounded-full animate-ping"></div>
          <div className="absolute inset-2 border-4 border-rose-500/40 rounded-full animate-spin"></div>
          <Swords className="absolute inset-0 m-auto w-10 h-10 text-rose-500" />
        </div>
        <h2 className="text-xl font-black text-white animate-pulse">Raqib qidirilmoqda...</h2>
      </div>
    );
  }

  if (matchState === 'ready' && opponent) {
    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-10 flex flex-col items-center h-[70vh] justify-center">
        <h2 className="text-3xl font-black text-rose-500 mb-8 tracking-widest uppercase">Battle!</h2>
        
        <div className="flex items-center justify-between w-full px-6 gap-4">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full border border-blue-500/50 flex items-center justify-center mb-2">
              <User className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="font-bold text-white">Siz</h3>
          </div>

          <div className="text-2xl font-black text-slate-500">VS</div>

          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-rose-500/20 rounded-full border border-rose-500/50 flex items-center justify-center mb-2 relative overflow-hidden">
              <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${opponent.telegramId}`} alt="bot" className="w-14 h-14" />
            </div>
            <h3 className="font-bold text-white">{opponent.firstName}</h3>
            <span className="text-[10px] text-rose-400 font-black uppercase">{opponent.league}</span>
          </div>
        </div>

        <button 
          onClick={startBattle}
          className="mt-12 w-[80%] py-4 bg-rose-600 hover:bg-rose-500 text-white font-black text-lg rounded-2xl active:scale-95 transition-all shadow-[0_0_20px_rgba(225,29,72,0.4)]"
        >
          Jangni Boshlash
        </button>
      </motion.div>
    );
  }

  if (matchState === 'playing') {
    const q = questions[currentIndex];
    return (
      <div className="py-4">
        <div className="flex justify-between items-center mb-6 px-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <span className="text-blue-400 font-bold text-xs">{myScore}</span>
            </div>
            <span className="text-xs font-bold text-slate-400">Siz</span>
          </div>
          <div className="text-rose-500 font-black tracking-widest">
            {currentIndex + 1} / {questions.length}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">{opponent.firstName}</span>
            <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
              <span className="text-rose-400 font-bold text-xs">?</span>
            </div>
          </div>
        </div>

        <div className="bg-[#121424] border border-white/5 p-6 rounded-3xl shadow-xl relative overflow-hidden mb-6">
          <h3 className="text-lg font-bold text-white leading-relaxed mb-6">
            {q.question}
          </h3>

          <div className="space-y-3">
            {q.options.map((opt: string, idx: number) => {
              let btnClass = "w-full p-4 rounded-2xl text-left text-sm font-medium transition-all border flex items-center justify-between ";
              if (selectedOption === null) {
                btnClass += "bg-white/5 hover:bg-white/10 border-white/10 text-slate-200 active:scale-95";
              } else {
                if (idx === q.correctAnswer) {
                  btnClass += "bg-emerald-500/20 border-emerald-500/50 text-emerald-100";
                } else if (idx === selectedOption) {
                  btnClass += "bg-rose-500/20 border-rose-500/50 text-rose-100";
                } else {
                  btnClass += "bg-white/5 border-white/5 opacity-50";
                }
              }

              return (
                <button key={idx} disabled={selectedOption !== null} onClick={() => handleOptionSelect(idx)} className={btnClass}>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (matchState === 'result') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-10 flex flex-col items-center justify-center h-[70vh] text-center">
        {battleResult === 'win' && <Trophy className="w-24 h-24 text-yellow-400 mb-6 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]" />}
        {battleResult === 'loss' && <ShieldAlert className="w-24 h-24 text-rose-500 mb-6 drop-shadow-[0_0_20px_rgba(225,29,72,0.6)]" />}
        {battleResult === 'draw' && <Swords className="w-24 h-24 text-slate-400 mb-6" />}
        
        <h2 className="text-3xl font-black mb-2 uppercase tracking-widest">
          {battleResult === 'win' ? 'G\'alaba!' : battleResult === 'loss' ? 'Mag\'lubiyat' : 'Durang'}
        </h2>
        
        <div className="flex gap-8 my-8 items-center justify-center w-full">
          <div className="text-center">
            <p className="text-3xl font-black text-blue-400">{myScore}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Siz</p>
          </div>
          <div className="text-xl font-black text-slate-600">-</div>
          <div className="text-center">
            <p className="text-3xl font-black text-rose-400">{opponentScore}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{opponent.firstName}</p>
          </div>
        </div>

        <div className={`px-6 py-3 rounded-2xl border ${battleResult === 'win' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : battleResult === 'loss' ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' : 'bg-slate-500/20 border-slate-500/30 text-slate-400'}`}>
          <span className="font-black text-lg">
            {battleResult === 'win' ? '+100 XP' : battleResult === 'loss' ? '-20 XP' : '0 XP'}
          </span>
        </div>

        <button 
          onClick={findMatch}
          className="mt-12 w-[80%] py-4 bg-white hover:bg-slate-100 text-slate-900 font-black text-sm rounded-2xl active:scale-95 transition-all"
        >
          Yana o'ynash
        </button>
      </motion.div>
    );
  }

  return null;
}
