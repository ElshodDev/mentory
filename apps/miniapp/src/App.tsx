import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Flame, BookOpen, Layers, Mic, Trophy, Sparkles, Users, Target, Swords, Crown, Zap } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { apiService } from './services/api';

import { ReadingTab } from './components/ReadingTab';
import { FlashcardsTab } from './components/FlashcardsTab';
import { WritingTutorTab } from './components/WritingTutorTab';
import { LeaderboardTab } from './components/LeaderboardTab';
import { ReferralsTab } from './components/ReferralsTab';
import { QuizzesTab } from './components/QuizzesTab';
import { BattleTab } from './components/BattleTab';
import { PremiumTab } from './components/PremiumTab';
import { ShadowingTab } from './components/ShadowingTab';
import { MockTestTab } from './components/MockTestTab';
import { ListeningTab } from './components/ListeningTab';
import { ProfileTab } from './components/ProfileTab';

// Shared Types
export interface UserProfile {
  telegramId: number;
  firstName: string;
  username?: string;
  xp: number;
  streak: number;
  league: string;
  totalLessons: number;
  referrals?: number;
}

export interface SavedWord {
  id: string;
  word: string;
  translation: string;
  sentence?: string;
  nextReviewDate: string;
  interval: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'reading' | 'cards' | 'listening' | 'writing' | 'voice' | 'leaderboard' | 'referrals' | 'quizzes' | 'battle' | 'premium' | 'mocktest' | 'profile'>('reading');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [startVideoId, setStartVideoId] = useState<string | undefined>(undefined);

  // Get Telegram WebApp user or mock
  const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
  const telegramId = tgUser?.id || 12345;
  const firstName = tgUser?.first_name || 'Mehmon';
  const username = tgUser?.username || 'mehmon_user';

