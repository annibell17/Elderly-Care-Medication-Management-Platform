import React, { useState, useEffect } from 'react';
import {
  Users, Heart, CheckCircle2, AlertTriangle, Calendar, Activity,
  Clock, ShieldCheck, FileText, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const FamilyDashboard: React.FC = () => {
  const { user } = useAuth();
  const [todayDoses, setTodayDoses] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [handoverLogs, setHandoverLogs] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [doses, appts, obs, logs, an] = await Promise.all([
          api.medications.today(),
          api.appointments.list(),
          api.careNetwork.observations(),
          api.careNetwork.handoverLogs(),
          api.intelligence.analytics(14)
        ]);
        setTodayDoses(doses);
        setAppointments(appts);
        setObservations(obs);
        setHandoverLogs(logs);
        setAnalytics(an);
      } catch (err) {
        console.error("Family fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const takenCount = todayDoses.filter(d => d.status === 'taken').length;
  const nextAppt = appointments.find(a => a.status === 'scheduled');
  const latestLog = handoverLogs[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Family Header */}
      <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 border border-ivory-200 dark:border-navy-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-careteal-700 dark:text-careteal-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Family Caregiver Overview</span>
          </div>
          <h1 className="text-3xl font-extrabold text-navy-800 dark:text-white">
            Hello, {user?.full_name || 'Rohan'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Monitoring healthcare wellbeing for your mother, <strong>Margaret Sharma</strong>.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-2xl text-xs font-bold text-emerald-800">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>Care Network Active & Synchronized</span>
        </div>
      </div>

      {/* Peace of Mind Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 border border-slate-200 dark:border-navy-700 shadow-sm space-y-2">
          <div className="text-xs uppercase font-bold text-slate-400">Today's Medication Intake</div>
          <div className="text-3xl font-black text-careteal-700 dark:text-careteal-400">
            {takenCount} of {todayDoses.length} Confirmed
          </div>
          <p className="text-xs text-slate-500">
            {todayDoses.filter(d => d.status === 'unconfirmed').length === 0
              ? 'All current doses on schedule or verified.'
              : 'Dose check-in active.'}
          </p>
        </div>

        <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 border border-slate-200 dark:border-navy-700 shadow-sm space-y-2">
          <div className="text-xs uppercase font-bold text-slate-400">14-Day Adherence Health</div>
          <div className="text-3xl font-black text-emerald-600">
            {analytics?.overall_adherence_rate || 88.5}%
          </div>
          <p className="text-xs text-slate-500">
            Consistent morning medication routine maintained.
          </p>
        </div>

        <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 border border-slate-200 dark:border-navy-700 shadow-sm space-y-2">
          <div className="text-xs uppercase font-bold text-slate-400">Next Accompanied Visit</div>
          <div className="text-xl font-bold text-navy-800 dark:text-white truncate">
            {nextAppt ? nextAppt.reason_for_visit : 'None Scheduled'}
          </div>
          <p className="text-xs text-slate-500">
            {nextAppt ? `📅 ${new Date(nextAppt.appointment_date).toLocaleDateString()} (Accompanied by you)` : 'No visits scheduled'}
          </p>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Latest Caregiver Handover Notes */}
        <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-navy-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-navy-800 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-careteal-600" />
              <span>Latest Caregiver Handover Notes</span>
            </h3>
            <span className="text-xs text-slate-400 font-semibold">Shift Notes</span>
          </div>

          {latestLog ? (
            <div className="p-5 rounded-2xl bg-ivory-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 border-b border-slate-200 pb-2">
                <span>By: {latestLog.author_name} (Caregiver)</span>
                <span>{latestLog.shift_type.toUpperCase()} • {latestLog.date}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-bold text-slate-700">
                <div>BP: <span className="text-emerald-700">{latestLog.blood_pressure}</span></div>
                <div>Pulse: <span className="text-emerald-700">{latestLog.heart_rate} bpm</span></div>
                <div>Mood: <span className="capitalize">{latestLog.mood}</span></div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {latestLog.observations}
              </p>
              <div className="text-xs bg-white p-3 rounded-xl border border-slate-200 font-medium text-careteal-900">
                <strong>Next Caregiver Instructions:</strong> {latestLog.handover_notes}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No shift logs available.</p>
          )}
        </div>

        {/* Recent Care Observations Feed */}
        <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-navy-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-navy-800 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-careteal-600" />
              <span>Care Observations</span>
            </h3>
            <span className="text-xs text-slate-400 font-semibold">Vitals & Symptoms</span>
          </div>

          <div className="space-y-3">
            {observations.slice(0, 3).map((obs) => (
              <div key={obs.id} className="p-4 rounded-2xl bg-ivory-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-navy-800 dark:text-white">{obs.title}</h4>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-careteal-100 text-careteal-800">
                    {obs.severity} priority
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{obs.description}</p>
                <div className="text-[10px] text-slate-400 pt-1">
                  Recorded on {new Date(obs.recorded_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
