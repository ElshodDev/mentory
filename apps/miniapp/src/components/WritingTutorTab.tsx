import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Edit, RefreshCw } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { apiService } from '../services/api';

interface WritingTutorTabProps {}

export function WritingTutorTab({}: WritingTutorTabProps) {
  const [writingMessage, setWritingMessage] = useState('');
  const [writingChat, setWritingChat] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    { sender: 'ai', text: "Salom! Men sizning shaxsiy Writing yordamchingizman. Bekzod's Multilevel formatidagi Task 1.1, Task 1.2 yoki Task 2 bo'yicha savollaringizni bering yoki yozgan javobingizni tekshirish uchun yuboring!" }
  ]);
  const [loadingWriting, setLoadingWriting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [writingChat]);

  const sendWritingMessage = async () => {
    if (!writingMessage.trim()) return;
    try { WebApp.HapticFeedback.impactOccurred('light'); } catch(e){}
    
    const userMsg = writingMessage.trim();
    setWritingMessage('');
    setWritingChat(prev => [...prev, { sender: 'user', text: userMsg }]);
    setLoadingWriting(true);

    try {
      const data = await apiService.chatWriting(userMsg);
      setWritingChat(prev => [...prev, { sender: 'ai', text: data.reply }]);
      try { WebApp.HapticFeedback.notificationOccurred('success'); } catch(e){}
    } catch (e) {
      console.error("Error sending writing msg:", e);
      setWritingChat(prev => [...prev, { sender: 'ai', text: "Uzur, xatolik yuz berdi. Qayta urinib ko'ring." }]);
    } finally {
      setLoadingWriting(false);
    }
  };

  return (
    <motion.div key="writing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2 pb-24 flex flex-col h-[80vh]">
      <h2 className="text-2xl font-black mb-1.5 flex items-center gap-2 tracking-tight">
        <Edit className="text-emerald-400 w-6 h-6 stroke-[2.5px]" /> Writing Tutor
      </h2>
      <p className="text-xs text-slate-400 mb-4 leading-relaxed">
        IELTS va CEFR uchun esselaringizni tekshiring yoki yozish bo'yicha maslahatlar oling.
      </p>

      <div className="flex-1 bg-[#121424] border border-white/5 rounded-3xl p-4 overflow-y-auto mb-4 space-y-4">
        {writingChat.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm font-medium leading-relaxed shadow-lg ${
              msg.sender === 'user' 
                ? 'bg-emerald-600 text-white rounded-br-sm' 
                : 'bg-white/5 text-slate-200 border border-white/5 rounded-bl-sm whitespace-pre-wrap'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loadingWriting && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl rounded-bl-sm">
              <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="flex gap-2">
        <input 
          type="text" 
          value={writingMessage}
          onChange={(e) => setWritingMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendWritingMessage()}
          placeholder="Esse yoki savolingizni yozing..."
          className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-all"
        />
        <button 
          onClick={sendWritingMessage}
          disabled={loadingWriting || !writingMessage.trim()}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white p-3.5 rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
        >
          <Edit className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}