  const fetchProfile = async () => {
    try {
      const data = await apiService.fetchProfile(telegramId, firstName, username);
      setProfile(data);
    } catch (e) {
      console.error("Error fetching profile:", e);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();
      
      // Check deep link
      const startParam = WebApp.initDataUnsafe?.start_param;
      if (startParam && startParam.startsWith('video_')) {
        setStartVideoId(startParam.replace('video_', ''));
        setActiveTab('listening');
      }

      WebApp.setHeaderColor('#090a12');
      WebApp.setBackgroundColor('#090a12');
    } catch (e) {}
  }, []);

  const addXpPoints = async (amount: number) => {
    try {
      const updatedProfile = await apiService.addXP(telegramId, amount);
      setProfile(updatedProfile);
    } catch (e) {
      console.error("Error adding XP:", e);
    }
  };

  const getLevelInfo = (xp: number) => {
    if (xp < 100)  return { level: 1, title: 'Beginner',     emoji: '🌱', cefr: 'A1' };
    if (xp < 300)  return { level: 2, title: 'Elementary',   emoji: '📗', cefr: 'A2' };
    if (xp < 600)  return { level: 3, title: 'Pre-Intermediate', emoji: '📘', cefr: 'B1' };
    if (xp < 1000) return { level: 4, title: 'Intermediate', emoji: '📙', cefr: 'B2' };
    if (xp < 1500) return { level: 5, title: 'Upper-Intermediate', emoji: '🏆', cefr: 'C1' };
    return         { level: 6, title: 'Advanced',      emoji: '💎', cefr: 'C2' };
  };

  const currentLevel = profile ? getLevelInfo(profile.xp) : { level: 1, title: 'Beginner', emoji: '🌱', cefr: 'A1' };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-[#090a12] text-white font-sans flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
        <h1 className="text-2xl font-black tracking-tight mb-2">Mentory AI</h1>
        <p className="text-slate-400 text-sm animate-pulse">Profil yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a12] text-white font-sans overflow-x-hidden selection:bg-indigo-500/30">
      {/* Background Gradients */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none z-0"></div>

      {/* HEADER SECTION */}
      <div className="p-5 pb-2 sticky top-0 z-40 bg-[#090a12]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-400" /> Mentory
            </h1>
          </div>
          
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('premium')} className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-xl shadow-lg shadow-yellow-500/5 active:scale-95 transition-transform">
              <Crown className="w-4 h-4 text-yellow-500" />
            </button>
            <button onClick={() => setActiveTab('battle')} className="flex items-center gap-1.5 bg-gradient-to-r from-rose-500/10 to-red-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl shadow-lg shadow-rose-500/5 active:scale-95 transition-transform">
              <Swords className="w-4 h-4 text-rose-500" />
            </button>
            <button onClick={() => setActiveTab('referrals')} className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-xl shadow-lg shadow-cyan-500/5 active:scale-95 transition-transform">
              <Users className="w-4 h-4 text-cyan-400" />
            </button>
            
            {/* Streak UI */}
            <div className="flex items-center gap-1.5 bg-[#1a1c2e] px-3 py-1.5 rounded-full border border-orange-500/30">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="font-bold text-orange-400">{profile?.streak || 0}</span>
            </div>
            
            {/* XP UI */}
            <div className="flex items-center gap-1.5 bg-[#1a1c2e] px-3 py-1.5 rounded-full border border-indigo-500/30">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-indigo-300">{profile?.xp || 0} XP</span>
            </div>
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('profile')}
          className="flex items-center gap-3 bg-[#121424] p-3 rounded-2xl border border-white/5 shadow-xl cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/20 border border-white/10">
            {currentLevel.emoji}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-extrabold text-sm text-white tracking-wide">{currentLevel.title}</h3>
              <span className="text-[10px] bg-white/10 text-slate-300 px-2 py-0.5 rounded-md font-bold uppercase">{currentLevel.cefr}</span>
            </div>
            
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full relative" 
                style={{ width: `${Math.min(100, ((profile?.xp || 0) % 500) / 500 * 100)}%` }}
              >
                <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/20 blur-[2px]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="p-5 relative z-10 min-h-[70vh]">
        <AnimatePresence mode="wait">
          {activeTab === 'profile' && <ProfileTab profile={profile} />}
          {activeTab === 'reading' && (
            <ReadingTab 
              telegramId={telegramId} 
              currentLevel={currentLevel} 
              onXpEarned={addXpPoints}
              onLessonCompleted={() => fetchProfile()}
            />
          )}
          {activeTab === 'cards' && (
            <FlashcardsTab 
              telegramId={telegramId} 
              onXpEarned={addXpPoints} 
            />
          )}
          {activeTab === 'writing' && <WritingTutorTab />}
          {activeTab === 'listening' && (
            <ListeningTab 
              telegramId={telegramId}
              initialVideoId={startVideoId}
            />
          )}
          {activeTab === 'voice' && (
            <ShadowingTab 
              telegramId={telegramId}
              currentLevel={currentLevel.cefr}
              onProfileUpdated={(p) => setProfile(p)}
            />
          )}
          {activeTab === 'quizzes' && (
            <QuizzesTab 
              telegramId={telegramId}
              currentLevel={currentLevel.cefr}
              onXpEarned={addXpPoints}
            />
          )}
          {activeTab === 'mocktest' && (
            <MockTestTab 
              telegramId={telegramId}
              onProfileUpdated={(p) => setProfile(p)}
            />
          )}
          {activeTab === 'battle' && (
            <BattleTab 
              telegramId={telegramId}
              currentLevel={currentLevel.cefr}
              onProfileUpdated={(p) => setProfile(p)}
            />
          )}
          {activeTab === 'leaderboard' && <LeaderboardTab />}
          {activeTab === 'referrals' && <ReferralsTab telegramId={telegramId} referralsCount={profile?.referrals || 0} />}
          {activeTab === 'premium' && <PremiumTab />}
        </AnimatePresence>
      </div>

      {/* BOTTOM NAVIGATION */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#090a12]/90 backdrop-blur-xl border-t border-white/5 p-4 pb-8 z-50">
        <div className="flex justify-around items-center max-w-md mx-auto relative">
          <button onClick={() => { try { WebApp.HapticFeedback.selectionChanged(); } catch(e){} setActiveTab('reading'); }} className={`flex flex-col items-center gap-1.5 p-2 transition-all ${activeTab === 'reading' ? 'text-indigo-400 scale-110' : 'text-slate-500 hover:text-slate-400'}`}>
            <BookOpen className={`${activeTab === 'reading' ? 'w-6 h-6 stroke-[2.5px]' : 'w-6 h-6'}`} />
            <span className="text-[9px] font-bold uppercase tracking-wider">O'qish</span>
            {activeTab === 'reading' && <div className="absolute -bottom-4 w-1 h-1 bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>}
          </button>
          
          <button onClick={() => { try { WebApp.HapticFeedback.selectionChanged(); } catch(e){} setActiveTab('cards'); }} className={`flex flex-col items-center gap-1.5 p-2 transition-all ${activeTab === 'cards' ? 'text-indigo-400 scale-110' : 'text-slate-500 hover:text-slate-400'}`}>
            <Layers className={`${activeTab === 'cards' ? 'w-6 h-6 stroke-[2.5px]' : 'w-6 h-6'}`} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Lug'at</span>
            {activeTab === 'cards' && <div className="absolute -bottom-4 w-1 h-1 bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>}
          </button>

          <button onClick={() => { try { WebApp.HapticFeedback.selectionChanged(); } catch(e){} setActiveTab('listening'); }} className={`flex flex-col items-center gap-1.5 p-2 transition-all ${activeTab === 'listening' ? 'text-rose-400 scale-110' : 'text-slate-500 hover:text-slate-400'}`}>
            <div className="relative">
              <Mic className={`${activeTab === 'listening' ? 'w-6 h-6 stroke-[2.5px]' : 'w-6 h-6'}`} />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping"></div>
            </div>
            <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider">YouTube</span>
            {activeTab === 'listening' && <div className="absolute -bottom-4 w-1 h-1 bg-rose-400 rounded-full shadow-[0_0_8px_rgba(251,113,133,0.8)]"></div>}
          </button>

          <button onClick={() => { try { WebApp.HapticFeedback.selectionChanged(); } catch(e){} setActiveTab('quizzes'); }} className={`flex flex-col items-center gap-1.5 p-2 transition-all ${activeTab === 'quizzes' ? 'text-indigo-400 scale-110' : 'text-slate-500 hover:text-slate-400'}`}>
            <Target className={`${activeTab === 'quizzes' ? 'w-6 h-6 stroke-[2.5px]' : 'w-6 h-6'}`} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Quizzes</span>
            {activeTab === 'quizzes' && <div className="absolute -bottom-4 w-1 h-1 bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>}
          </button>

          <button onClick={() => { try { WebApp.HapticFeedback.selectionChanged(); } catch(e){} setActiveTab('mocktest'); }} className={`flex flex-col items-center gap-1.5 p-2 transition-all ${activeTab === 'mocktest' ? 'text-rose-400 scale-110' : 'text-slate-500 hover:text-slate-400'}`}>
            <div className="relative">
              <Mic className={`${activeTab === 'mocktest' ? 'w-6 h-6 stroke-[2.5px]' : 'w-6 h-6'}`} />
            </div>
            <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider">IELTS</span>
            {activeTab === 'mocktest' && <div className="absolute -bottom-4 w-1 h-1 bg-rose-400 rounded-full shadow-[0_0_8px_rgba(251,113,133,0.8)]"></div>}
          </button>

          <button onClick={() => { try { WebApp.HapticFeedback.selectionChanged(); } catch(e){} setActiveTab('leaderboard'); }} className={`flex flex-col items-center gap-1.5 p-2 transition-all ${activeTab === 'leaderboard' ? 'text-yellow-400 scale-110' : 'text-slate-500 hover:text-slate-400'}`}>
            <Trophy className={`${activeTab === 'leaderboard' ? 'w-6 h-6 stroke-[2.5px]' : 'w-6 h-6'}`} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Reyting</span>
            {activeTab === 'leaderboard' && <div className="absolute -bottom-4 w-1 h-1 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.8)]"></div>}
          </button>
        </div>
      </div>
    </div>
  );
}
