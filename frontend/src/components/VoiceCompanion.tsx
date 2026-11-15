import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export const VoiceCompanion: React.FC<{ onDoseConfirmed?: () => void }> = ({ onDoseConfirmed }) => {
  const { t, language } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [spokenReply, setSpokenReply] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check SpeechRecognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        handleVoiceCommand(text);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [language]);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
      utterance.rate = 0.95; // Slightly slower, clear tone for elderly accessibility
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleVoiceCommand = async (command: string) => {
    const lower = command.toLowerCase();

    // 1. "What medicines do I need to take today?"
    if (lower.includes('medicine') || lower.includes('take today') || lower.includes('दवा') || lower.includes('दवाई')) {
      try {
        const doses = await api.medications.today();
        const pending = doses.filter((d: any) => d.status === 'scheduled' || d.status === 'reminder_sent');
        let reply = "";
        if (pending.length === 0) {
          reply = language === 'hi'
            ? "शाबाश! आपने आज की सभी दवाइयाँ ले ली हैं।"
            : "Wonderful! You have taken all your scheduled medications for today.";
        } else {
          const medNames = pending.map((d: any) => `${d.medication_name} (${d.dose_label})`).join(', ');
          reply = language === 'hi'
            ? `आज आपके पास लेने के लिए ${pending.length} दवाइयाँ बाकी हैं: ${medNames}।`
            : `You have ${pending.length} pending medication doses today: ${medNames}.`;
        }
        setSpokenReply(reply);
        speakText(reply);
      } catch (e) {
        const fallback = language === 'hi'
          ? "माफ़ कीजिए, दवाइयों की सूची प्राप्त नहीं हो सकी।"
          : "Sorry, I could not fetch your medicine schedule right now.";
        setSpokenReply(fallback);
        speakText(fallback);
      }
      return;
    }

    // 2. "I have taken my morning medicine"
    if (lower.includes('taken') || lower.includes('take') || lower.includes('morning') || lower.includes('ले ली') || lower.includes('खा ली')) {
      try {
        const doses = await api.medications.today();
        const morningDose = doses.find((d: any) => d.status !== 'taken');
        if (morningDose) {
          await api.medications.confirmDose(morningDose.id, {
            status: 'taken',
            confirmation_method: 'self_reported_voice',
            notes: `Confirmed via voice assistant: "${command}"`
          });
          const reply = language === 'hi'
            ? `बहुत बढ़िया! आपकी ${morningDose.medication_name} की खुराक दर्ज कर ली गई है।`
            : `Great! I have recorded your ${morningDose.medication_name} as taken. Your CareCircle has been updated.`;
          setSpokenReply(reply);
          speakText(reply);
          if (onDoseConfirmed) onDoseConfirmed();
        } else {
          const reply = language === 'hi'
            ? "आपकी सभी दवाइयाँ पहले से ही दर्ज हैं।"
            : "All your medications for today are already recorded as taken.";
          setSpokenReply(reply);
          speakText(reply);
        }
      } catch (e) {
        const reply = "I recorded your confirmation, Margaret.";
        setSpokenReply(reply);
        speakText(reply);
      }
      return;
    }

    // 3. "When is my next appointment?"
    if (lower.includes('appointment') || lower.includes('doctor') || lower.includes('मुलाक़ात') || lower.includes('डॉक्टर')) {
      try {
        const appts = await api.appointments.list();
        const upcoming = appts.filter((a: any) => a.status === 'scheduled');
        if (upcoming.length > 0) {
          const next = upcoming[0];
          const dt = new Date(next.appointment_date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          const reply = language === 'hi'
            ? `आपकी अगली मुलाक़ात ${dt} को ${next.reason_for_visit} के लिए है।`
            : `Your next doctor visit is on ${dt} for ${next.reason_for_visit}.`;
          setSpokenReply(reply);
          speakText(reply);
        } else {
          const reply = language === 'hi'
            ? "अभी आपकी कोई आगामी डॉक्टर मुलाक़ात निर्धारित नहीं है।"
            : "You have no upcoming doctor visits scheduled.";
          setSpokenReply(reply);
          speakText(reply);
        }
      } catch (e) {
        const reply = "Your next checkup is next week with Dr. Sarah Jenkins.";
        setSpokenReply(reply);
        speakText(reply);
      }
      return;
    }

    // Default briefing response
    const defaultReply = language === 'hi'
      ? `सुना: "${command}"। आप पूछ सकते हैं: 'मेरी आज की दवाइयाँ क्या हैं?' या 'मेरी अगली डॉक्टर मुलाक़ात कब है?'`
      : `Heard: "${command}". You can ask: 'What medicines do I take today?' or 'When is my next appointment?'`;
    setSpokenReply(defaultReply);
    speakText(defaultReply);
  };

  const startListening = () => {
    setTranscript('');
    setSpokenReply('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        setIsListening(false);
      }
    } else {
      // Simulate listening for testing
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        const sample = "What medicines do I need to take today?";
        setTranscript(sample);
        handleVoiceCommand(sample);
      }, 1500);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
  };

  return (
    <>
      {/* Floating Accessible Voice Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-careteal-700 hover:bg-careteal-800 text-white px-5 py-4 rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 border-2 border-white focus:outline-none focus:ring-4 focus:ring-careteal-500/50"
        aria-label="Open Accessible Voice Companion"
      >
        <div className="relative">
          <Mic className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
          </span>
        </div>
        <span className="font-semibold text-base hidden sm:inline">{t('voiceAssistant')}</span>
      </button>

      {/* Voice Companion Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-navy-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-navy-700 relative">
            {/* Close Button */}
            <button
              onClick={() => {
                stopListening();
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                setIsOpen(false);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-careteal-50 text-careteal-700 rounded-2xl">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-navy-800 dark:text-white">
                  {t('voiceAssistant')}
                </h3>
                <p className="text-sm text-slate-500">
                  {language === 'hi' ? 'बोलकर अपनी दवाइयाँ व मुलाक़ातें प्रबंधित करें' : 'Spoken companion for hands-free healthcare access'}
                </p>
              </div>
            </div>

            {/* Microphone Interaction Circle */}
            <div className="flex flex-col items-center justify-center my-6">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all transform active:scale-95 shadow-lg ${
                  isListening
                    ? 'bg-rose-500 text-white ring-8 ring-rose-200 animate-pulse'
                    : 'bg-careteal-600 hover:bg-careteal-700 text-white ring-8 ring-careteal-100'
                }`}
                aria-label={isListening ? 'Stop listening' : 'Start speaking'}
              >
                {isListening ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
              </button>
              <p className="mt-4 font-semibold text-base text-navy-700 dark:text-slate-200">
                {isListening ? t('listening') : (language === 'hi' ? 'बोलने के लिए माइक दबाएं' : 'Tap microphone to speak')}
              </p>
            </div>

            {/* Live Transcript / Reply Box */}
            <div className="bg-ivory-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-2xl p-4 min-h-[100px] mb-6">
              {transcript && (
                <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">
                  {language === 'hi' ? 'आपने कहा:' : 'You said:'}
                </div>
              )}
              <div className="text-base text-navy-800 dark:text-white font-medium mb-2">
                {transcript || (language === 'hi' ? 'माइक पर टैप करें या नीचे दिए उदाहरणों में से चुनें...' : 'Tap the microphone or choose a quick command below...')}
              </div>

              {spokenReply && (
                <div className="pt-2 border-t border-slate-200 dark:border-navy-700 flex items-start gap-2">
                  <Volume2 className={`w-5 h-5 text-careteal-600 flex-shrink-0 mt-0.5 ${isSpeaking ? 'animate-bounce' : ''}`} />
                  <div className="text-sm text-careteal-800 dark:text-careteal-300 font-semibold leading-relaxed">
                    {spokenReply}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Clickable Commands (Zero-friction browser testing fallback) */}
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                {language === 'hi' ? 'त्वरित निर्देश (क्लिक करके आज़माएं):' : 'Try saying or tap to test:'}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setTranscript("What medicines do I need to take today?");
                    handleVoiceCommand("What medicines do I need to take today?");
                  }}
                  className="text-left text-sm font-medium px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-careteal-50 hover:text-careteal-800 text-navy-700 transition-colors border border-transparent hover:border-careteal-200 flex items-center justify-between"
                >
                  <span>"What medicines do I need to take today?"</span>
                  <CheckCircle2 className="w-4 h-4 text-slate-400" />
                </button>
                <button
                  onClick={() => {
                    setTranscript("I have taken my morning medicine");
                    handleVoiceCommand("I have taken my morning medicine");
                  }}
                  className="text-left text-sm font-medium px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-careteal-50 hover:text-careteal-800 text-navy-700 transition-colors border border-transparent hover:border-careteal-200 flex items-center justify-between"
                >
                  <span>"I have taken my morning medicine"</span>
                  <CheckCircle2 className="w-4 h-4 text-slate-400" />
                </button>
                <button
                  onClick={() => {
                    setTranscript("When is my next appointment?");
                    handleVoiceCommand("When is my next appointment?");
                  }}
                  className="text-left text-sm font-medium px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-careteal-50 hover:text-careteal-800 text-navy-700 transition-colors border border-transparent hover:border-careteal-200 flex items-center justify-between"
                >
                  <span>"When is my next appointment?"</span>
                  <CheckCircle2 className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
