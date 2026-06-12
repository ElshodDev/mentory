import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserProfile } from '../App';
import { Flame, Trophy, Users, BookOpen, Crown, Zap, Shield, Medal, Loader2, ChevronDown } from 'lucide-react';
import { apiService } from '../services/api';
import WebApp from '@twa-dev/sdk';

interface ProfileTabProps {
  profile: UserProfile | null;
  onProfileUpdated: (p: UserProfile) => void;
}

export function ProfileTab({ profile, onProfileUpdated }: ProfileTabProps) {
  if (!profile) return null;
  
  const [updatingLevel, setUpdatingLevel] = useState(false);

  const getLevelInfo = (xp: number) => {
    if (xp < 100)  return { level: 1, title: 'Beginner',     emoji: '🌱', cefr: 'A1', nextXp: 100 };
    if (xp < 300)  return { level: 2, title: 'Elementary',   emoji: '📗', cefr: 'A2', nextXp: 300 };
    if (xp < 600)  return { level: 3, title: 'Pre-Intermediate', emoji: '📘', cefr: 'B1', nextXp: 600 };
    if (xp < 1000) return { level: 4, title: 'Intermediate', emoji: '📙', cefr: 'B2', nextXp: 1000 };
    if (xp < 1500) return { level: 5, title: 'Upper-Intermediate', emoji: '🏆', cefr: 'C1', nextXp: 1500 };
    return         { level: 6, title: 'Advanced',      emoji: '💎', cefr: 'C2', nextXp: xp }; // Max level
  };

  const levelInfo = getLevelInfo(profile.xp);
  
  // Calculate Progress
  let prevXp = 0;
  if (levelInfo.level === 2) prevXp = 100;
  if (levelInfo.level === 3) prevXp = 300;
  if (levelInfo.level === 4) prevXp = 600;
  if (levelInfo.level === 5) prevXp = 1000;
  if (levelInfo.level === 6) prevXp = 1500;

  let progressPercent = 100;
  if (levelInfo.level < 6) {
    const requiredForThisLevel = levelInfo.nextXp - prevXp;
    const currentInThisLevel = profile.xp - prevXp;
    progressPercent = Math.min(100, Math.max(0, (currentInThisLevel / requiredForThisLevel) * 100));
  }

  const badges = [
    { id: 'first_lesson', name: "O'rganuvchi", desc: "1 ta dars tugatildi", icon: BookOpen, color: "text-blue-400", bg: "bg-blue-500/20", unlocked: profile.totalLessons >= 1 },
    { id: 'streak_7', name: "Olovli", desc: "7 kunlik davomiylik", icon: Flame, color: "text-orange-400", bg: "bg-orange-500/20", unlocked: profile.streak >= 7 },
    { id: 'rich', name: "Boyvachcha", desc: "1000 XP yig'ildi", icon: Zap, color: "text-yellow-400", bg: "bg-yellow-500/20", unlocked: profile.xp >= 1000 },
    { id: 'social', name: "Do'stona", desc: "3 ta do'st taklif qildi", icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/20", unlocked: (profile.referrals || 0) >= 3 },
    { id: 'veteran', name: "Veteran", desc: "50 ta dars tugatildi", icon: Shield, color: "text-purple-400", bg: "bg-purple-500/20", unlocked: profile.totalLessons >= 50 },
    { id: 'champion', name: "Chempion", desc: "Gold Ligaga chiqdi", icon: Crown, color: "text-amber-400", bg: "bg-amber-500/20", unlocked: profile.league === 'Gold' },
  ];

  const unlockedCount = badges.filter(b => b.unlocked).length;

  return (
    <div className="space-y-6 pb-24">
      {/* Header Profile Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glassmorphism rounded-3xl p-6 relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl"></div>
        
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 p-1 shrink-0">
            <div className="w-full h-full bg-[#131a2a] rounded-xl flex items-center justify-center text-3xl">
              {levelInfo.emoji}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{profile.firstName}</h2>
            <p className="text-slate-400 text-sm">@{profile.username || 'user'}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-medium text-amber-400">{profile.league} League</span>
            </div>
          </div>
        </div>

        {/* Level Progress */}
        <div className="mt-6 relative z-10">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-sm text-slate-400 font-medium">Daraja {levelInfo.level}</p>
              <p className="text-lg font-bold text-white">{levelInfo.title} <span className="text-indigo-400 text-sm">({levelInfo.cefr})</span></p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-white">{profile.xp} <span className="text-slate-500 font-normal">/ {levelInfo.nextXp} XP</span></p>
            </div>
          </div>
          
          <div className="h-3 w-full bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full relative"
            >
              <div className="absolute inset-0 bg-white/20 w-full h-full animate-pulse"></div>
            </motion.div>
          </div>
          {levelInfo.level < 6 && (
            <p className="text-xs text-slate-500 mt-2 text-center">
              Keyingi darajaga o'tish uchun yana <span className="text-indigo-400 font-bold">{levelInfo.nextXp - profile.xp} XP</span> kerak
            </p>
          )}
        </div>
      </motion.div>

      {/* English Level Selector */}
      <div className="glassmorphism p-5 rounded-3xl relative overflow-hidden">
        <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center justify-between">
          <span>Sizning Ingliz Tili Darajangiz</span>
          {updatingLevel && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
        </h3>
        <div className="relative">
          <select 
            value={profile.englishLevel || 'Intermediate'}
            disabled={updatingLevel}
            onChange={async (e) => {
              setUpdatingLevel(true);
              try {
                const updated = await apiService.updateUserLevel(profile.telegramId, e.target.value);
                onProfileUpdated(updated);
                try { WebApp.HapticFeedback.notificationOccurred('success'); } catch(e){}
              } catch(err) {
                WebApp.showAlert("Darajani saqlashda xatolik yuz berdi");
              } finally {
                setUpdatingLevel(false);
              }
            }}
            className="w-full bg-[#121424] border border-white/10 rounded-2xl p-4 text-white font-bold appearance-none outline-none focus:border-indigo-500/50 transition-colors"
          >
            <option value="Beginner">Beginner (A1)</option>
            <option value="Pre-Intermediate">Pre-Intermediate (A2-B1)</option>
            <option value="Intermediate">Intermediate (B1-B2)</option>
            <option value="Upper-Intermediate">Upper-Intermediate (B2)</option>
            <option value="Advanced">Advanced (C1)</option>
            <option value="IELTS">IELTS 6.0+ (Academic)</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        </div>
        <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
          Ushbu daraja orqali AI sizga aynan mos keladigan o'qish matnlari va testlarni tayyorlaydi.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className="glassmorphism p-4 rounded-2xl flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium">Davomiylik</p>
            <p className="text-xl font-bold text-white">{profile.streak} kun</p>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
          className="glassmorphism p-4 rounded-2xl flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium">Darslar</p>
            <p className="text-xl font-bold text-white">{profile.totalLessons}</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
          className="glassmorphism p-4 rounded-2xl flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium">Jami XP</p>
            <p className="text-xl font-bold text-white">{profile.xp}</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
          className="glassmorphism p-4 rounded-2xl flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium">Do'stlar</p>
            <p className="text-xl font-bold text-white">{profile.referrals || 0}</p>
          </div>
        </motion.div>
      </div>

      {/* Gamification Badges */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="glassmorphism rounded-3xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Medal className="w-5 h-5 text-indigo-400" />
            Yutuqlar (Badges)
          </h3>
          <span className="text-sm font-medium text-slate-400 bg-white/5 px-3 py-1 rounded-full">
            {unlockedCount} / {badges.length}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {badges.map((badge) => {
            const Icon = badge.icon;
            return (
              <motion.div 
                key={badge.id}
                whileHover={badge.unlocked ? { scale: 1.05 } : {}}
                whileTap={badge.unlocked ? { scale: 0.95 } : {}}
                className={`relative overflow-hidden rounded-2xl p-4 border transition-all duration-300 ${
                  badge.unlocked 
                    ? 'bg-slate-800/50 border-white/10' 
                    : 'bg-slate-900/50 border-white/5 opacity-50 grayscale'
                }`}
              >
                {/* Glow effect for unlocked */}
                {badge.unlocked && (
                  <div className={`absolute top-0 right-0 w-16 h-16 ${badge.bg} rounded-full blur-xl -mr-8 -mt-8`}></div>
                )}
                
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${badge.unlocked ? badge.bg : 'bg-slate-800'}`}>
                  <Icon className={`w-5 h-5 ${badge.unlocked ? badge.color : 'text-slate-500'}`} />
                </div>
                
                <p className="font-bold text-white text-sm mb-1">{badge.name}</p>
                <p className="text-xs text-slate-400 leading-tight">{badge.desc}</p>
                
                {!badge.unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                    <div className="bg-slate-800/90 text-slate-300 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                      Qulflangan
                    </div>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </div>
  );
}
