import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, Volume2, Award, Loader2, ArrowRight } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { apiService } from '../services/api';
import { Roleplay } from './Roleplay';

interface ShadowingTabProps {
  telegramId: number;
  currentLevel: string;
  onProfileUpdated: (profile: any) => void;
}

export function ShadowingTab({ telegramId, currentLevel, onProfileUpdated }: ShadowingTabProps) {
  const [mode, setMode] = useState<'shadowing' | 'roleplay'>('roleplay');
  const [targetSentence, setTargetSentence] = useState<{sentence: string, translation: string} | null>(null);
  const [loadingSentence, setLoadingSentence] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<{ score: number, feedback: string, xpEarned?: number } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    loadSentence();
  }, [currentLevel]);

  const loadSentence = async () => {
    setLoadingSentence(true);
    setResult(null);
    try {
      const data = await apiService.getShadowingSentence(currentLevel);
      setTargetSentence(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSentence(false);
    }
  };

  const playSentence = () => {
    if (!targetSentence) return;
    try { WebApp.HapticFeedback.impactOccurred('light'); } catch(e){}
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(targetSentence.sentence);
    utterance.lang = 'en-US';
    utterance.rate = 0.9; // slightly slower for shadowing
    synth.speak(utterance);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      try { WebApp.HapticFeedback.impactOccurred('medium'); } catch(e){}
    } catch (error) {
      WebApp.showAlert("Mikrofonga ruxsat berilmadi yoki xatolik yuz berdi.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (blob: Blob) => {
    setEvaluating(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(',')[1];
        const evalData = await apiService.evaluateShadowing(
          telegramId,
          base64data,
          'audio/webm',
          targetSentence!.sentence
        );
        setResult(evalData);
        if (evalData.profile) {
          onProfileUpdated(evalData.profile);
        }
      };
    } catch (e) {
      WebApp.showAlert("Ovozni tahlil qilishda xatolik yuz berdi.");
    } finally {
      setEvaluating(false);
    }
  };

  if (loadingSentence) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p>Jumla tayyorlanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="py-6 pb-24">
      <div className="flex items-center justify-between mb-6 px-2">
        <div>
          <h2 className="text-2xl font-black text-white">Voice Hub 🗣</h2>
          <p className="text-slate-400 text-sm">Talaffuz va Suhbat</p>
        </div>
      </div>

      <div className="flex bg-white/5 p-1 rounded-xl mb-6">
        <button 
          onClick={() => { try { WebApp.HapticFeedback.impactOccurred('light'); } catch(e){} setMode('shadowing'); }}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'shadowing' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
        >
          Shadowing
        </button>
        <button 
          onClick={() => { try { WebApp.HapticFeedback.impactOccurred('light'); } catch(e){} setMode('roleplay'); }}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'roleplay' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
        >
          Roleplay
        </button>
      </div>

      {mode === 'roleplay' ? (
        <Roleplay />
      ) : (
        <>
          <div className="bg-[#121424] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden mb-8">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <p className="text-sm text-indigo-400 font-bold mb-2 uppercase tracking-widest">Target Sentence</p>
        <p className="text-2xl font-black text-white leading-tight mb-4">
          "{targetSentence?.sentence}"
        </p>
        <p className="text-sm text-slate-400 font-medium mb-6">
          Tarjimasi: {targetSentence?.translation}
        </p>

        <button 
          onClick={playSentence}
          className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-2xl text-indigo-300 font-bold active:scale-95 transition-all"
        >
          <Volume2 className="w-5 h-5" /> Native Speaker'ni Eshitish
        </button>
      </div>

      {!result && (
        <div className="flex flex-col items-center justify-center">
          <p className="text-slate-500 text-sm mb-6 text-center max-w-[250px]">
            Eshitganingizdek talaffuz qilishga harakat qiling. Tayyor bo'lsangiz tugmani bosing.
          </p>

          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
              isRecording 
                ? 'bg-rose-500/20 border-2 border-rose-500 shadow-[0_0_30px_rgba(225,29,72,0.5)] animate-pulse' 
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.4)]'
            }`}
          >
            {isRecording ? (
              <Square className="w-10 h-10 text-rose-500 fill-rose-500" />
            ) : evaluating ? (
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            ) : (
              <Mic className="w-10 h-10 text-white" />
            )}
          </button>
          
          <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
            {isRecording ? 'Yozilmoqda... (To\'xtatish uchun bosing)' : evaluating ? 'Tahlil qilinmoqda...' : 'Bosib gapiring'}
          </p>
        </div>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-3xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 ${result.score >= 80 ? 'border-emerald-500 text-emerald-400' : result.score >= 50 ? 'border-yellow-500 text-yellow-400' : 'border-rose-500 text-rose-400'}`}>
              <span className="text-xl font-black">{result.score}%</span>
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Natija</h3>
              <p className="text-sm text-slate-400">{result.score >= 80 ? 'Ajoyib talaffuz!' : 'Yana mashq qilish kerak.'}</p>
            </div>
          </div>

          <div className="bg-black/20 rounded-2xl p-4 mb-4">
            <p className="text-sm text-slate-300 leading-relaxed">
              {result.feedback}
            </p>
          </div>

          {result.xpEarned ? (
            <div className="flex items-center gap-2 justify-center text-emerald-400 font-bold mb-4">
              <Award className="w-5 h-5" /> +{result.xpEarned} XP berildi
            </div>
          ) : null}

          <button 
            onClick={loadSentence}
            className="w-full py-4 flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl active:scale-95 transition-all"
          >
              Keyingi jumla <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
        </>
      )}
    </div>
  );
}
