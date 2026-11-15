export interface Translations {
  [key: string]: {
    en: string;
    hi: string;
  };
}

export const translations: Translations = {
  // Brand & Philosophy
  appName: {
    en: "CareCircle",
    hi: "केयरसर्कल"
  },
  appTagline: {
    en: "Independence first. Assistance when needed. Intervention when necessary.",
    hi: "आत्मनिर्भरता पहले। आवश्यकता पड़ने पर सहायता। जरूरी होने पर हस्तक्षेप।"
  },
  
  // Navigation
  navHome: {
    en: "Home",
    hi: "मुख्य पृष्ठ"
  },
  navMedicines: {
    en: "My Medicines",
    hi: "मेरी दवाइयाँ"
  },
  navAppointments: {
    en: "Appointments",
    hi: "डॉक्टर मुलाक़ात"
  },
  navHealth: {
    en: "My Health",
    hi: "मेरा स्वास्थ्य"
  },
  navCareCircle: {
    en: "My CareCircle",
    hi: "मेरा केयरसर्कल"
  },
  navPrescriptionOCR: {
    en: "Prescription OCR",
    hi: "पर्चा स्कैन (OCR)"
  },
  navIntelligence: {
    en: "Care Intelligence",
    hi: "स्वास्थ्य विश्लेषण"
  },
  navNotifications: {
    en: "Mailbox & Alerts",
    hi: "सूचनाएं व मेल"
  },
  navCaretaker: {
    en: "Caretaker Station",
    hi: "देखभालकर्ता डैशबोर्ड"
  },
  navFamily: {
    en: "Family Overview",
    hi: "परिवार अवलोकन"
  },

  // Greetings & Briefing
  greetingMorning: {
    en: "Good Morning",
    hi: "सुप्रभात"
  },
  greetingAfternoon: {
    en: "Good Afternoon",
    hi: "नमस्कार"
  },
  greetingEvening: {
    en: "Good Evening",
    hi: "शुभ संध्या"
  },
  dailyBriefingTitle: {
    en: "Today's Healthcare Briefing",
    hi: "आज का स्वास्थ्य विवरण"
  },
  speakBriefing: {
    en: "Read Aloud",
    hi: "बोलकर सुनाएं"
  },

  // Medication Status
  statusScheduled: {
    en: "Scheduled",
    hi: "निर्धारित"
  },
  statusReminderSent: {
    en: "Reminder Sent",
    hi: "याद दिलाया गया"
  },
  statusTaken: {
    en: "Taken",
    hi: "दवा ले ली"
  },
  statusDelayed: {
    en: "Delayed",
    hi: "देर से ली"
  },
  statusMissed: {
    en: "Missed",
    hi: "छूट गई"
  },
  statusSkipped: {
    en: "Skipped",
    hi: "छोड़ दी"
  },
  statusUnconfirmed: {
    en: "Unconfirmed",
    hi: "अपुष्ट"
  },

  // Actions
  confirmTakenBtn: {
    en: "I Have Taken This",
    hi: "मैंने यह दवा ले ली"
  },
  confirmAssistedBtn: {
    en: "Verify Intake (Caretaker)",
    hi: "सेवन सत्यापित करें"
  },
  addMedication: {
    en: "Add New Medicine",
    hi: "नई दवा जोड़ें"
  },
  scheduleAppointment: {
    en: "Book Appointment",
    hi: "मुलाक़ात तय करें"
  },
  downloadReport: {
    en: "Download Health Report",
    hi: "स्वास्थ्य रिपोर्ट डाउनलोड करें"
  },
  generatePreBriefing: {
    en: "Doctor Pre-Briefing",
    hi: "डॉक्टर के लिए सारांश"
  },

  // Voice Interaction
  voiceAssistant: {
    en: "Voice Assistant",
    hi: "आवाज़ सहायक"
  },
  listening: {
    en: "Listening... speak now",
    hi: "सुन रहा हूँ... बोलिए"
  },
  voicePlaceholder: {
    en: "Ask: 'What medicines do I take today?' or 'I have taken my morning medicine'",
    hi: "पूछें: 'आज मुझे कौन सी दवाइयाँ लेनी हैं?' या 'मैंने सुबह की दवा ले ली'"
  },

  // Accessibility Controls
  fontSize: {
    en: "Font Size",
    hi: "अक्षर आकार"
  },
  highContrast: {
    en: "High Contrast",
    hi: "उच्च कंट्रास्ट"
  },
  roleSwitch: {
    en: "Demo Role Switcher",
    hi: "भूमिका बदलें (डेमो)"
  }
};

export const getTranslation = (key: string, lang: "en" | "hi" = "en"): string => {
  if (translations[key] && translations[key][lang]) {
    return translations[key][lang];
  }
  return key;
};
