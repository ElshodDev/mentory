import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, Loader2, Award, CheckCircle, AlertTriangle } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { apiService } from '../services/api';

interface MockTestTabProps {
  telegramId: number;
  onProfileUpdated: (profile: any) => void;
}

export function MockTestTab({ telegramId, onProfileUpdated }: MockTestTabProps) {
  const [questions, setQuestions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [stage, setStage] = useState<'intro' | 'part1_q1' | 'part1_q2' | 'part2_prep' | 'part2_speak' | 'part3_q1' | 'part3_q2' | 'evaluating' | 'result'>('intro');
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<any>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const allAudioBase64 = useRef<string[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    loadQuestions();
    return () => clearInterval(timerRef.current);
  }, []);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const data = await apiService.getMockTestQuestions();
      setQuestions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const speakText = (text: string) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB'; // British accent for IELTS
    utterance.rate = 0.9;
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
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          allAudioBase64.current.push(base64data);
          handleNextStage();
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      try { WebApp.HapticFeedback.impactOccurred('medium'); } catch(e){}
    } catch (error) {
      WebApp.showAlert("Mikrofonga ruxsat berilmadi!");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleNextStage = () => {
    if (stage === 'part1_q1') {
      setStage('part1_q2');
      speakText(questions.part1[1]);
    } else if (stage === 'part1_q2') {
      setStage('part2_prep');
      startTimer(60, () => setStage('part2_speak')); // 1 min prep
    } else if (stage === 'part2_speak') {
      setStage('part3_q1');
      speakText(questions.part3[0]);
    } else if (stage === 'part3_q1') {
      setStage('part3_q2');
      speakText(questions.part3[1]);
    } else if (stage === 'part3_q2') {
      evaluateTest();
    }
  };

  const startTimer = (seconds: number, onComplete?: () => void) => {
    setTimeLeft(seconds);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (onComplete) onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const evaluateTest = async () => {
    setStage('evaluating');
    try {
      const evalData = await apiService.evaluateMockTest(
        telegramId,
        allAudioBase64.current,
        'audio/webm',
        questions
      );
      setResult(evalData);
      if (evalData.profile) onProfileUpdated(evalData.profile);
      setStage('result');
    } catch (e) {
      WebApp.showAlert("Baholashda xatolik yuz berdi.");
      setStage('intro');
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-4" />
        <p>IELTS savollari tayyorlanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="py-6 pb-24">
      <div className="flex items-center justify-between mb-6 px-2">
        <div>
          <h2 className="text-2xl font-black text-white">Mock IELTS 🎙</h2>
          <p className="text-slate-400 text-sm">Haqiqiy imtihon simulyatori</p>
        </div>
      </div>

      {stage === 'intro' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#121424] border border-white/5 rounded-3xl p-6 text-center">
          <Award className="w-16 h-16 text-purple-500 mx-auto mb-4" />
          <h3 className="text-xl font-black text-white mb-2">Speaking Imtihoni</h3>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Sizni 3 ta qismdan iborat to'liq speaking imtihoni kutmoqda. AI examiner sizga savollar beradi, siz javob yozasiz. Oxirida Band Score olasiz.
          </p>
          <button 
            onClick={() => {
              setStage('part1_q1');
              speakText(questions.part1[0]);
            }}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-2xl active:scale-95 transition-all"
          >
            Imtihonni Boshlash
          </button>
        </motion.div>
      )}

      {(stage.startsWith('part1_') || stage.startsWith('part3_') || stage === 'part2_speak') && (
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex flex-col items-center">
          <div className="bg-[#1a1c2e] border border-purple-500/20 rounded-3xl p-6 w-full text-center mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
            <span className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2 block">
              {stage.includes('part1') ? 'Part 1: Introduction' : stage.includes('part3') ? 'Part 3: Discussion' : 'Part 2: Speak'}
            </span>
            <p className="text-xl font-bold text-white mb-6">
              {stage === 'part1_q1' && questions.part1[0]}
              {stage === 'part1_q2' && questions.part1[1]}
              {stage === 'part3_q1' && questions.part3[0]}
              {stage === 'part3_q2' && questions.part3[1]}
              {stage === 'part2_speak' && "Vaqt ketdi! O'zingizni erkin tutib gapiring."}
            </p>
            
            {stage === 'part2_speak' && (
              <div className="bg-black/20 p-4 rounded-xl text-left mb-6 border border-white/5">
                <h4 className="font-bold text-purple-300 mb-2">{questions.part2.topic}</h4>
                <ul className="text-sm text-slate-300 space-y-1 pl-4 list-disc">
                  {questions.part2.bulletPoints.map((bp: string, i: number) => <li key={i}>{bp}</li>)}
                </ul>
              </div>
            )}

            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-all ${
                isRecording 
                  ? 'bg-rose-500/20 border-2 border-rose-500 shadow-[0_0_30px_rgba(225,29,72,0.5)] animate-pulse' 
                  : 'bg-purple-600 hover:bg-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.4)]'
              }`}
            >
              {isRecording ? <Square className="w-8 h-8 text-rose-500 fill-rose-500" /> : <Mic className="w-8 h-8 text-white" />}
            </button>
            <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
              {isRecording ? 'Yozilmoqda... (Tugatish tugmasini bosing)' : 'Javob berishni boshlash'}
            </p>
          </div>
        </motion.div>
      )}

      {stage === 'part2_prep' && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#121424] border border-white/5 rounded-3xl p-6 text-center">
          <h3 className="text-xl font-black text-purple-400 mb-2">Part 2: Cue Card</h3>
          <p className="text-sm text-slate-400 mb-6">Sizga tayyorlanish uchun 1 daqiqa vaqt beriladi.</p>
          
          <div className="bg-[#1a1c2e] p-6 rounded-2xl text-left mb-8 border border-purple-500/20">
            <h4 className="font-bold text-white text-lg mb-4">{questions.part2.topic}</h4>
            <ul className="text-sm text-slate-300 space-y-2 pl-4 list-disc">
              {questions.part2.bulletPoints.map((bp: string, i: number) => <li key={i}>{bp}</li>)}
            </ul>
          </div>

          <div className="text-5xl font-black text-purple-500 tabular-nums">
            {formatTime(timeLeft)}
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase mt-2 tracking-widest">Tayyorgarlik vaqti</p>
        </motion.div>
      )}

      {stage === 'evaluating' && (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-12 h-12 animate-spin text-purple-500 mb-4" />
          <h3 className="text-lg font-bold text-white">Examiner baholamoqda...</h3>
          <p className="text-sm mt-2 text-center max-w-[250px]">Ovozlaringiz analiz qilinmoqda, bu jarayon 10-20 soniya olishi mumkin.</p>
        </div>
      )}

      {stage === 'result' && result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1a1c2e] border border-purple-500/20 rounded-3xl p-6">
          <div className="text-center border-b border-white/10 pb-6 mb-6">
            <span className="text-sm font-bold text-purple-400 uppercase tracking-widest block mb-2">Overall Band Score</span>
            <div className="text-6xl font-black text-white drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              {result.bandScore}
            </div>
            {result.xpEarned && (
              <div className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold mt-4">
                <Award className="w-3.5 h-3.5" /> +{result.xpEarned} XP
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" /> Examiner Fikri
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed bg-black/20 p-4 rounded-2xl">{result.feedback}</p>
            </div>

            <div>
              <h4 className="font-bold text-emerald-400 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Kuchli jihatlar
              </h4>
              <ul className="text-sm text-slate-300 space-y-2">
                {result.strengths.map((s: string, i: number) => (
                  <li key={i} className="flex gap-2"><span className="text-emerald-500">•</span> {s}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-rose-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Xatolar
              </h4>
              <ul className="text-sm text-slate-300 space-y-2">
                {result.weaknesses.map((w: string, i: number) => (
                  <li key={i} className="flex gap-2"><span className="text-rose-500">•</span> {w}</li>
                ))}
              </ul>
            </div>
          </div>

          <button 
            onClick={() => setStage('intro')}
            className="w-full mt-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl active:scale-95 transition-all"
          >
            Yangi Test Topshirish
          </button>
        </motion.div>
      )}
    </div>
  );
}
