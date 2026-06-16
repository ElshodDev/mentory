
import { motion } from 'framer-motion';
import { Target, CheckCircle2, Gift } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { UserProfile } from '../App';

interface DailyQuestsTabProps {
  profile: UserProfile | null;
  onProfileUpdated: (p: UserProfile) => void;
}

export function DailyQuestsTab({ profile }: DailyQuestsTabProps) {

  const allCompleted = profile?.dailyQuests?.every(q => q.progress >= q.target);

  const claimChest = () => {
    try { WebApp.HapticFeedback.notificationOccurred('success'); } catch(e){}
    WebApp.showAlert("Sandiq ochildi! Siz +200 XP va yutuq oldingiz!");
    // logic to add xp and update profile...
  };

  return (
    <div className="space-y-6 pb-24">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glassmorphism rounded-3xl p-6 relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-500/20 rounded-full blur-3xl"></div>
        <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-2">
          <Target className="w-6 h-6 text-indigo-400" />
          Kunlik Vazifalar
        </h2>
        <p className="text-slate-400 text-sm">Vazifalarni bajarib XP va yutuqli sandiqlarni qo'lga kiriting.</p>
        
        <div className="mt-6 space-y-4">
          {profile?.dailyQuests?.map((q) => {
            const isCompleted = q.progress >= q.target;
            const progressPercent = Math.min(100, Math.max(0, (q.progress / q.target) * 100));
            return (
              <div key={q.id} className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-slate-800">
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                  ) : (
                    <Target className="w-5 h-5 text-indigo-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-sm mb-1">{q.title}</h3>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-400' : 'bg-indigo-400'}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">{q.progress} / {q.target}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center bg-[#121424] rounded-2xl p-6 border border-white/5">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-yellow-500/20 to-amber-500/20 flex items-center justify-center mb-4 relative">
            <Gift className={`w-10 h-10 ${allCompleted ? 'text-yellow-400 animate-bounce' : 'text-slate-500'}`} />
            {allCompleted && <div className="absolute inset-0 rounded-full border-2 border-yellow-400 animate-ping"></div>}
          </div>
          <h3 className="text-white font-bold mb-2">Kunlik Sandiq</h3>
          <p className="text-slate-400 text-xs mb-4">Barcha vazifalarni tugating va ajoyib sovg'alar oling!</p>
          <button 
            disabled={!allCompleted}
            onClick={claimChest}
            className={`w-full py-3 rounded-xl font-bold transition-all active:scale-95 ${
              allCompleted 
                ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-lg shadow-yellow-500/20' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Sandiqni Ochish
          </button>
        </div>
      </motion.div>
    </div>
  );
}
