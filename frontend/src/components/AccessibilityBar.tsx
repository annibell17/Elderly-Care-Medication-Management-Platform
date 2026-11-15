import React from 'react';
import { Eye, Type, Globe, UserCheck, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AccessibilityBar: React.FC = () => {
  const {
    currentRole,
    switchRole,
    language,
    setLanguage,
    fontSize,
    setFontSize,
    isHighContrast,
    toggleHighContrast,
    user
  } = useAuth();

  return (
    <div role="region" aria-label="Accessibility controls" className="bg-navy-900 text-slate-200 text-xs sm:text-sm py-2 px-4 sm:px-6 border-b border-navy-800 shadow-sm no-print">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Core Philosophy Banner */}
        <div className="hidden lg:flex items-center gap-2 text-careteal-100 font-medium text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Core Philosophy: <em>"Independence first. Assistance when needed. Intervention when necessary."</em></span>
        </div>

        {/* Right Accessibility & Role Controls */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 ml-auto">
          {/* Hackathon Role Switcher */}
          <div className="flex items-center bg-navy-800 rounded-lg p-0.5 border border-navy-700">
            <span className="text-[11px] font-bold text-slate-400 px-2 uppercase tracking-wider hidden sm:inline">Role:</span>
            <button
              onClick={() => switchRole('elderly')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                currentRole === 'elderly'
                  ? 'bg-careteal-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-navy-700'
              }`}
              title="View as Margaret Sharma (Elderly individual)"
            >
              <span>🧓 Margaret (Elderly)</span>
            </button>
            <button
              onClick={() => switchRole('caretaker')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                currentRole === 'caretaker'
                  ? 'bg-careteal-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-navy-700'
              }`}
              title="View as Anita Devi (Assigned caretaker)"
            >
              <span>👩‍⚕️ Anita (Caretaker)</span>
            </button>
            <button
              onClick={() => switchRole('family')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                currentRole === 'family_member'
                  ? 'bg-careteal-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-navy-700'
              }`}
              title="View as Rohan Sharma (Family member)"
            >
              <span>👨‍💼 Rohan (Family)</span>
            </button>
          </div>

          {/* Font Size Adjuster */}
          <div className="flex items-center gap-1 bg-navy-800 rounded-lg p-0.5 border border-navy-700" title="Adjust Typography Size">
            <Type className="w-3.5 h-3.5 ml-1.5 text-slate-400 hidden sm:inline" />
            <button
              onClick={() => setFontSize('normal')}
              className={`px-2 py-0.5 rounded text-xs font-bold ${fontSize === 'normal' ? 'bg-careteal-700 text-white' : 'text-slate-300 hover:text-white'}`}
            >
              A
            </button>
            <button
              onClick={() => setFontSize('large')}
              className={`px-2 py-0.5 rounded text-xs font-bold ${fontSize === 'large' ? 'bg-careteal-700 text-white' : 'text-slate-300 hover:text-white'}`}
            >
              A+
            </button>
            <button
              onClick={() => setFontSize('xlarge')}
              className={`px-2 py-0.5 rounded text-xs font-bold ${fontSize === 'xlarge' ? 'bg-careteal-700 text-white' : 'text-slate-300 hover:text-white'}`}
            >
              A++
            </button>
          </div>

          {/* High Contrast Mode Toggle */}
          <button
            onClick={toggleHighContrast}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
              isHighContrast
                ? 'bg-amber-400 text-black border-amber-300 font-bold'
                : 'bg-navy-800 border-navy-700 text-slate-300 hover:text-white hover:bg-navy-700'
            }`}
            title="Toggle High Contrast for Visual Accessibility"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Contrast</span>
          </button>

          {/* Multilingual English / Hindi Switcher */}
          <div className="flex items-center bg-navy-800 rounded-lg p-0.5 border border-navy-700">
            <Globe className="w-3.5 h-3.5 ml-1.5 text-slate-400" />
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-0.5 rounded text-xs font-semibold ${language === 'en' ? 'bg-careteal-700 text-white' : 'text-slate-300 hover:text-white'}`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('hi')}
              className={`px-2 py-0.5 rounded text-xs font-semibold ${language === 'hi' ? 'bg-careteal-700 text-white' : 'text-slate-300 hover:text-white'}`}
            >
              हिंदी
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
