import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Loader2, Coffee, Briefcase, Plane, ArrowLeft, Volume2 } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { apiService } from '../services/api';

const SCENARIOS = [
  { id: 'cafe', title: "Kafeda buyurtma", icon: <Coffee className="w-6 h-6" />, desc: "Barista bilan qahva va shirinliklar haqida suhbat.", bg: "from-amber-500/20 to-orange-500/20" },
  { id: 'interview', title: "Ish suhbati", icon: <Briefcase className="w-6 h-6" />, desc: "HR menejer bilan suhbatdan o'ting.", bg: "from-blue-500/20 to-cyan-500/20" },
  { id: 'airport', title: "Aeroportda", icon: <Plane className="w-6 h-6" />, desc: "Bojxona yoki ro'yxatdan o'tish jarayoni.", bg: "from-indigo-500/20 to-purple-500/20" }
];

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  feedback?: string;
}

export function Roleplay() {
  const [scenario, setScenario] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startScenario = (id: string) => {
    try { WebApp.HapticFeedback.impactOccurred('light'); } catch(e){}
    setScenario(id);
    setMessages([]);
  };

  const playTTS = (text: string) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
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
        await processTurn(blob);
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

  const processTurn = async (blob: Blob) => {
    setEvaluating(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(',')[1];
        const scenarioTitle = SCENARIOS.find(s => s.id === scenario)?.title || scenario;
        
        const historyForApi = messages.map(m => ({ role: m.role, text: m.text }));
        
        const turnData = await apiService.evaluateRoleplayTurn(
          base64data,
          'audio/webm',
          scenarioTitle!,
          historyForApi
        );

        const newMessages = [...messages];
        newMessages.push({
          id: Date.now().toString(),
          role: 'user',
          text: turnData.userTranscript,
          feedback: turnData.feedbackUz
        });

        newMessages.push({
          id: (Date.now() + 1).toString(),
          role: 'ai',
          text: turnData.aiResponse
        });

        setMessages(newMessages);
        playTTS(turnData.aiResponse);
      };
    } catch (e) {
      WebApp.showAlert("Ovozni tahlil qilishda xatolik yuz berdi.");
    } finally {
      setEvaluating(false);
    }
  };

  if (!scenario) {
    return (
      <div className="space-y-4 animate-fade-in">
        <p className="text-slate-400 text-sm mb-6">Suhbat qurish uchun vaziyatni tanlang:</p>
        {SCENARIOS.map(s => (
          <button 
            key={s.id}
            onClick={() => startScenario(s.id)}
            className="w-full text-left bg-[#121424] border border-white/5 rounded-3xl p-5 shadow-xl relative overflow-hidden active:scale-95 transition-transform"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${s.bg} rounded-full blur-3xl opacity-50`}></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                {s.icon}
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-1">{s.title}</h3>
                <p className="text-slate-400 text-xs">{s.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  }

  const currentScenario = SCENARIOS.find(s => s.id === scenario);

  return (
    <div className="flex flex-col h-[60vh]">
      <div className="flex items-center gap-3 mb-4 bg-white/5 p-3 rounded-2xl border border-white/5">
        <button 
          onClick={() => setScenario(null)}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h3 className="font-bold text-white text-sm">{currentScenario?.title}</h3>
          <p className="text-[10px] text-emerald-400">Online</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-hide p-2">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 text-sm mt-10">
            Suhbatni boshlash uchun gapiring...
          </div>
        )}
        
        <AnimatePresence>
          {messages.map((m) => (
            <motion.div 
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div 
                className={`max-w-[80%] p-3 rounded-2xl ${
                  m.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-sm' 
                    : 'bg-slate-800 text-white rounded-tl-sm'
                }`}
              >
                <p className="text-sm">{m.text}</p>
                {m.role === 'ai' && (
                  <button onClick={() => playTTS(m.text)} className="mt-2 text-slate-400 hover:text-white">
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {m.role === 'user' && m.feedback && m.feedback !== "Hammasi zo'r!" && (
                <p className="text-[10px] text-rose-400 mt-1 max-w-[80%] text-right bg-rose-500/10 px-2 py-1 rounded-lg">
                  {m.feedback}
                </p>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex flex-col items-center justify-center shrink-0">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={evaluating}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
            isRecording 
              ? 'bg-rose-500/20 border-2 border-rose-500 shadow-[0_0_30px_rgba(225,29,72,0.5)] animate-pulse' 
              : evaluating
                ? 'bg-slate-800 opacity-50 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.4)]'
          }`}
        >
          {isRecording ? (
            <Square className="w-6 h-6 text-rose-500 fill-rose-500" />
          ) : evaluating ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </button>
        <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {isRecording ? 'Yozilmoqda...' : evaluating ? 'Tahlil...' : 'Gapiring'}
        </p>
      </div>
    </div>
  );
}
