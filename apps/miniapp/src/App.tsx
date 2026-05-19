import { useState, useEffect } from 'react';
import { BookOpen, Sparkles, Trophy, Mic, Bookmark, Flame, CheckCircle2, ChevronRight, RefreshCw, Edit, MessageSquare, Star, Square, Volume2, AlertCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import WebApp from '@twa-dev/sdk';

interface UserProfile {
  telegramId: number;
  firstName: string;
  username?: string;
  xp: number;
  streak: number;
  lastActiveDate: string;
  totalLessons: number;
  isSubscribed: boolean;
  joinedAt: string;
}

interface SavedWord {
  id: string;
  userId: number;
  word: string;
  translation: string;
  sentence: string;
  interval: number;
  repetitions: number;
  easeFactor: number;
  nextReviewDate: string;
}

interface ReadingPassage {
  title: string;
  text: string;
  hardWords: { word: string; trans: string }[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'reading' | 'cards' | 'writing' | 'voice' | 'leaderboard'>('reading');
  
  // Writing Tutor States
  const [writingMessage, setWritingMessage] = useState('');
  const [writingChat, setWritingChat] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    { sender: 'ai', text: "Salom! Men sizning shaxsiy Writing yordamchingizman. Bekzod's Multilevel formatidagi Task 1.1, Task 1.2 yoki Task 2 bo'yicha savollaringizni bering yoki yozgan javobingizni tekshirish uchun yuboring!" }
  ]);
  const [loadingWriting, setLoadingWriting] = useState(false);

  // Feedback Modal States
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // User Profile States
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Reading Passage States
  const [readingData, setReadingData] = useState<ReadingPassage | null>(null);
  const [loadingReading, setLoadingReading] = useState(false);
  const [readingStep, setReadingStep] = useState<'text' | 'ai_summary' | 'speaking_bridge' | 'completed'>('text');
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [activeWordPopup, setActiveWordPopup] = useState<{ word: string; trans: string; isTranslating?: boolean } | null>(null);
  const [aiSummary, setAiSummary] = useState<string>('');

  // Flashcards States
  const [words, setWords] = useState<SavedWord[]>([]);
  const [loadingWords, setLoadingWords] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // Leaderboard States
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Voice AI States
  const [voiceRecordState, setVoiceRecordState] = useState<'idle' | 'recording' | 'processing' | 'result'>('idle');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingIntervalId, setRecordingIntervalId] = useState<any>(null);
  const [voiceAssessmentResult, setVoiceAssessmentResult] = useState<any>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  
  const voiceTopicsList = [
    "Describe a place you love to visit and explain why it is special to you.",
    "Do you think technology makes our lives simpler or more complex?",
    "What is your dream job and what skills are needed to achieve it?",
    "Discuss the importance of learning foreign languages in the modern world.",
    "How do you usually spend your weekends? Describe your favorite activity.",
    "Describe a memorable journey you took. Where did you go and who were you with?",
    "What is your favorite type of music? Why does it appeal to you?"
  ];
  const [voiceTopic, setVoiceTopic] = useState<string>(voiceTopicsList[0]);

  const changeVoiceTopic = () => {
    try { WebApp.HapticFeedback.impactOccurred('light'); } catch(e){}
    const currentIndex = voiceTopicsList.indexOf(voiceTopic);
    let nextIndex = Math.floor(Math.random() * voiceTopicsList.length);
    if (nextIndex === currentIndex) {
      nextIndex = (nextIndex + 1) % voiceTopicsList.length;
    }
    setVoiceTopic(voiceTopicsList[nextIndex]);
  };

  // Get Telegram WebApp user or mock
  const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
  const telegramId = tgUser?.id || 12345;
  const firstName = tgUser?.first_name || 'Mehmon';
  const username = tgUser?.username || 'mehmon_user';

  // Fetch Profile on load
  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/profile/${telegramId}?firstName=${encodeURIComponent(firstName)}&username=${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (e) {
      console.error("Error fetching profile:", e);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Map XP to Level
  const getLevelInfo = (xp: number) => {
    if (xp < 100)  return { level: 1, title: 'Beginner',     emoji: '🌱', cefr: 'A1' };
    if (xp < 300)  return { level: 2, title: 'Elementary',   emoji: '📗', cefr: 'A2' };
    if (xp < 600)  return { level: 3, title: 'Pre-Intermediate', emoji: '📘', cefr: 'B1' };
    if (xp < 1000) return { level: 4, title: 'Intermediate', emoji: '📙', cefr: 'B2' };
    if (xp < 1500) return { level: 5, title: 'Upper-Intermediate', emoji: '🏆', cefr: 'C1' };
    return         { level: 6, title: 'Advanced',      emoji: '💎', cefr: 'C2' };
  };

  const currentLevel = profile ? getLevelInfo(profile.xp) : { level: 1, title: 'Beginner', emoji: '🌱', cefr: 'A1' };

  // ─── SMART READING LOGIC ──────────────────────────────────────────────────
  const fetchNewReading = async () => {
    setLoadingReading(true);
    setReadingStep('text');
    setSelectedWords([]);
    setActiveWordPopup(null);
    setAiSummary('');
    try {
      const cefr = currentLevel.cefr;
      const res = await fetch(`/api/reading?level=${cefr}`);
      if (res.ok) {
        const data = await res.json();
        setReadingData(data);
        // Generate summary placeholder/prompt
        setAiSummary(`Ushbu matnda "${data.title}" mavzusi, ya'ni darajangizga mos asosiy ingliz tili tushunchalari va yangi iboralar o'rganilishi haqida so'z boradi.`);
      }
    } catch (e) {
      console.error("Error loading reading passage:", e);
    } finally {
      setLoadingReading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reading' && !readingData) {
      fetchNewReading();
    }
  }, [activeTab, readingData]);

  const handleWordClick = async (rawWord: string) => {
    try { WebApp.HapticFeedback.impactOccurred('light'); } catch (e) {}
    
    // Clean word from punctuation
    const cleanWord = rawWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim();
    if (!cleanWord) return;

    // Check if word is already selected
    if (!selectedWords.includes(cleanWord)) {
      const newSelected = [...selectedWords, cleanWord];
      setSelectedWords(newSelected);
      
      // Award XP for expanding vocabulary
      addXpPoints(5);

      // Trigger AI summary/bridge if 3+ words clicked
      if (newSelected.length >= 3 && readingStep === 'text') {
        setTimeout(() => setReadingStep('ai_summary'), 1500);
      }
    }

    // Check if it's pre-translated in hardWords
    const hardMatch = readingData?.hardWords.find(hw => hw.word.toLowerCase() === cleanWord.toLowerCase());
    
    if (hardMatch) {
      setActiveWordPopup({ word: cleanWord, trans: hardMatch.trans });
      // Save word to database
      saveWordToDb(cleanWord, hardMatch.trans);
    } else {
      // Fetch live translation via Gemini API
      setActiveWordPopup({ word: cleanWord, trans: 'Tarjima qilinmoqda...', isTranslating: true });
      try {
        const sentence = readingData?.text || '';
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: cleanWord, sentence })
        });
        if (res.ok) {
          const data = await res.json();
          setActiveWordPopup({ word: cleanWord, trans: data.translation });
          saveWordToDb(cleanWord, data.translation);
        } else {
          setActiveWordPopup({ word: cleanWord, trans: 'Tarjima topilmadi' });
        }
      } catch (e) {
        setActiveWordPopup({ word: cleanWord, trans: 'Tarjima yuklashda xato' });
      }
    }
  };

  const saveWordToDb = async (word: string, translation: string) => {
    try {
      await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: telegramId,
          word,
          translation,
          sentence: readingData?.text || ''
        })
      });
      // Refresh flashcards in background
      fetchWords();
    } catch (e) {
      console.error("Error saving word:", e);
    }
  };

  const addXpPoints = async (amount: number) => {
    try {
      const res = await fetch('/api/user/xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: telegramId, amount })
      });
      if (res.ok) {
        const updatedProfile = await res.json();
        setProfile(updatedProfile);
      }
    } catch (e) {
      console.error("Error adding XP:", e);
    }
  };

  const handleSendWriting = async () => {
    if (!writingMessage.trim() || loadingWriting) return;
    const msg = writingMessage;
    setWritingMessage('');
    setWritingChat(prev => [...prev, { sender: 'user', text: msg }]);
    setLoadingWriting(true);
    try {
      const { getWritingHelp } = await import('./api/writing.api');
      const reply = await getWritingHelp(msg);
      setWritingChat(prev => [...prev, { sender: 'ai', text: reply }]);
      addXpPoints(10);
    } catch (err: any) {
      setWritingChat(prev => [...prev, { sender: 'ai', text: `⚠️ Xatolik yuz berdi: ${err.message || err}` }]);
    } finally {
      setLoadingWriting(false);
    }
  };

  const handleSendFeedback = async () => {
    if (submittingFeedback) return;
    setSubmittingFeedback(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: telegramId,
          rating: feedbackRating,
          comment: feedbackComment
        })
      });
      if (res.ok) {
        try { WebApp.HapticFeedback.notificationOccurred('success'); } catch(e){}
        // Give 10 XP as reward for feedback!
        await addXpPoints(10);
        setShowFeedbackModal(false);
        setFeedbackComment('');
        setFeedbackRating(5);
        WebApp.showAlert("Fikringiz muvaffaqiyatli yuborildi! Yordamingiz uchun rahmat va sizga +10 XP taqdim etildi. 🌟");
      }
    } catch (e) {
      console.error("Error submitting feedback:", e);
      WebApp.showAlert("Fikr yuborishda xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const startVoiceRecording = async () => {
    setVoiceError(null);
    setRecordingSeconds(0);
    try { WebApp.HapticFeedback.notificationOccurred('success'); } catch(e){}

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setVoiceRecordState('processing');
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        
        // Convert to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          await uploadVoiceAudio(base64Data);
        };

        // Stop all audio tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setVoiceRecordState('recording');

      // Start duration tracker
      const interval = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 60) {
            // Auto stop at 60s
            recorder.stop();
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      setRecordingIntervalId(interval);

    } catch (err: any) {
      console.error("Microphone access failed:", err);
      setVoiceError("Mikrofonni ishga tushirib bo'lmadi. Iltimos ruxsat berilganligini tekshiring.");
      setVoiceRecordState('idle');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder && voiceRecordState === 'recording') {
      try { WebApp.HapticFeedback.impactOccurred('medium'); } catch(e){}
      if (recordingIntervalId) {
        clearInterval(recordingIntervalId);
      }
      mediaRecorder.stop();
    }
  };

  const uploadVoiceAudio = async (base64Audio: string) => {
    try {
      const res = await fetch('/api/voice-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: telegramId,
          audio: base64Audio,
          mimeType: 'audio/webm',
          topic: voiceTopic
        })
      });

      if (res.ok) {
        const data = await res.json();
        setVoiceAssessmentResult(data.assessment);
        if (data.profile) {
          setProfile(data.profile);
        }
        setVoiceRecordState('result');
        try { WebApp.HapticFeedback.notificationOccurred('success'); } catch(e){}
      } else {
        const errorData = await res.json();
        setVoiceError(errorData.error || "Tahlil qilishda xatolik yuz berdi.");
        setVoiceRecordState('idle');
      }
    } catch (err: any) {
      console.error("Audio upload failed:", err);
      setVoiceError(err.message || "Serverga ulanishda xatolik.");
      setVoiceRecordState('idle');
    }
  };

  useEffect(() => {
    return () => {
      if (recordingIntervalId) {
        clearInterval(recordingIntervalId);
      }
    };
  }, [recordingIntervalId]);

  // ─── FLASHCARDS LOGIC ──────────────────────────────────────────────────────
  const fetchWords = async () => {
    setLoadingWords(true);
    try {
      const res = await fetch(`/api/words/${telegramId}`);
      if (res.ok) {
        const data = await res.json();
        // Sort words to review: prioritize cards that are due for review (nextReviewDate <= today)
        const today = new Date().toISOString().split('T')[0];
        const sorted = data.sort((a: SavedWord, b: SavedWord) => {
          if (a.nextReviewDate <= today && b.nextReviewDate > today) return -1;
          if (a.nextReviewDate > today && b.nextReviewDate <= today) return 1;
          return a.nextReviewDate.localeCompare(b.nextReviewDate);
        });
        setWords(sorted);
        setCurrentCardIndex(0);
        setShowAnswer(false);
      }
    } catch (e) {
      console.error("Error loading words:", e);
    } finally {
      setLoadingWords(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'cards') {
      fetchWords();
    }
  }, [activeTab]);

  const handleReview = async (difficulty: 'easy' | 'hard') => {
    if (words.length === 0) return;
    try { WebApp.HapticFeedback.notificationOccurred(difficulty === 'easy' ? 'success' : 'warning'); } catch(e){}

    const currentWord = words[currentCardIndex];
    try {
      const res = await fetch('/api/words/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: telegramId,
          word: currentWord.word,
          difficulty
        })
      });

      if (res.ok) {
        // Award XP
        const xpEarned = difficulty === 'easy' ? 15 : 5;
        await addXpPoints(xpEarned);
        
        // Move to next card or refresh list
        if (currentCardIndex + 1 < words.length) {
          setCurrentCardIndex(currentCardIndex + 1);
          setShowAnswer(false);
        } else {
          // Finished this round, refetch
          fetchWords();
        }
      }
    } catch (e) {
      console.error("Error submitting review:", e);
    }
  };

  // ─── LEADERBOARD LOGIC ─────────────────────────────────────────────────────
  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
    } catch (e) {
      console.error("Error loading leaderboard:", e);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [activeTab]);

  // Clean words array from paragraph string for render
  const renderInteractiveText = (text: string) => {
    const rawWords = text.split(/\s+/);
    return rawWords.map((word, idx) => {
      // Remove symbols for highlight mapping
      const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim();
      const isClicked = selectedWords.includes(cleanWord);
      return (
        <button
          key={idx}
          onClick={() => handleWordClick(word)}
          className={`transition-all duration-150 px-1.5 py-0.5 rounded-lg font-medium cursor-pointer ${
            isClicked
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/10'
              : 'hover:bg-white/10 text-slate-100 hover:text-white active:scale-95'
          }`}
        >
          {word}
        </button>
      );
    });
  };

  return (
    <div className="min-h-screen bg-[#090a12] text-white flex flex-col pb-24 font-sans selection:bg-indigo-500">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-[#090a12]/80 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/25 border border-white/10">
            M
          </div>
          <div>
            <h1 className="font-extrabold text-base leading-tight tracking-wide bg-gradient-to-r from-white via-indigo-50 to-indigo-200 bg-clip-text text-transparent">
              Mentory AI
            </h1>
            <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
              <span>{currentLevel.emoji} {currentLevel.title}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
              <span>Level {currentLevel.level} ({currentLevel.cefr})</span>
            </p>
          </div>
        </div>
        
        {/* Streak and XP container */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 bg-white/5 px-3 py-2 rounded-2xl border border-white/10">
            <div className="flex items-center gap-1.5 text-amber-500 font-bold text-sm">
              <Flame className="w-4 h-4 fill-amber-500 animate-pulse" />
              <span>{profile?.streak ?? 1} d</span>
            </div>
            <div className="h-3.5 w-[1px] bg-white/10"></div>
            <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>{profile?.xp ?? 0} XP</span>
            </div>
          </div>

          {/* Feedback Icon Button */}
          <button
            onClick={() => {
              try { WebApp.HapticFeedback.impactOccurred('light'); } catch(e){}
              setShowFeedbackModal(true);
            }}
            className="p-2 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/50 hover:bg-white/10 transition-all text-indigo-400 hover:text-white"
            title="Fikr va taklif yuborish"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        {loadingProfile ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Profilingiz yuklanmoqda...</p>
          </div>
        ) : profile && profile.totalLessons >= 1 && !profile.isSubscribed ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-12 px-6 bg-[#121424]/90 border border-indigo-500/20 rounded-3xl text-center space-y-6 max-w-sm mx-auto shadow-2xl shadow-indigo-500/5 mt-8 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>
            <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl mx-auto flex items-center justify-center border border-indigo-500/20 text-indigo-400 shadow-inner">
              <Sparkles className="w-10 h-10 animate-pulse text-indigo-500" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-white">Bepul dars yakunlandi!</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Siz 1-darsni muvaffaqiyatli topshirdingiz. Darslarni davom ettirish uchun homiy kanalimizga obuna bo'ling!
              </p>
            </div>

            <div className="bg-[#090a12]/80 p-4 rounded-2xl border border-white/5 space-y-2.5 text-left text-[11px] font-semibold text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>Navbatdagi 50+ interaktiv matnlar</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>AI orqali cheksiz talaffuz va ovozli suhbatlar</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>Multilevel va IELTS Writing yordamchisi</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <a
                href="https://t.me/Elshod_Makhammadivich_I"
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  try { WebApp.HapticFeedback.selectionChanged(); } catch(e){}
                }}
                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-xs font-black text-white transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                📢 Homiy kanalga a'zo bo'lish
              </a>
              
              <button
                onClick={async () => {
                  try { WebApp.HapticFeedback.notificationOccurred('success'); } catch(e){}
                  const res = await fetch(`/api/user/subscription/${telegramId}`);
                  if (res.ok) {
                    const data = await res.json();
                    if (data.isSubscribed) {
                      // Refresh profile
                      fetchProfile();
                      WebApp.showAlert("Tabriklaymiz! Obuna tasdiqlandi. Darslarni davom ettirishingiz mumkin. 🎉");
                    } else {
                      WebApp.showAlert("Obuna aniqlanmadi. Iltimos kanalga a'zo bo'ling va qayta urinib ko'ring. ⚠️");
                    }
                  }
                }}
                className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                ✅ Obunani tekshirish
              </button>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* 1. READING TAB */}
            {activeTab === 'reading' && (
              <motion.div key="reading" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-extrabold px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                      Smart Reading
                    </span>
                    <button 
                      onClick={fetchNewReading}
                      disabled={loadingReading}
                      className="p-2 hover:bg-white/5 active:scale-95 transition-all text-slate-400 hover:text-white rounded-xl border border-white/5 bg-white/5 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingReading ? 'animate-spin' : ''}`} />
                    </button>
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
                              const res = await fetch('/api/user/lesson-completed', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: telegramId })
                              });
                              if (res.ok) {
                                const updated = await res.json();
                                setProfile(updated);
                              }
                            } catch (e) {
                              console.error("Error completing lesson:", e);
                            }
                            addXpPoints(30);
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
              </motion.div>
            )}

            {/* 2. FLASHCARDS TAB */}
            {activeTab === 'cards' && (
              <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
                <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-extrabold tracking-wider rounded-full mb-3 inline-block uppercase">
                  Spaced Repetition (SRS)
                </span>
                <h2 className="text-2xl font-black mb-4 tracking-tight">So'z Kartochkalari</h2>
                
                {loadingWords ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white/5 rounded-3xl border border-white/5">
                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-xs text-slate-400 font-medium">Lug'at yuklanmoqda...</p>
                  </div>
                ) : words.length === 0 ? (
                  <div className="bg-[#121424] p-8 rounded-3xl border border-white/5 text-center shadow-xl py-12">
                    <Bookmark className="w-12 h-12 text-indigo-400/40 mx-auto mb-3" />
                    <h3 className="text-lg font-bold mb-1">Lug'atingiz bo'sh</h3>
                    <p className="text-slate-400 text-xs max-w-xs mx-auto leading-relaxed">
                      "Smart Reading" bo'limida inglizcha matnlarni o'qib, so'zlarni bosing. Ular shu yerda paydo bo'ladi.
                    </p>
                    <button 
                      onClick={() => setActiveTab('reading')}
                      className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md shadow-indigo-600/20"
                    >
                      Matn o'qishni boshlash
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-400 text-xs mb-3">
                      Haftalik takrorlash. Javobni bilish uchun kartani bosing.
                    </p>
                    
                    {/* Card Body */}
                    <div 
                      onClick={() => setShowAnswer(!showAnswer)}
                      className="w-full min-h-[220px] bg-[#121424] hover:bg-[#15172b] cursor-pointer rounded-3xl border border-indigo-500/20 flex flex-col items-center justify-center p-6 relative overflow-hidden shadow-2xl transition-all active:scale-98"
                    >
                      <div className="absolute top-4 right-4 text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-white/5 text-slate-400 border border-white/5">
                        {currentCardIndex + 1} / {words.length}
                      </div>

                      <Bookmark className="w-8 h-8 text-indigo-500/80 mb-3" />
                      
                      <h3 className="text-3xl font-black text-white tracking-wide mb-1">
                        {words[currentCardIndex].word}
                      </h3>
                      
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
                    </div>

                    {/* Review Action Buttons */}
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
            )}

            {/* 2.5. WRITING TAB */}
            {activeTab === 'writing' && (
              <motion.div 
                key="writing" 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 pb-20"
              >
                <div>
                  <h2 className="text-2xl font-black mb-1 flex items-center gap-2 tracking-tight">
                    <Edit className="text-indigo-400 w-6 h-6 stroke-[2.5px]" /> Writing Coach
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Multilevel (CEFR B1-B2) imtihon formatiga mos Writing mashqlari va AI tekshiruvchi.
                  </p>
                </div>

                {/* Quick Chips */}
                <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-hide">
                  {[
                    { label: "📝 Task 1.1 Do'stga xat", prompt: "Menga Task 1.1 (do'stga xat) strukturasini tushuntir va template ber" },
                    { label: "📋 Task 1.2 Rasmiy xat", prompt: "Menga Task 1.2 (menejerga rasmiy xat) strukturasini tushuntir va template ber" },
                    { label: "💬 Task 2 Essay", prompt: "Menga Task 2 (Advantages/Disadvantages va Opinion) strukturalarini tushuntir va template ber" },
                    { label: "🎯 Sample olish", prompt: "Menga Multilevel writing imtihoni uchun bitta mavzuga sample (namuna) javob yozib ber" },
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        try { WebApp.HapticFeedback.impactOccurred('light'); } catch(e){}
                        setWritingMessage(chip.prompt);
                      }}
                      className="px-3 py-1.5 rounded-full bg-[#121424] border border-white/10 hover:border-indigo-500 text-[10px] font-bold text-slate-300 hover:text-white transition-all whitespace-nowrap"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Chat Messages */}
                <div className="bg-[#121424]/90 border border-white/5 rounded-3xl p-4 min-h-[300px] max-h-[400px] overflow-y-auto space-y-3.5 custom-scrollbar">
                  {writingChat.map((chat, idx) => (
                    <div 
                      key={idx} 
                      className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[85%] rounded-2xl p-3.5 text-xs font-medium leading-relaxed ${
                          chat.sender === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                            : 'bg-white/5 border border-white/5 text-slate-200 rounded-tl-none whitespace-pre-wrap'
                        }`}
                      >
                        {chat.text}
                      </div>
                    </div>
                  ))}
                  {loadingWriting && (
                    <div className="flex justify-start">
                      <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-400 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                        AI Coach yozmoqda...
                      </div>
                    </div>
                  )}
                </div>

                {/* Input box */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={writingMessage}
                    onChange={(e) => setWritingMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendWriting();
                    }}
                    placeholder="Mavzu yozing yoki essey yuboring..."
                    className="flex-1 bg-[#121424] border border-white/5 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                  <button
                    onClick={handleSendWriting}
                    disabled={loadingWriting || !writingMessage.trim()}
                    className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all disabled:opacity-50"
                  >
                    Yuborish
                  </button>
                </div>
              </motion.div>
            )}

            {/* 3. VOICE AI TAB */}
            {activeTab === 'voice' && (
              <motion.div 
                key="voice" 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5 pb-20"
              >
                <div>
                  <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-extrabold tracking-wider rounded-full inline-block uppercase">
                    IELTS Speaking Coach
                  </span>
                  <h2 className="text-2xl font-black mt-2 tracking-tight flex items-center gap-2">
                    <Mic className="text-indigo-400 w-6 h-6 stroke-[2.5px]" /> Speaking Ustoz
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    AI ustoz sizning ovozingizni eshitadi, IELTS balingizni chiqaradi va xatolaringizni to'g'rilaydi.
                  </p>
                </div>

                {/* Topic selector */}
                {voiceRecordState !== 'processing' && voiceRecordState !== 'result' && (
                  <div className="bg-[#121424] border border-white/5 rounded-3xl p-5 space-y-3 relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full blur-2xl"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-black text-indigo-400 tracking-wider">Mavzu (Topic)</span>
                      <button 
                        onClick={changeVoiceTopic}
                        className="text-[10px] font-extrabold text-amber-400 hover:text-amber-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl transition-all"
                      >
                        🔄 Boshqa mavzu
                      </button>
                    </div>
                    <p className="text-sm font-extrabold text-white leading-relaxed italic pr-4">
                      "{voiceTopic}"
                    </p>
                  </div>
                )}

                {/* IDLE STATE */}
                {voiceRecordState === 'idle' && (
                  <div className="text-center py-6 space-y-4">
                    <button 
                      onClick={startVoiceRecording}
                      className="w-36 h-36 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 mx-auto flex items-center justify-center p-2 shadow-2xl shadow-indigo-500/30 cursor-pointer border-4 border-white/10 active:scale-95 transition-all"
                    >
                      <Mic className="w-14 h-14 text-white" />
                    </button>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-indigo-300">Tugmani bosib gapirishni boshlang</p>
                      <p className="text-[10px] text-slate-500">Mavzu bo'yicha gapiring (maksimim 60 soniya)</p>
                    </div>

                    {voiceError && (
                      <div className="bg-red-500/10 border border-red-500/20 p-3.5 rounded-2xl flex items-center gap-2.5 text-left text-xs text-red-400 max-w-sm mx-auto">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="font-semibold">{voiceError}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* RECORDING STATE */}
                {voiceRecordState === 'recording' && (
                  <div className="text-center py-6 space-y-4">
                    <div className="relative flex items-center justify-center w-36 h-36 mx-auto">
                      {/* Ripple ripples */}
                      <motion.div
                        animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                        className="absolute inset-0 bg-red-500/25 rounded-full"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                        transition={{ duration: 1.5, delay: 0.5, repeat: Infinity, ease: "easeOut" }}
                        className="absolute inset-0 bg-red-500/20 rounded-full"
                      />
                      <button
                        onClick={stopVoiceRecording}
                        className="relative z-10 w-24 h-24 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center border-4 border-white/10 shadow-2xl transition-all active:scale-95"
                      >
                        <Square className="w-8 h-8 text-white fill-white" />
                      </button>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-xl font-black text-red-500 flex items-center justify-center gap-2">
                        <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping"></span>
                        <span>0:{recordingSeconds.toString().padStart(2, '0')}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tayyor bo'lgach, stop tugmasini bosing</p>
                    </div>
                  </div>
                )}

                {/* PROCESSING STATE */}
                {voiceRecordState === 'processing' && (
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center gap-4 py-20 text-center">
                    <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
                    <div className="space-y-1">
                      <h3 className="text-base font-extrabold text-white">AI ustoz audioni tahlil qilmoqda...</h3>
                      <p className="text-xs text-slate-400 max-w-xs leading-relaxed font-semibold">
                        Gemini AI sizning talaffuz, ravonlik va grammatika ko'rsatkichlaringiz bo'yicha IELTS hisobotini tayyorlamoqda.
                      </p>
                    </div>
                  </div>
                )}

                {/* RESULT STATE */}
                {voiceRecordState === 'result' && voiceAssessmentResult && (
                  <div className="space-y-4 text-left">
                    {/* Score Badge Card */}
                    <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 rounded-3xl p-5 text-center shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
                      <div className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest mb-1">Speaking IELTS Balingiz</div>
                      <div className="text-5xl font-black bg-gradient-to-r from-indigo-300 via-purple-300 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                        {voiceAssessmentResult.bandScore}
                      </div>
                      <div className="text-xs text-emerald-400 font-bold mt-2.5 flex items-center justify-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        <span>Speaking mashqi uchun +20 XP taqdim etildi!</span>
                      </div>
                    </div>

                    {/* Topic display */}
                    <div className="bg-[#121424] border border-white/5 rounded-3xl p-5 space-y-1">
                      <div className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider">Mavzu (Topic)</div>
                      <p className="text-xs font-semibold text-slate-300 leading-relaxed italic">
                        "{voiceTopic}"
                      </p>
                    </div>

                    {/* Transcript */}
                    <div className="bg-[#121424] border border-white/5 rounded-3xl p-5 space-y-2">
                      <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2.5">
                        <Volume2 className="w-5 h-5 text-indigo-400" /> Sizning Transkriptingiz
                      </h3>
                      <p className="text-xs font-medium text-slate-100 italic bg-black/35 p-3.5 rounded-2xl border border-white/5 leading-relaxed">
                        "{voiceAssessmentResult.transcript}"
                      </p>
                    </div>

                    {/* Corrections */}
                    {voiceAssessmentResult.corrections && voiceAssessmentResult.corrections.length > 0 && (
                      <div className="bg-[#121424] border border-white/5 rounded-3xl p-5 space-y-3">
                        <h3 className="text-xs uppercase tracking-wider text-amber-500 font-bold">
                          ⚠️ Xatolar va Takliflar
                        </h3>
                        <div className="space-y-3">
                          {voiceAssessmentResult.corrections.map((corr: { original: string; corrected: string; explanation: string }, idx: number) => (
                            <div key={idx} className="bg-black/35 rounded-2xl p-3.5 border border-white/5 space-y-2 text-xs font-semibold">
                              <div className="flex flex-col gap-1 leading-relaxed">
                                <span className="text-red-400">❌ Siz dedingiz: <span className="italic">"{corr.original}"</span></span>
                                <span className="text-emerald-400">✅ To'g'ri variant: <span className="italic">"{corr.corrected}"</span></span>
                              </div>
                              <p className="text-slate-300 text-[11px] leading-relaxed pt-1.5 border-t border-white/5 font-medium">
                                💡 {corr.explanation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pronunciation & Fluency feedback */}
                    <div className="grid grid-cols-1 gap-3">
                      <div className="bg-[#121424] border border-white/5 rounded-3xl p-5 space-y-2">
                        <h3 className="text-xs uppercase tracking-wider text-indigo-400 font-bold">🗣️ Talaffuz (Pronunciation)</h3>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                          {voiceAssessmentResult.pronunciation}
                        </p>
                      </div>
                      <div className="bg-[#121424] border border-white/5 rounded-3xl p-5 space-y-2">
                        <h3 className="text-xs uppercase tracking-wider text-indigo-400 font-bold">⚡ Ravonlik (Fluency)</h3>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                          {voiceAssessmentResult.fluency}
                        </p>
                      </div>
                    </div>

                    {/* Try again */}
                    <button
                      onClick={() => {
                        try { WebApp.HapticFeedback.impactOccurred('light'); } catch(e){}
                        setVoiceRecordState('idle');
                        setVoiceAssessmentResult(null);
                        changeVoiceTopic();
                      }}
                      className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-xs font-black text-white transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                    >
                      Keyingi Mashqni Boshlash <ArrowRight className="w-4 h-4 stroke-[3px]" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* 4. LEADERBOARD TAB */}
            {activeTab === 'leaderboard' && (
              <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2">
                <h2 className="text-2xl font-black mb-1.5 flex items-center gap-2 tracking-tight">
                  <Trophy className="text-amber-400 w-6 h-6 stroke-[2.5px]" /> Peshqadamlar Jadvali
                </h2>
                <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                  Eng faol o'quvchilar haftalik reytingi. Mashqlar bajarib reytingda yuqorilang!
                </p>

                {loadingLeaderboard ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white/5 rounded-3xl border border-white/5">
                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-xs text-slate-400 font-medium">Jadval yuklanmoqda...</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {leaderboard.map((u, i) => {
                      const isMe = u.telegramId === telegramId;
                      const lvlInfo = getLevelInfo(u.xp);
                      return (
                        <div 
                          key={i} 
                          className={`p-3.5 rounded-2xl flex items-center justify-between font-bold border transition-all ${
                            isMe
                              ? 'bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border-indigo-500 text-white shadow-xl shadow-indigo-500/10 scale-[1.01]'
                              : 'bg-[#121424]/90 border-white/5 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                              i === 0 ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20' :
                              i === 1 ? 'bg-slate-300 text-black' :
                              i === 2 ? 'bg-amber-700 text-white' : 'bg-white/5'
                            }`}>{i + 1}</span>
                            <div>
                              <span className="text-sm font-extrabold text-white">{u.firstName}</span>
                              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                                {lvlInfo.emoji} {lvlInfo.title}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-indigo-400 font-black text-sm">{u.xp} XP</span>
                            <span className="text-[9px] text-amber-500/90 font-bold block mt-0.5">🔥 {u.streak} kun</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#090a12]/90 backdrop-blur-md border-t border-white/5 px-6 py-3.5 flex items-center justify-around max-w-md mx-auto">
        {[
          { id: 'reading', label: 'Reading', icon: BookOpen },
          { id: 'cards', label: 'Cards', icon: Bookmark },
          { id: 'writing', label: 'Writing', icon: Edit },
          { id: 'voice', label: 'Voice AI', icon: Mic },
          { id: 'leaderboard', label: 'Top', icon: Trophy },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { 
                try { WebApp.HapticFeedback.selectionChanged(); } catch (e){}
                setActiveTab(tab.id as any); 
              }}
              className={`flex flex-col items-center gap-1 transition-all ${
                isActive ? 'text-indigo-400 scale-105 font-bold' : 'text-slate-400 hover:text-white font-medium'
              }`}
            >
              <Icon className={`w-6 h-6 transition-all ${isActive ? 'drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : ''}`} />
              <span className="text-[10px] tracking-wide mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Feedback Modal Overlay */}
      <AnimatePresence>
        {showFeedbackModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#090a12]/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-[#121424] border border-white/10 rounded-3xl p-6 shadow-2xl shadow-indigo-500/10 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <MessageSquare className="text-indigo-400 w-5 h-5" /> Fikr va Takliflar
                </h3>
                <button 
                  onClick={() => setShowFeedbackModal(false)}
                  className="text-slate-400 hover:text-white font-extrabold text-sm"
                >
                  Yopish
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Ilovani yaxshilash bo'yicha fikringiz biz uchun juda muhim. Taklifingiz uchun sizga **+10 XP** taqdim etiladi!
              </p>

              {/* Stars Selector */}
              <div className="flex justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => {
                      try { WebApp.HapticFeedback.impactOccurred('light'); } catch(e){}
                      setFeedbackRating(star);
                    }}
                    className="p-1 focus:outline-none transition-all active:scale-90"
                  >
                    <Star 
                      className={`w-8 h-8 transition-colors ${
                        star <= feedbackRating 
                          ? 'fill-amber-500 text-amber-500' 
                          : 'text-white/15'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Comment Textarea */}
              <textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Fikringiz, taklifingiz yoki aniqlangan xatoliklar..."
                rows={4}
                className="w-full bg-[#090a12] border border-white/5 rounded-2xl p-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all resize-none"
              />

              {/* Submit button */}
              <button
                onClick={handleSendFeedback}
                disabled={submittingFeedback || !feedbackComment.trim()}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-xs font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingFeedback && <RefreshCw className="w-4 h-4 animate-spin" />}
                {submittingFeedback ? 'Yuborilmoqda...' : 'Yuborish'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
