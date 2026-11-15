import React, { useState, useEffect } from 'react';
import {
  TrendingUp, AlertTriangle, Lightbulb, Zap, ShieldAlert,
  CheckCircle2, Clock, Play, RefreshCw, BarChart2, Check
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, LineChart, Line, Legend
} from 'recharts';
import { api } from '../api/client';

export const CareIntelligencePage: React.FC = () => {
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringLoop, setTriggeringLoop] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState('');

  const fetchData = async () => {
    try {
      const [analyticsData, escData] = await Promise.all([
        api.intelligence.analytics(30),
        api.intelligence.escalations()
      ]);
      setAnalytics(analyticsData);
      setEscalations(escData);
    } catch (err) {
      console.error("Error fetching intelligence data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTriggerLoop = async () => {
    setTriggeringLoop(true);
    try {
      const res = await api.intelligence.triggerLoopCycle();
      setTriggerMsg(res.message);
      await fetchData();
      setTimeout(() => setTriggerMsg(''), 5000);
    } catch (err: any) {
      alert("Error triggering care loop: " + err.message);
    } finally {
      setTriggeringLoop(false);
    }
  };

  const handleAcknowledge = async (escId: string) => {
    try {
      await api.intelligence.acknowledgeEscalation(escId, "Acknowledged via Care Intelligence Console");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResolve = async (escId: string) => {
    const notes = prompt("Enter resolution notes (e.g. 'Assisted Margaret with taking dose after dinner'):");
    if (!notes) return;
    try {
      await api.intelligence.resolveEscalation(escId, {
        resolution_notes: notes,
        dose_status: "taken",
        confirmation_method: "caretaker_verified_physical"
      });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const timeOfDayData = analytics?.time_of_day_breakdown ? [
    { name: 'Morning', rate: analytics.time_of_day_breakdown.morning.rate, total: analytics.time_of_day_breakdown.morning.total },
    { name: 'Afternoon', rate: analytics.time_of_day_breakdown.afternoon.rate, total: analytics.time_of_day_breakdown.afternoon.total },
    { name: 'Evening', rate: analytics.time_of_day_breakdown.evening.rate, total: analytics.time_of_day_breakdown.evening.total },
    { name: 'Night', rate: analytics.time_of_day_breakdown.night.rate, total: analytics.time_of_day_breakdown.night.total },
  ] : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 border border-ivory-200 dark:border-navy-800 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 text-careteal-700 dark:text-careteal-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Zap className="w-4 h-4" />
            <span>Analytical Engine & Behavioral Insights</span>
          </div>
          <h1 className="text-3xl font-extrabold text-navy-800 dark:text-white">
            Care Intelligence Engine
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Machine-assisted pattern identification, transparent adherence tracking, and automated multi-stage care escalation.
          </p>
        </div>

        {/* Live Loop Trigger for Hackathon Demo */}
        <button
          onClick={handleTriggerLoop}
          disabled={triggeringLoop}
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-careteal-600 to-navy-900 hover:from-careteal-700 hover:to-navy-800 text-white font-bold text-sm shadow-md transition-all transform hover:scale-105 disabled:opacity-50"
          title="Executes the Care Intelligence Loop immediately to evaluate doses and escalations"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>{triggeringLoop ? 'Evaluating Loop...' : 'Trigger Care Loop Cycle'}</span>
        </button>
      </div>

      {triggerMsg && (
        <div className="p-4 rounded-2xl bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{triggerMsg}</span>
        </div>
      )}

      {/* Analytics Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 border border-slate-200 dark:border-navy-700 shadow-sm">
          <div className="text-xs uppercase font-bold text-slate-400">Overall Adherence</div>
          <div className="text-4xl font-black text-careteal-700 dark:text-careteal-400 mt-2">
            {analytics?.overall_adherence_rate || 0}%
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {analytics?.taken_count || 0} confirmed of {analytics?.total_scheduled_doses || 0} doses
          </div>
        </div>

        <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 border border-slate-200 dark:border-navy-700 shadow-sm">
          <div className="text-xs uppercase font-bold text-slate-400">Morning Confirmation</div>
          <div className="text-4xl font-black text-emerald-600 mt-2">
            {analytics?.time_of_day_breakdown?.morning?.rate || 0}%
          </div>
          <div className="text-xs text-slate-500 mt-1">Highest consistency window</div>
        </div>

        <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 border border-slate-200 dark:border-navy-700 shadow-sm">
          <div className="text-xs uppercase font-bold text-slate-400">Evening Confirmation</div>
          <div className="text-4xl font-black text-amber-500 mt-2">
            {analytics?.time_of_day_breakdown?.evening?.rate || 0}%
          </div>
          <div className="text-xs text-slate-500 mt-1">Identified focus window</div>
        </div>

        <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 border border-slate-200 dark:border-navy-700 shadow-sm">
          <div className="text-xs uppercase font-bold text-slate-400">Active Escalations</div>
          <div className="text-4xl font-black text-rose-600 mt-2">
            {escalations.filter(e => e.status !== 'resolved').length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Care coordination events</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Time of Day Bar Chart */}
        <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-navy-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-navy-800 dark:text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-careteal-600" />
              <span>Adherence by Time-of-Day</span>
            </h3>
            <span className="text-xs text-slate-400 font-semibold">Morning vs Evening</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeOfDayData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                <YAxis unit="%" stroke="#64748B" fontSize={12} domain={[0, 100]} />
                <Tooltip formatter={(value: any) => [`${value}%`, 'Adherence']} />
                <Bar dataKey="rate" fill="#0D9488" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Trend Line Chart */}
        <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-navy-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-navy-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-careteal-600" />
              <span>7-Day Adherence Trend</span>
            </h3>
            <span className="text-xs text-slate-400 font-semibold">Daily Tracking</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.weekly_trend || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="day" stroke="#64748B" fontSize={12} />
                <YAxis unit="%" stroke="#64748B" fontSize={12} domain={[0, 100]} />
                <Tooltip formatter={(value: any) => [`${value}%`, 'Adherence']} />
                <Line type="monotone" dataKey="rate" stroke="#0F766E" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Pattern Identification & Contextual Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Identified Patterns */}
        <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-navy-700 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-navy-800 dark:text-white font-bold text-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>Behavioral Patterns Identified</span>
          </div>

          <div className="space-y-3">
            {(!analytics?.patterns_identified || analytics.patterns_identified.length === 0) ? (
              <p className="text-sm text-slate-500">No adverse adherence patterns detected.</p>
            ) : (
              analytics.patterns_identified.map((pat: any, index: number) => (
                <div
                  key={index}
                  className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-amber-900">{pat.title}</h4>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
                      {pat.severity} priority
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">{pat.description}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Contextual Recommendations */}
        <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-navy-700 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-navy-800 dark:text-white font-bold text-lg">
            <Lightbulb className="w-5 h-5 text-careteal-600" />
            <span>Contextual Recommendations</span>
          </div>

          <div className="space-y-3">
            {analytics?.recommendations?.map((rec: string, index: number) => (
              <div
                key={index}
                className="p-4 rounded-2xl bg-careteal-50/60 border border-careteal-200 flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-careteal-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <p className="text-sm text-careteal-900 leading-relaxed font-medium">
                  {rec}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Escalation Events Feed */}
      <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-navy-700 shadow-sm space-y-6">
        <div>
          <h3 className="text-xl font-bold text-navy-800 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
            <span>Care Coordination & Escalation Queue</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Multi-stage escalation workflow: Stage 1 (Elderly Check-in) → Stage 2 (Caretaker Alerted) → Stage 3 (Family Escalated).
          </p>
        </div>

        <div className="space-y-4">
          {escalations.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-6">
              No active or past escalation events.
            </div>
          ) : (
            escalations.map((esc) => {
              const isResolved = esc.status === 'resolved';
              const isAck = esc.status === 'acknowledged';
              return (
                <div
                  key={esc.id}
                  className={`p-6 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    isResolved
                      ? 'bg-slate-50 border-slate-200 dark:bg-navy-800 dark:border-navy-700'
                      : 'bg-rose-50/60 border-rose-300 dark:bg-navy-900 dark:border-rose-900/40'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                        esc.stage === 3 ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                      }`}>
                        Stage {esc.stage} Escalation
                      </span>
                      <h4 className="font-bold text-base text-navy-800 dark:text-white">
                        {esc.medication_name} ({esc.dosage_strength})
                      </h4>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold uppercase ${
                        isResolved ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {esc.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      Triggered at: {new Date(esc.triggered_at).toLocaleString()} • Scheduled dose time: {new Date(esc.scheduled_time).toLocaleTimeString()}
                    </p>

                    {esc.acknowledged_at && (
                      <p className="text-xs text-careteal-700">
                        ✓ Acknowledged by: <strong>{esc.acknowledged_by_name || 'Caregiver'}</strong> at {new Date(esc.acknowledged_at).toLocaleTimeString()}
                      </p>
                    )}

                    {esc.resolution_notes && (
                      <p className="text-xs text-emerald-700 font-medium">
                        ✓ Resolution Notes: {esc.resolution_notes}
                      </p>
                    )}
                  </div>

                  {/* Caregiver Actions */}
                  {!isResolved && (
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      {!isAck && (
                        <button
                          onClick={() => handleAcknowledge(esc.id)}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm"
                        >
                          Acknowledge
                        </button>
                      )}
                      <button
                        onClick={() => handleResolve(esc.id)}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
                      >
                        Resolve Dose Intake
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
