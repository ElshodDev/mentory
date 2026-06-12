import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Headphones, BrainCircuit, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);

  const slides = [
    {
      title: "Smart Reading",
      desc: "Qiziqarli matnlarni o'qing. Noma'lum so'zni bosing, AI o'sha zahoti tarjima qilib lug'atga saqlaydi.",
      icon: <BookOpen className="w-16 h-16 text-indigo-400" />,
      color: "from-indigo-500/20 to-indigo-900/40"
    },
    {
      title: "Interactive Listening",
      desc: "YouTube videolar ko'ring. Ekranda chiqadigan so'zlarni bosib tarjimasini bilib oling va lug'atga yig'ing.",
      icon: <Headphones className="w-16 h-16 text-rose-400" />,
      color: "from-rose-500/20 to-rose-900/40"
    },
    {
      title: "AI Bilan Mashqlar",
      desc: "Lug'at yodlang, Mock IELTS topshiring va Speaking darajangizni AI examiner yordamida tekshiring.",
      icon: <BrainCircuit className="w-16 h-16 text-amber-400" />,
      color: "from-amber-500/20 to-amber-900/40"
    }
  ];

  const handleNext = () => {
    try { WebApp.HapticFeedback.impactOccurred('light'); } catch (e) {}
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('mentory_onboarding', 'done');
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#090a12] flex flex-col items-center justify-center p-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="flex flex-col items-center text-center max-w-sm w-full"
        >
          <div className={`w-32 h-32 rounded-full bg-gradient-to-tr ${slides[step].color} flex items-center justify-center mb-8 shadow-2xl`}>
            {slides[step].icon}
          </div>
          
          <h2 className="text-3xl font-black text-white mb-4 tracking-tight">
            {slides[step].title}
          </h2>
          
          <p className="text-slate-400 leading-relaxed text-[15px] mb-12">
            {slides[step].desc}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-10 left-0 right-0 px-6 flex flex-col items-center">
        <div className="flex gap-2 mb-8">
          {slides.map((_, i) => (
            <div 
              key={i} 
              className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-indigo-500' : 'w-2 bg-white/20'}`}
            />
          ))}
        </div>

        <button 
          onClick={handleNext}
          className="w-full max-w-sm bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-white/10"
        >
          {step === slides.length - 1 ? (
            <>Boshladik <Sparkles className="w-5 h-5" /></>
          ) : (
            <>Keyingisi <ArrowRight className="w-5 h-5" /></>
          )}
        </button>
      </div>
    </div>
  );
}
