import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Loader2, Award, CheckCircle, AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { apiService } from '../services/api';

interface MockTestTabProps {
  telegramId: number;
  onProfileUpdated: (profile: any) => void;
}

type Stage = 
  | 'intro' 
  | 'part1_1_intro' | 'part1_1_q1' | 'part1_1_q2' 
  | 'part1_2_intro' | 'part1_2_q1' | 'part1_2_q2' 
  | 'part2_intro' | 'part2_prep' | 'part2_speak' 
  | 'part3_intro' | 'part3_q1' | 'part3_q2' 
  | 'evaluating' | 'result';

export function MockTestTab({ telegramId, onProfileUpdated }: MockTestTabProps) {
  const [questions, setQuestions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [stage, setStage] = useState<Stage>('intro');
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); // For prep or speaking countdown
  const [result, setResult] = useState<any>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const allAudioBase64 = useRef<string[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    loadQuestions();
    return () => {
      clearInterval(timerRef.current);
    };
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
    utterance.lang = 'en-GB';
    utterance.rate = 0.9;
    synth.speak(utterance);
  };

  const startRecording = async (maxTimeSeconds: number) => {
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
      startCountdown(maxTimeSeconds, () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      });
      
      try { WebApp.HapticFeedback.impactOccurred('medium'); } catch(e){}
    } catch (error) {
      WebApp.showAlert("Mikrofonga ruxsat berilmadi yoki xatolik yuz berdi!");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  const startCountdown = (seconds: number, onComplete?: () => void) => {
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

  const handleNextStage = () => {
    if (stage === 'part1_1_q1') {
      setStage('part1_1_q2');
      speakText(questions.part1_1.questions[1]);
    } else if (stage === 'part1_1_q2') {
      setStage('part1_2_intro');
    } else if (stage === 'part1_2_q1') {
      setStage('part1_2_q2');
      speakText(questions.part1_2.questions[1]);
    } else if (stage === 'part1_2_q2') {
      setStage('part2_intro');
    } else if (stage === 'part2_speak') {
      setStage('part3_intro');
    } else if (stage === 'part3_q1') {
      setStage('part3_q2');
      speakText(questions.part3[1]);
    } else if (stage === 'part3_q2') {
      evaluateTest();
    }
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

  // Determine current active question
  let currentQuestion = '';
  if (stage === 'part1_1_q1') currentQuestion = questions.part1_1.questions[0];
  if (stage === 'part1_1_q2') currentQuestion = questions.part1_1.questions[1];
  if (stage === 'part1_2_q1') currentQuestion = questions.part1_2.questions[0];
  if (stage === 'part1_2_q2') currentQuestion = questions.part1_2.questions[1];
  if (stage === 'part3_q1') currentQuestion = questions.part3[0];
  if (stage === 'part3_q2') currentQuestion = questions.part3[1];
  if (stage === 'part2_speak') currentQuestion = "Start speaking about the topic now. You have 2 minutes.";

  const isTransition = stage.endsWith('_intro');
  const isQuestioning = stage.endsWith('_q1') || stage.endsWith('_q2') || stage === 'part2_speak';

  return (
    <div className="py-6 pb-24">
      <div className="flex items-center justify-between mb-6 px-2">
        <div>
          <h2 className="text-2xl font-black text-white">Mock IELTS 🎙</h2>
          <p className="text-slate-400 text-sm">Haqiqiy imtihon simulyatori</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {stage === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} className="bg-[#121424] border border-white/5 rounded-3xl p-6 text-center">
            <Award className="w-16 h-16 text-purple-500 mx-auto mb-4" />
            <h3 className="text-xl font-black text-white mb-2">Speaking Imtihoni</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Sizni IELTS Speaking bosqichlari bo'yicha to'liq imtihon kutmoqda. Barcha qismlar (Part 1.1, Part 1.2, Part 2, Part 3) qat'iy vaqt chegarasi asosida bo'lib o'tadi.
            </p>
            <button 
              onClick={() => setStage('part1_1_intro')}
              className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-2xl active:scale-95 transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)]"
            >
              Imtihonni Boshlash
            </button>
          </motion.div>
        )}

        {isTransition && (
          <motion.div key={stage} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-gradient-to-tr from-purple-900/40 to-indigo-900/40 border border-purple-500/20 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <Clock className="w-14 h-14 text-purple-400 mx-auto mb-4" />
            
            {stage === 'part1_1_intro' && (
              <>
                <h3 className="text-2xl font-black text-white mb-2">Part 1.1: {questions.part1_1.topic}</h3>
                <p className="text-slate-300 mb-6">Sizga ushbu mavzuda 2 ta qisqa savol beriladi. Har bir javob uchun 40 soniya vaqtingiz bo'ladi.</p>
                <button onClick={() => { setStage('part1_1_q1'); speakText(questions.part1_1.questions[0]); }} className="bg-white text-purple-900 px-8 py-3 rounded-xl font-bold inline-flex items-center gap-2 active:scale-95">
                  Boshlash <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}

            {stage === 'part1_2_intro' && (
              <>
                <h3 className="text-2xl font-black text-white mb-2">Part 1.2: {questions.part1_2.topic}</h3>
                <p className="text-slate-300 mb-6">Endi mavzu o'zgaradi. Sizga yana 2 ta qisqa savol beriladi. Har bir javob uchun 40 soniya.</p>
                <button onClick={() => { setStage('part1_2_q1'); speakText(questions.part1_2.questions[0]); }} className="bg-white text-purple-900 px-8 py-3 rounded-xl font-bold inline-flex items-center gap-2 active:scale-95">
                  Boshlash <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}

            {stage === 'part2_intro' && (
              <>
                <h3 className="text-2xl font-black text-white mb-2">Part 2: Cue Card</h3>
                <p className="text-slate-300 mb-6">Sizga bitta katta mavzu beriladi. Tayyorlanish uchun 1 daqiqa, so'ngra gapirish uchun 2 daqiqa vaqt beriladi.</p>
                <button onClick={() => { setStage('part2_prep'); startCountdown(60, () => setStage('part2_speak')); }} className="bg-white text-purple-900 px-8 py-3 rounded-xl font-bold inline-flex items-center gap-2 active:scale-95">
                  Mavzuni ko'rish <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}

            {stage === 'part3_intro' && (
              <>
                <h3 className="text-2xl font-black text-white mb-2">Part 3: Discussion</h3>
                <p className="text-slate-300 mb-6">Part 2 dagi mavzu asosida chuqurroq muhokama. Har bir savol uchun 60 soniya vaqt.</p>
                <button onClick={() => { setStage('part3_q1'); speakText(questions.part3[0]); }} className="bg-white text-purple-900 px-8 py-3 rounded-xl font-bold inline-flex items-center gap-2 active:scale-95">
                  Boshlash <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </motion.div>
        )}

        {stage === 'part2_prep' && (
          <motion.div key="part2_prep" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
            <div className="bg-[#1a1c2e] border border-amber-500/30 rounded-3xl p-6 w-full text-center mb-6">
              <h3 className="text-xl font-black text-amber-400 mb-2">Tayyorgarlik Vaqti (Part 2)</h3>
              <div className="text-5xl font-black tabular-nums text-amber-300 mb-6">{formatTime(timeLeft)}</div>
              
              <div className="bg-black/30 p-5 rounded-2xl text-left border border-white/5">
                <h4 className="font-bold text-white mb-3 text-lg leading-tight">{questions.part2.topic}</h4>
                <ul className="text-sm text-slate-300 space-y-2 pl-5 list-disc">
                  {questions.part2.bulletPoints.map((bp: string, i: number) => <li key={i}>{bp}</li>)}
                </ul>
              </div>
            </div>
            <button
              onClick={() => {
                setStage('part2_speak');
              }}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-2xl active:scale-95 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]"
            >
              Tayyorman (O'tkazib yuborish)
            </button>
          </motion.div>
        )}

        {isQuestioning && (
          <motion.div key="questioning" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="flex flex-col items-center">
            <div className="bg-[#1a1c2e] border border-purple-500/20 rounded-3xl p-6 w-full text-center mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
              
              <h3 className="text-sm font-black text-purple-400 mb-4 bg-purple-500/10 inline-block px-3 py-1 rounded-full border border-purple-500/20 uppercase tracking-widest">
                {stage.includes('part1_1') && 'Part 1.1'}
                {stage.includes('part1_2') && 'Part 1.2'}
                {stage === 'part2_speak' && 'Part 2'}
                {stage.includes('part3') && 'Part 3'}
              </h3>
              
              {stage === 'part2_speak' ? (
                <div className="bg-black/20 p-4 rounded-xl text-left mb-6 border border-white/5">
                  <h4 className="font-bold text-purple-300 mb-2">{questions.part2.topic}</h4>
                  <ul className="text-xs text-slate-300 space-y-1 pl-4 list-disc">
                    {questions.part2.bulletPoints.map((bp: string, i: number) => <li key={i}>{bp}</li>)}
                  </ul>
                </div>
              ) : (
                <p className="text-xl font-bold text-white mb-8 leading-relaxed">
                  {currentQuestion}
                </p>
              )}

              <button
                onClick={() => {
                  if (isRecording) {
                    stopRecording();
                  } else {
                    let maxTime = 40;
                    if (stage === 'part2_speak') maxTime = 120;
                    if (stage.includes('part3')) maxTime = 60;
                    startRecording(maxTime);
                  }
                }}
                className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center transition-all ${
                  isRecording 
                    ? 'bg-rose-500/20 border-2 border-rose-500 shadow-[0_0_30px_rgba(225,29,72,0.5)] animate-pulse scale-105' 
                    : 'bg-purple-600 hover:bg-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.4)]'
                }`}
              >
                {isRecording ? <Square className="w-10 h-10 text-rose-500 fill-rose-500" /> : <Mic className="w-10 h-10 text-white" />}
              </button>
              
              {isRecording && (
                <div className={`mt-6 text-5xl font-black tabular-nums transition-colors ${timeLeft <= 10 ? 'text-rose-500' : 'text-purple-300'}`}>
                  {formatTime(timeLeft)}
                </div>
              )}
              
              <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                {isRecording ? 'Yozilmoqda... (Vaqt tugasa avtomat to\'xtaydi)' : 'Javob berishni boshlash tugmasini bosing'}
              </p>
            </div>
          </motion.div>
        )}

        {stage === 'evaluating' && (
          <motion.div key="eval" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 flex flex-col items-center text-center">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Javoblar yuborilmoqda...</h3>
            <p className="text-slate-400 text-sm">AI sizning barcha audiolaringizni eshitib baholamoqda. Bu 15-20 soniya vaqt oladi.</p>
          </motion.div>
        )}

        {stage === 'result' && result && (
          <motion.div key="result" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-4">
            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-6 border border-purple-500/30 text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
              <h3 className="text-white font-bold text-lg mb-1">Sizning Natijangiz</h3>
              <div className="text-6xl font-black text-amber-400 my-4 tracking-tighter drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                {result.bandScore}
              </div>
              <p className="text-purple-200 text-sm leading-relaxed">{result.feedback}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-5">
                <h4 className="text-emerald-400 font-black mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Yutuqlar
                </h4>
                <ul className="space-y-2">
                  {result.strengths.map((s: string, i: number) => (
                    <li key={i} className="text-xs text-slate-300 leading-snug flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-0.5">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-5">
                <h4 className="text-rose-400 font-black mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Xatolar
                </h4>
                <ul className="space-y-2">
                  {result.weaknesses.map((s: string, i: number) => (
                    <li key={i} className="text-xs text-slate-300 leading-snug flex items-start gap-1.5">
                      <span className="text-rose-500 mt-0.5">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => {
                setStage('intro');
                setResult(null);
                loadQuestions();
              }}
              className="w-full py-4 mt-2 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all border border-white/10"
            >
              Qayta topshirish
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
