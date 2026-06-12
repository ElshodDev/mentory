import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, RefreshCw, RefreshCcw, CheckCircle } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { apiService } from '../services/api';
import { UserProfile } from '../App';

interface VoiceAITabProps {
  telegramId: number;
  onProfileUpdated: (profile: UserProfile) => void;
}

export function VoiceAITab({ telegramId, onProfileUpdated }: VoiceAITabProps) {
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

  useEffect(() => {
    return () => {
      if (recordingIntervalId) clearInterval(recordingIntervalId);
    };
  }, [recordingIntervalId]);

  const changeVoiceTopic = () => {
    try { WebApp.HapticFeedback.impactOccurred('light'); } catch(e){}
    const currentIndex = voiceTopicsList.indexOf(voiceTopic);
    let nextIndex = Math.floor(Math.random() * voiceTopicsList.length);
    if (nextIndex === currentIndex) {
      nextIndex = (nextIndex + 1) % voiceTopicsList.length;
    }
    setVoiceTopic(voiceTopicsList[nextIndex]);
  };

  const startRecording = async () => {
    try { WebApp.HapticFeedback.impactOccurred('medium'); } catch(e){}
    setVoiceError(null);
    setVoiceAssessmentResult(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          await processAudio(base64Audio);
        };
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setVoiceRecordState('recording');
      setRecordingSeconds(0);
      
      const interval = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
      setRecordingIntervalId(interval);
      
    } catch (err: any) {
      console.error("Microphone access denied:", err);
      setVoiceError("Mikrofonga ruxsat berilmagan. Iltimos brauzer sozlamalarini tekshiring.");
      try { WebApp.HapticFeedback.notificationOccurred('error'); } catch(e){}
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      try { WebApp.HapticFeedback.impactOccurred('medium'); } catch(e){}
      mediaRecorder.stop();
      setVoiceRecordState('processing');
      if (recordingIntervalId) {
        clearInterval(recordingIntervalId);
        setRecordingIntervalId(null);
      }
    }
  };

  const processAudio = async (base64Audio: string) => {
    try {
      const data = await apiService.evaluateVoice(telegramId, base64Audio, 'audio/webm', voiceTopic);
      setVoiceAssessmentResult(data.assessment);
      if (data.profile) onProfileUpdated(data.profile);
      setVoiceRecordState('result');
      try { WebApp.HapticFeedback.notificationOccurred('success'); } catch(e){}
    } catch (err: any) {
      console.error("Audio upload failed:", err);
      setVoiceError(err.message || "Serverga ulanishda xatolik.");
      setVoiceRecordState('idle');
    }
  };

  const resetVoice = () => {
    setVoiceRecordState('idle');
    setVoiceAssessmentResult(null);
    setVoiceError(null);
    setRecordingSeconds(0);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <motion.div key="voice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2 pb-24 flex flex-col items-center">
      <h2 className="text-2xl font-black mb-1.5 flex items-center gap-2 tracking-tight w-full">
        <Mic className="text-rose-400 w-6 h-6 stroke-[2.5px]" /> Voice AI
      </h2>
      <p className="text-xs text-slate-400 mb-6 leading-relaxed w-full">
        IELTS Speaking imtihoniga tayyorgarlik. Ovozli javobingizni yozib oling va AI baholasin.
      </p>

      {/* Topic Card */}
      <div className="w-full bg-[#121424] border border-white/5 rounded-3xl p-5 mb-6 relative">
        <div className="absolute -top-3 right-4 bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Part 2 Topic</div>
        <p className="text-sm font-medium text-slate-200 mt-2 leading-relaxed">{voiceTopic}</p>
        <button onClick={changeVoiceTopic} className="mt-4 flex items-center gap-1.5 text-xs text-rose-400 font-bold hover:text-rose-300 transition-colors bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/10 active:scale-95">
          <RefreshCcw className="w-3.5 h-3.5" /> Boshqa mavzu
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full">
        {voiceError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm text-center w-full">
            {voiceError}
          </div>
        )}

        {voiceRecordState === 'idle' && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startRecording}
            className="w-32 h-32 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 shadow-xl shadow-rose-500/20 flex flex-col items-center justify-center text-white border-4 border-rose-400/30"
          >
            <Mic className="w-12 h-12 mb-1" />
            <span className="text-xs font-bold tracking-widest uppercase opacity-80">Gapiring</span>
          </motion.button>
        )}

        {voiceRecordState === 'recording' && (
          <motion.div className="flex flex-col items-center">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-32 h-32 rounded-full bg-rose-500/20 flex flex-col items-center justify-center border border-rose-500/50 mb-4"
            >
              <div className="w-20 h-20 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-rose-500/50">
                <span className="text-xl font-black">{formatTime(recordingSeconds)}</span>
              </div>
            </motion.div>
            <button
              onClick={stopRecording}
              className="px-8 py-3 bg-white text-rose-600 font-black rounded-2xl shadow-xl active:scale-95 transition-all"
            >
              To'xtatish
            </button>
          </motion.div>
        )}

        {voiceRecordState === 'processing' && (
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
              <RefreshCw className="w-10 h-10 text-rose-500 animate-spin" />
            </div>
            <p className="text-rose-400 font-bold text-sm animate-pulse">Ovoz tahlil qilinmoqda...</p>
            <p className="text-xs text-slate-500 mt-2 text-center max-w-[250px]">Gemini AI sizning talaffuzingiz va ravonligingizni tekshirmoqda</p>
          </div>
        )}

        {voiceRecordState === 'result' && voiceAssessmentResult && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full text-left space-y-4">
            <div className="bg-gradient-to-br from-[#121424] to-[#1a1d36] border border-rose-500/20 p-5 rounded-3xl shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-white text-lg">AI Xulosasi</h3>
                <div className="bg-rose-500/20 px-3 py-1.5 rounded-xl border border-rose-500/30">
                  <span className="text-rose-400 font-black text-xs">Band Score: </span>
                  <span className="text-white font-black text-sm">{voiceAssessmentResult.bandScore || 'N/A'}</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Siz aytdingiz:</h4>
                  <p className="text-sm text-slate-300 italic bg-black/20 p-3 rounded-2xl border border-white/5 leading-relaxed">"{voiceAssessmentResult.transcript}"</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Pronunciation</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{voiceAssessmentResult.pronunciation}</p>
                  </div>
                  <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Fluency</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{voiceAssessmentResult.fluency}</p>
                  </div>
                </div>

                {voiceAssessmentResult.corrections && voiceAssessmentResult.corrections.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Corrections & Improvements</h4>
                    <div className="space-y-2">
                      {voiceAssessmentResult.corrections.map((corr: any, i: number) => (
                        <div key={i} className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl">
                          <p className="text-xs text-slate-400 line-through decoration-red-500/50 mb-1">{corr.original}</p>
                          <p className="text-sm text-white font-medium mb-1.5 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> {corr.corrected}</p>
                          <p className="text-[10px] text-amber-400/80 leading-relaxed">{corr.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button onClick={resetVoice} className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-bold text-sm active:scale-95 transition-all">
              Yangi test boshlash
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
