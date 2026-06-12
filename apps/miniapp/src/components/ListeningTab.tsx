import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Search, Video, PlusCircle, Sparkles, Volume2 } from 'lucide-react';
import YouTube, { YouTubeProps } from 'react-youtube';
import WebApp from '@twa-dev/sdk';
import { apiService } from '../services/api';

interface ListeningTabProps {
  telegramId: number;
  initialVideoId?: string;
}

export function ListeningTab({ telegramId, initialVideoId }: ListeningTabProps) {
  const [videoId, setVideoId] = useState<string>(initialVideoId || '');
  const [inputUrl, setInputUrl] = useState('');
  const [transcript, setTranscript] = useState<any[]>([]);
  const [vocab, setVocab] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [selectedWord, setSelectedWord] = useState<{word: string, translation: string, sentence: string, type?: string} | null>(null);
  const [addingWord, setAddingWord] = useState(false);

  const [manualSearch, setManualSearch] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  const playerRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (videoId) {
      loadVideoData(videoId);
    }
  }, [videoId]);

  const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleSearch = () => {
    const id = extractVideoId(inputUrl);
    if (id) {
      setVideoId(id);
    } else {
      WebApp.showAlert("Noto'g'ri YouTube ssilkasi");
    }
  };

  const loadVideoData = async (id: string) => {
    setLoading(true);
    setTranscript([]);
    setVocab([]);
    try {
      const [ts, vc] = await Promise.all([
        apiService.getYoutubeTranscript(id),
        apiService.getYoutubeVocab(id)
      ]);
      setTranscript(ts);
      setVocab(vc);
    } catch (e) {
      console.error(e);
      WebApp.showAlert("Videoni tahlil qilishda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
  };

  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    // 1 is playing, 2 is paused
    if (event.data === 1) {
      setIsPlaying(true);
      startTimer();
    } else {
      setIsPlaying(false);
      stopTimer();
    }
  };

  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(async () => {
      if (playerRef.current) {
        const time = await playerRef.current.getCurrentTime();
        setCurrentTime(time * 1000); // ms
      }
    }, 500);
  };

  const stopTimer = () => {
    clearInterval(timerRef.current);
  };

  const speakWord = (word: string) => {
    try { WebApp.HapticFeedback.impactOccurred('light'); } catch(e){}
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleWordClick = async (word: string, currentSentence: string) => {
    if (playerRef.current) {
      playerRef.current.pauseVideo();
    }
    const cleanWord = word.replace(/[^\w\s]/gi, '').toLowerCase();
    try {
      const res = await apiService.translateWord(cleanWord, currentSentence);
      setSelectedWord({
        word: cleanWord,
        translation: res.translation,
        sentence: currentSentence,
        type: res.type
      });
    } catch (e) {
      // Fallback
      setSelectedWord({
        word: cleanWord,
        translation: "Tarjima jarayoni (Demo)",
        sentence: currentSentence,
        type: "word"
      });
    }
  };

  const addWordToFlashcards = async () => {
    if (!selectedWord) return;
    setAddingWord(true);
    try {
      await apiService.saveWord(telegramId, selectedWord.word, selectedWord.translation, selectedWord.sentence);
      WebApp.showAlert("Lug'atga qo'shildi! ✅");
      setSelectedWord(null);
    } catch (e) {
      WebApp.showAlert("Xatolik yuz berdi");
    } finally {
      setAddingWord(false);
      if (playerRef.current) playerRef.current.playVideo();
    }
  };

  const handleManualSearch = async () => {
    if (!manualSearch.trim()) return;
    if (playerRef.current) {
      playerRef.current.pauseVideo();
    }
    setIsTranslating(true);
    try {
      const res = await apiService.translateWord(manualSearch, "Translate this standalone word. If it is a common name like Jack, just say it is a name.");
      setSelectedWord({
        word: manualSearch.trim(),
        translation: res.translation || "Tarjima topilmadi",
        sentence: "Mustaqil kiritilgan so'z",
        type: res.type
      });
      setManualSearch('');
    } catch (e) {
      try { WebApp.showAlert("Tarjima qilishda xatolik yuz berdi"); } catch(e){}
    } finally {
      setIsTranslating(false);
    }
  };

  // Find current active caption
  const currentCaption = transcript.find(t => 
    currentTime >= t.offset && currentTime <= (t.offset + t.duration)
  );

  return (
    <div className="py-6 pb-24 px-2">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-white">Listening 🎧</h2>
        <p className="text-slate-400 text-sm">YouTube orqali ingliz tilini o'rganamiz</p>
      </div>

      {!videoId && (
        <div className="bg-[#121424] border border-white/5 rounded-3xl p-6 shadow-xl mb-8">
          <Video className="w-12 h-12 text-rose-500 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Video havolasini joylang</h3>
          <p className="text-sm text-slate-400 mb-4">YouTube'dagi istalgan qiziqarli video yoki darslik ssilkasini kiriting.</p>
          
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="https://youtu.be/..." 
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="flex-1 bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-rose-500"
            />
            <button 
              onClick={handleSearch}
              className="bg-rose-600 hover:bg-rose-500 w-12 h-12 flex items-center justify-center rounded-2xl active:scale-95 transition-all"
            >
              <Search className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-4" />
          <p>AI videoni tahlil qilmoqda (so'zlar ajratilmoqda)...</p>
        </div>
      )}

      {videoId && !loading && (
        <div className="space-y-6">
          {/* PLAYER */}
          <div className="rounded-3xl overflow-hidden border border-white/10 bg-black aspect-video relative">
            <YouTube 
              videoId={videoId} 
              opts={{ width: '100%', height: '100%', playerVars: { autoplay: 0, rel: 0, cc_load_policy: 0 } }} 
              onReady={onPlayerReady}
              onStateChange={onStateChange}
              className="absolute inset-0"
            />
          </div>

          {/* INTERACTIVE CAPTIONS */}
          <div className="bg-[#1a1c2e] border border-rose-500/20 rounded-3xl p-6 min-h-[120px] relative overflow-hidden flex items-center justify-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl"></div>
            
            {currentCaption ? (
              <div className="text-center">
                {currentCaption.text.split(' ').map((word: string, i: number) => (
                  <span 
                    key={i} 
                    onClick={() => handleWordClick(word, currentCaption.text)}
                    className="text-2xl font-black text-white mr-2 cursor-pointer hover:text-rose-400 transition-colors inline-block"
                  >
                    {word}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 italic text-sm text-center">
                {isPlaying ? "Matn kutilmoqda..." : "Videoni boshlang"}
              </p>
            )}
          </div>

          {/* MANUAL SEARCH */}
          <div className="bg-[#121424] border border-white/10 rounded-2xl p-4 shadow-lg flex gap-2">
            <input 
              type="text" 
              placeholder="Eshitgan so'zingizni yozing..." 
              value={manualSearch}
              onChange={(e) => setManualSearch(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-rose-500/50"
            />
            <button 
              onClick={handleManualSearch}
              disabled={isTranslating}
              className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 px-4 py-3 rounded-xl font-bold text-white text-sm transition-all flex items-center justify-center min-w-[90px]"
            >
              {isTranslating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Tarjima"}
            </button>
          </div>

          {/* PRE-TEACHING VOCAB */}
          {vocab.length > 0 && (
            <div className="bg-[#121424] border border-white/5 rounded-3xl p-6">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-500" /> AI ajratgan eng muhim so'zlar
              </h3>
              <div className="space-y-3">
                {vocab.map((v, i) => (
                  <div key={i} className="bg-black/20 p-3 rounded-2xl border border-white/5 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-rose-300">{v.word}</p>
                      <p className="text-xs text-slate-400">{v.translation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* POPUP FOR WORD */}
      {selectedWord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#1a1c2e] border border-white/10 p-6 rounded-3xl shadow-2xl w-full max-w-sm text-center">
            <h3 className="text-3xl font-black text-white mb-1 flex justify-center items-center gap-2">
              {selectedWord.word}
              <button 
                onClick={() => speakWord(selectedWord.word)}
                className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-indigo-400 transition-colors"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </h3>
            {selectedWord.type && (
              <span className="inline-block bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded-md uppercase font-bold mb-2">
                {selectedWord.type}
              </span>
            )}
            <p className="text-rose-400 font-bold mb-4 text-lg">{selectedWord.translation}</p>
            
            <div className="bg-black/30 p-4 rounded-xl mb-6 text-sm text-slate-300 italic border border-white/5">
              "{selectedWord.sentence}"
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => { setSelectedWord(null); if (playerRef.current) playerRef.current.playVideo(); }}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl"
              >
                Yopish
              </button>
              <button 
                onClick={addWordToFlashcards}
                disabled={addingWord}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2"
              >
                {addingWord ? <Loader2 className="w-4 h-4 animate-spin" /> : <><PlusCircle className="w-4 h-4" /> Saqlash</>}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
