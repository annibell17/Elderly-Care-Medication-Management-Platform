import React, { useState, useEffect } from 'react';
import {
  Activity, FileText, Printer, Download, Clock, ShieldCheck,
  AlertCircle, Heart, User, Sparkles
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const HealthContinuityPage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [report, setReport] = useState<any | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [profData, timeData, repData] = await Promise.all([
        api.health.profile(),
        api.health.timeline(50),
        api.health.summaryReport(30)
      ]);
      setProfile(profData);
      setTimeline(timeData);
      setReport(repData);
    } catch (err) {
      console.error("Error fetching health continuity:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 border border-ivory-200 dark:border-navy-800 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 text-careteal-700 dark:text-careteal-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4" />
            <span>Central Healthcare Record & Chronological Continuity</span>
          </div>
          <h1 className="text-3xl font-extrabold text-navy-800 dark:text-white">
            My Health & Continuity Records
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Permanent, consent-driven record of allergies, vital observations, clinical events, and exportable health summaries.
          </p>
        </div>

        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-careteal-600 hover:bg-careteal-700 text-white font-bold text-sm shadow-md"
        >
          <FileText className="w-5 h-5" />
          <span>Generate Health Report</span>
        </button>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-navy-700 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-navy-800 pb-4">
          <h2 className="text-xl font-bold text-navy-800 dark:text-white flex items-center gap-2">
            <User className="w-5 h-5 text-careteal-600" />
            <span>Patient Healthcare Profile</span>
          </h2>
          <span className="text-xs font-semibold text-slate-400">
            Primary Decision Maker: {user?.full_name}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
          <div className="p-4 rounded-2xl bg-ivory-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700">
            <div className="text-xs font-bold text-slate-400 uppercase">Blood Group</div>
            <div className="text-xl font-black text-rose-600 mt-1">{profile?.blood_type || 'B+'}</div>
          </div>
          <div className="p-4 rounded-2xl bg-ivory-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700">
            <div className="text-xs font-bold text-slate-400 uppercase">Emergency Contact</div>
            <div className="font-bold text-navy-800 dark:text-white mt-1">{profile?.emergency_contact_name || 'Rohan Sharma'}</div>
            <div className="text-xs text-slate-500">{profile?.emergency_contact_phone || '+1-555-0103'} ({profile?.emergency_contact_relation || 'Son'})</div>
          </div>
          <div className="p-4 rounded-2xl bg-ivory-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700">
            <div className="text-xs font-bold text-slate-400 uppercase">Documented Allergies</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {(profile?.allergies || ['Penicillin', 'Sulfa drugs']).map((a: string, idx: number) => (
                <span key={idx} className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-xs font-bold">
                  {a}
                </span>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-ivory-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700">
            <div className="text-xs font-bold text-slate-400 uppercase">Chronic Conditions</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {(profile?.chronic_conditions || ['Type 2 Diabetes', 'Hypertension']).map((c: string, idx: number) => (
                <span key={idx} className="px-2 py-0.5 rounded-md bg-careteal-100 text-careteal-800 text-xs font-bold">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chronological Healthcare Timeline */}
      <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-navy-700 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-navy-800 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-careteal-600" />
            <span>Chronological Care Timeline ({timeline.length} events)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Consolidated history of prescriptions, appointments, shift handovers, and caregiver observations.
          </p>
        </div>

        <div className="relative border-l-2 border-careteal-200 dark:border-navy-700 ml-4 pl-6 space-y-8">
          {timeline.map((item, index) => {
            const dt = new Date(item.timestamp);
            return (
              <div key={index} className="relative group">
                {/* Dot */}
                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-white dark:bg-navy-900 border-4 border-careteal-600" />

                <div className="p-5 rounded-2xl bg-ivory-50/70 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 space-y-2 hover:border-careteal-300 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] uppercase font-bold bg-careteal-100 text-careteal-800">
                        {item.category}
                      </span>
                      <h4 className="font-bold text-base text-navy-800 dark:text-white">
                        {item.title}
                      </h4>
                    </div>
                    <span className="text-xs text-slate-400">
                      {dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Downloadable Health Report Modal (Formatted with Print Styles) */}
      {showReportModal && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-navy-800 rounded-3xl max-w-3xl w-full p-6 sm:p-10 shadow-2xl border border-slate-200 dark:border-navy-700 relative max-h-[92vh] overflow-y-auto">
            {/* Report Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
              <div>
                <div className="text-xs font-bold text-careteal-700 uppercase tracking-widest">
                  CareCircle Healthcare Report
                </div>
                <h3 className="text-2xl font-black text-navy-800 dark:text-white">
                  Health Continuity Summary
                </h3>
                <p className="text-xs text-slate-400">
                  Report ID: {report.report_id} • Generated: {report.generated_at}
                </p>
              </div>

              <div className="flex items-center gap-2 no-print">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-careteal-600 text-white font-bold text-xs shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / PDF</span>
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="space-y-6 text-sm text-slate-700 dark:text-slate-200">
              {/* Patient Block */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div><strong>Patient:</strong> {report.patient.full_name}</div>
                <div><strong>DOB:</strong> {report.patient.date_of_birth}</div>
                <div><strong>Blood Group:</strong> {report.patient.blood_type}</div>
                <div><strong>Allergies:</strong> {report.patient.allergies.join(', ') || 'None'}</div>
              </div>

              {/* 30-Day Adherence */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-2">
                <h4 className="font-bold text-navy-800 uppercase text-xs">Adherence Evaluation</h4>
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-xs text-slate-500">Overall Rate:</span>
                    <div className="text-2xl font-black text-careteal-700">{report.adherence_summary.overall_adherence_rate}%</div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Confirmed Taken:</span>
                    <div className="text-lg font-bold text-emerald-600">{report.adherence_summary.confirmed_taken} doses</div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Missed / Delayed:</span>
                    <div className="text-lg font-bold text-rose-600">{report.adherence_summary.missed_or_unconfirmed} doses</div>
                  </div>
                </div>
              </div>

              {/* Active Medications */}
              <div className="space-y-2">
                <h4 className="font-bold text-navy-800 uppercase text-xs">Active Medication Regimen</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase">
                      <tr>
                        <th className="p-3">Medication</th>
                        <th className="p-3">Dosage</th>
                        <th className="p-3">Purpose</th>
                        <th className="p-3">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {report.medication_continuity.active_medications.map((m: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-3 font-bold">{m.name}</td>
                          <td className="p-3">{m.dosage}</td>
                          <td className="p-3">{m.purpose}</td>
                          <td className="p-3">{m.instructions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Discontinued Medications History */}
              <div className="space-y-2">
                <h4 className="font-bold text-navy-800 uppercase text-xs">Historical Discontinued Medications</h4>
                <div className="space-y-1 text-xs">
                  {report.medication_continuity.discontinued_medications.map((m: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <strong>{m.name} ({m.dosage})</strong> • Discontinued: {m.discontinued_date} • <em>Reason: {m.reason}</em>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="text-[11px] text-slate-400 text-center border-t border-slate-200 pt-4">
                CareCircle Healthcare Record • Philosophy: Independence first. Assistance when needed. Intervention when necessary.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
