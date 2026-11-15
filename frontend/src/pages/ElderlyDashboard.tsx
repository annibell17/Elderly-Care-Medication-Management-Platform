import React, { useState, useEffect } from 'react';
import {
  Volume2, CheckCircle2, Clock, AlertTriangle, Calendar, Users,
  Plus, ChevronRight, Pill, ArrowRight, ShieldCheck, Heart, Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { VoiceCompanion } from '../components/VoiceCompanion';

export const ElderlyDashboard: React.FC = () => {
  const { t, language, user } = useAuth();
  const [todayDoses, setTodayDoses] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [networkMembers, setNetworkMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [dosesData, apptData, analyticsData, membersData] = await Promise.all([
        api.medications.today().catch(() => []),
        api.appointments.list().catch(() => []),
        api.intelligence.analytics(14).catch(() => null),
        api.careNetwork.members().catch(() => [])
      ]);
      setTodayDoses(dosesData);
      setAppointments(apptData);
      setAnalytics(analyticsData);
      setNetworkMembers(membersData);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfirmDose = async (doseId: string) => {
    setConfirmingId(doseId);
    try {
      await api.medications.confirmDose(doseId, {
        status: 'taken',
        confirmation_method: 'self_reported_web',
        notes: 'Confirmed via one-tap Elderly Home button'
      });
      await fetchData();
    } catch (err) {
      console.error("Confirm dose error:", err);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleSpeakBriefing = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const pendingCount = todayDoses.filter(d => d.status !== 'taken').length;
      const text = language === 'hi'
        ? `सुप्रभात मार्गरेट। आज आपकी ${todayDoses.length} दवाइयाँ निर्धारित हैं, जिनमें से ${pendingCount} दवाइयाँ लेना बाकी हैं। आपका केयरसर्कल सक्रिय है।`
        : `Good morning Margaret. Today you have ${todayDoses.length} scheduled medications. You have ${pendingCount} pending doses remaining. Your CareCircle is actively connected.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Find next upcoming dose
  const nextDose = todayDoses.find(d => d.status === 'scheduled' || d.status === 'reminder_sent');
  const nextAppt = appointments.find(a => a.status === 'scheduled');
  const pendingCount = todayDoses.filter(d => d.status !== 'taken').length;
  const takenCount = todayDoses.filter(d => d.status === 'taken').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* 1. Header Greeting & Date */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 border border-ivory-200 dark:border-navy-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-careteal-700 dark:text-careteal-400 font-bold text-sm uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-800 dark:text-white tracking-tight">
            {t('greetingMorning')}, <span className="text-careteal-700 dark:text-careteal-400">{user?.full_name?.split(' ')[0] || 'Margaret'}</span>
          </h1>
          <p className="text-slate-500 text-base sm:text-lg mt-1 font-medium">
            {language === 'hi' ? 'आपका व्यक्तिगत स्वास्थ्य एवं देखभाल केंद्र' : 'Your personal healthcare home and independent care coordination'}
          </p>
        </div>

        {/* Read Daily Briefing Aloud Action */}
        <button
          onClick={handleSpeakBriefing}
          className="flex items-center gap-3 bg-careteal-50 hover:bg-careteal-100 text-careteal-800 border-2 border-careteal-200 px-5 py-3.5 rounded-2xl font-bold text-base transition-all transform hover:scale-[1.02] shadow-sm self-start md:self-center"
          title="Speak briefing aloud using text-to-speech"
        >
          <Volume2 className="w-6 h-6 text-careteal-700" />
          <span>{t('speakBriefing')}</span>
        </button>
      </div>

      {/* 2. Today's Healthcare Briefing Card */}
      <div className="bg-gradient-to-r from-careteal-700 via-careteal-800 to-navy-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-careteal-100 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>{t('dailyBriefingTitle')}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-snug">
              {pendingCount === 0
                ? (language === 'hi' ? 'शानदार! आपकी आज की सभी दवाइयाँ पूरी हो चुकी हैं।' : 'All set! You have taken all your scheduled medications for today.')
                : (language === 'hi' ? `आज आपको कुल ${todayDoses.length} में से ${pendingCount} दवाइयाँ और लेनी हैं।` : `You have ${pendingCount} medication dose${pendingCount > 1 ? 's' : ''} remaining to take today.`)}
            </h2>
            <p className="text-careteal-100 text-base">
              {nextAppt
                ? (language === 'hi' ? `आगामी मुलाक़ात: ${nextAppt.reason_for_visit} (${new Date(nextAppt.appointment_date).toLocaleDateString()})` : `Next appointment: ${nextAppt.reason_for_visit} on ${new Date(nextAppt.appointment_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`)
                : 'No doctor visits scheduled for today. Rest well.'}
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 self-start lg:self-center">
            <div className="text-center px-4 border-r border-white/20">
              <div className="text-3xl font-black text-emerald-300">{takenCount}</div>
              <div className="text-xs uppercase font-bold text-careteal-100 tracking-wider">Taken</div>
            </div>
            <div className="text-center px-4">
              <div className="text-3xl font-black text-amber-300">{pendingCount}</div>
              <div className="text-xs uppercase font-bold text-careteal-100 tracking-wider">Remaining</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Next Medication Reminder & Quick Confirmation Callout */}
      {nextDose && (
        <div className="bg-amber-50/80 dark:bg-navy-800 border-2 border-amber-300 dark:border-amber-500/30 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-md">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                Next Upcoming Medicine
              </div>
              <h3 className="text-2xl font-bold text-navy-800 dark:text-white mt-0.5">
                {nextDose.medication_name} <span className="text-base text-slate-500">({nextDose.dosage_strength})</span>
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-base mt-1">
                <strong>Scheduled:</strong> {new Date(nextDose.scheduled_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} • {nextDose.instructions || 'Take as prescribed'}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleConfirmDose(nextDose.id)}
            disabled={confirmingId === nextDose.id}
            className="w-full md:w-auto px-8 py-4 rounded-2xl bg-careteal-600 hover:bg-careteal-700 text-white font-extrabold text-lg flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] border-2 border-white"
          >
            <CheckCircle2 className="w-6 h-6" />
            <span>{confirmingId === nextDose.id ? 'Recording...' : t('confirmTakenBtn')}</span>
          </button>
        </div>
      )}

      {/* 4. Main Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Today's Full Schedule (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-careteal-50 dark:bg-navy-800 rounded-xl text-careteal-700">
                <Pill className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-extrabold text-navy-800 dark:text-white">
                Today's Medicine Schedule
              </h2>
            </div>
            <Link
              to="/my-medicines"
              className="text-sm font-bold text-careteal-700 hover:text-careteal-800 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Doses Cards */}
          <div className="space-y-4">
            {todayDoses.length === 0 ? (
              <div className="bg-white dark:bg-navy-900 rounded-3xl p-8 text-center border border-slate-200 text-slate-500">
                No medications scheduled for today.
              </div>
            ) : (
              todayDoses.map((dose) => {
                const isTaken = dose.status === 'taken';
                const isUnconfirmed = dose.status === 'unconfirmed';
                return (
                  <div
                    key={dose.id}
                    className={`rounded-2xl p-5 sm:p-6 transition-all border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isTaken
                        ? 'bg-emerald-50/50 dark:bg-navy-900/60 border-emerald-200 dark:border-emerald-800/40'
                        : isUnconfirmed
                        ? 'bg-rose-50/60 dark:bg-navy-900/60 border-rose-300 dark:border-rose-800/40'
                        : 'bg-white dark:bg-navy-900 border-slate-200 dark:border-navy-700 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Color indicator pip */}
                      <div
                        className="w-4 h-16 rounded-full flex-shrink-0"
                        style={{ backgroundColor: dose.color_code || '#0D9488' }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-navy-800 dark:text-white">
                            {dose.medication_name}
                          </span>
                          <span className="text-sm font-semibold text-slate-500">
                            {dose.dosage_strength}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                          {dose.dose_label} • {dose.instructions}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isTaken
                                ? 'bg-emerald-100 text-emerald-800'
                                : isUnconfirmed
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isTaken && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {isUnconfirmed && <AlertTriangle className="w-3.5 h-3.5" />}
                            {t(`status${dose.status.charAt(0).toUpperCase() + dose.status.slice(1)}`) || dose.status}
                          </span>
                          {dose.confirmation_method && (
                            <span className="text-xs text-slate-400">
                              (via {dose.confirmation_method.replace('_', ' ')})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action button */}
                    {!isTaken ? (
                      <button
                        onClick={() => handleConfirmDose(dose.id)}
                        disabled={confirmingId === dose.id}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-careteal-600 hover:bg-careteal-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{confirmingId === dose.id ? 'Updating...' : t('confirmTakenBtn')}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm bg-emerald-100/70 px-4 py-2 rounded-xl">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Confirmed Taken</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Appointments & CareCircle Status (1 Col) */}
        <div className="space-y-6">
          {/* Upcoming Appointment Card */}
          <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 border border-slate-200 dark:border-navy-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-navy-800 dark:text-white font-bold text-lg">
                <Calendar className="w-5 h-5 text-careteal-600" />
                <span>Next Doctor Visit</span>
              </div>
              <Link to="/appointments" className="text-xs font-bold text-careteal-700 hover:underline">
                View All
              </Link>
            </div>

            {nextAppt ? (
              <div className="bg-ivory-50 dark:bg-navy-800 p-4 rounded-2xl border border-ivory-200 dark:border-navy-700 space-y-3">
                <div className="font-bold text-base text-navy-800 dark:text-white">
                  {nextAppt.reason_for_visit}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  📅 {new Date(nextAppt.appointment_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-xs text-slate-500">
                  📍 {nextAppt.location_details || 'City Health Center'}
                </div>
                <Link
                  to={`/appointments`}
                  className="block w-full text-center py-2.5 rounded-xl bg-white dark:bg-navy-700 text-careteal-700 dark:text-careteal-300 font-bold text-xs border border-slate-200 dark:border-navy-600 hover:bg-careteal-50"
                >
                  Generate Doctor Briefing →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No appointments scheduled.</p>
            )}
          </div>

          {/* Connected CareCircle Status */}
          <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 border border-slate-200 dark:border-navy-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-navy-800 dark:text-white font-bold text-lg">
                <Users className="w-5 h-5 text-careteal-600" />
                <span>My CareCircle</span>
              </div>
              <Link to="/care-circle" className="text-xs font-bold text-careteal-700 hover:underline">
                Manage
              </Link>
            </div>

            <div className="space-y-3">
              {networkMembers.length === 0 ? (
                <p className="text-sm text-slate-500">No members invited yet.</p>
              ) : (
                networkMembers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-2xl bg-ivory-50 dark:bg-navy-800 border border-ivory-200 dark:border-navy-700">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-careteal-100 text-careteal-700 font-bold flex items-center justify-center text-sm">
                        {m.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-navy-800 dark:text-white">{m.full_name}</div>
                        <div className="text-xs text-slate-500">{m.relationship_label}</div>
                      </div>
                    </div>
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" title="Active Connection" />
                  </div>
                ))
              )}
            </div>

            <Link
              to="/care-circle"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-dashed border-careteal-300 text-careteal-700 font-bold text-xs hover:bg-careteal-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Invite Family or Caretaker</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Voice Assistant Floating Widget */}
      <VoiceCompanion onDoseConfirmed={fetchData} />
    </div>
  );
};
