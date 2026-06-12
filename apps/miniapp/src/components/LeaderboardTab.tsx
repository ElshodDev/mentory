import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown } from 'lucide-react';
import { apiService } from '../services/api';
import { UserProfile } from '../App';

interface LeaderboardTabProps {}

export function LeaderboardTab({}: LeaderboardTabProps) {
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  useEffect(() => {
    const fetchLB = async () => {
      setLoadingLeaderboard(true);
      try {
        const data = await apiService.fetchLeaderboard();
        setLeaderboard(data);
      } catch (e) {
        console.error("Leaderboard yuklashda xatolik", e);
      } finally {
        setLoadingLeaderboard(false);
      }
    };
    fetchLB();
  }, []);

  return (
    <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2 pb-24">
      <h2 className="text-2xl font-black mb-1.5 flex items-center gap-2 tracking-tight">
        <Trophy className="text-yellow-400 w-6 h-6 stroke-[2.5px]" /> Reyting
      </h2>
      <p className="text-xs text-slate-400 mb-6 leading-relaxed">Top 10 ta eng faol o'quvchilar. Ko'proq o'qib XP yig'ing va ligalarda ko'tariling!</p>

      {loadingLeaderboard ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((user, index) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: index * 0.05 }}
              key={user.telegramId} 
              className={`flex items-center gap-4 p-4 rounded-3xl border transition-all ${
                index === 0 ? 'bg-yellow-500/10 border-yellow-500/30' : 
                index === 1 ? 'bg-slate-300/10 border-slate-300/30' : 
                index === 2 ? 'bg-amber-700/10 border-amber-700/30' : 
                'bg-white/5 border-white/5'
              }`}
            >
              <div className="flex-shrink-0 w-8 text-center font-black text-lg">
                {index === 0 ? <Crown className="w-6 h-6 text-yellow-500 mx-auto" /> : 
                 index === 1 ? <Medal className="w-6 h-6 text-slate-300 mx-auto" /> : 
                 index === 2 ? <Medal className="w-6 h-6 text-amber-600 mx-auto" /> : 
                 <span className="text-slate-500">{index + 1}</span>}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-bold truncate tracking-tight">{user.firstName}</p>
                  {user.league === 'Gold' && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-yellow-500/20 text-yellow-400 uppercase tracking-wider border border-yellow-500/20">Gold</span>}
                  {user.league === 'Silver' && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-300/20 text-slate-300 uppercase tracking-wider border border-slate-300/20">Silver</span>}
                  {user.league === 'Bronze' && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-700/20 text-amber-500 uppercase tracking-wider border border-amber-700/20">Bronze</span>}
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <p className="text-xs text-slate-400 font-medium flex items-center gap-1">⚡ {user.xp} XP</p>
                  <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">🔥 {user.streak} kun</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
