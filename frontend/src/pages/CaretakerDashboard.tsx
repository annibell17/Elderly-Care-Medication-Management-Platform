import React, { useState, useEffect } from 'react';
import {
  ClipboardList, CheckCircle2, Heart, Activity, AlertTriangle,
  Clock, Plus, FileText, ShieldAlert, Sparkles
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const CaretakerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [todayDoses, setTodayDoses] = useState<any[]>([]);
  const [handoverLogs, setHandoverLogs] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);

  // New Handover Log Form State
  const [logForm, setLogForm] = useState({
    shift_type: 'morning',
    date: new Date().toISOString().split('T')[0],
    blood_pressure: '122/80 mmHg',
    heart_rate: 74,
    blood_sugar: 115.0,
    temperature: 98.6,
    mood: 'cheerful',
    appetite: 'good',
    sleep_quality: 'peaceful',
    activities_assisted: ['Morning medication assistance', 'Vitals check', 'Garden walk'],
    observations: 'Patient in cheerful spirits, completed light morning stretch.',
    handover_notes: 'Remind patient to take 8:00 PM Metformin dose with dinner.'
  });

  const fetchData = async () => {
    try {
      const [doses, logs, esc] = await Promise.all([
        api.medications.today(),
        api.careNetwork.handoverLogs(),
        api.intelligence.escalations()
      ]);
      setTodayDoses(doses);
      setHandoverLogs(logs);
      setEscalations(esc);
    } catch (err) {
      console.error("Caretaker fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVerifyDose = async (doseId: string) => {
    try {
      await api.medications.confirmDose(doseId, {
        status: 'taken',
        confirmation_method: 'caretaker_verified_physical',
        notes: `Physically verified and assisted by Caregiver ${user?.full_name}`
      });
      fetchData();
    } catch (err: any) {
      alert("Error confirming dose: " + err.message);
    }
  };

  const handleCreateHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.careNetwork.createHandoverLog(logForm);
      setShowLogModal(false);
      fetchData();
    } catch (err: any) {
      alert("Error saving handover log: " + err.message);
    }
  };

  const handleAcknowledgeAlert = async (escId: string) => {
    try {
      await api.intelligence.acknowledgeEscalation(escId, `Alert acknowledged by caretaker ${user?.full_name}`);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Caretaker Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 border border-ivory-200 dark:border-navy-800 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 text-careteal-700 dark:text-careteal-400 font-bold text-xs uppercase tracking-wider mb-1">
            <ClipboardList className="w-4 h-4" />
            <span>Assigned Caregiver Station</span>
          </div>
          <h1 className="text-3xl font-extrabold text-navy-800 dark:text-white">
            Caretaker Dashboard: {user?.full_name || 'Anita Devi'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Assigned Patient: <strong>Margaret Sharma</strong> (Age 72 • Senior Care Plan)
          </p>
        </div>

        <button
          onClick={() => setShowLogModal(true)}
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-careteal-600 hover:bg-careteal-700 text-white font-bold text-sm shadow-md"
        >
          <Plus className="w-5 h-5" />
          <span>New Shift Handover Log</span>
        </button>
      </div>

      {/* Active Escalation Alerts Assigned to Caretaker */}
      {escalations.filter(e => e.status !== 'resolved').length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-base">
            <ShieldAlert className="w-5 h-5" />
            <span>Pending Care Intervention Required</span>
          </div>
          {escalations.filter(e => e.status !== 'resolved').map(esc => (
            <div key={esc.id} className="bg-white p-4 rounded-2xl border border-rose-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-navy-800">
                  Unconfirmed Dose: {esc.medication_name} ({esc.dosage_strength})
                </div>
                <div className="text-xs text-slate-500">
                  Scheduled time: {new Date(esc.scheduled_time).toLocaleTimeString()} • Stage {esc.stage} Escalation
                </div>
              </div>
              {esc.status !== 'acknowledged' && (
                <button
                  onClick={() => handleAcknowledgeAlert(esc.id)}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
                >
                  Acknowledge Alert
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Today's Medication Assistance Checklist */}
      <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-navy-700 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-navy-800 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-careteal-600" />
            <span>Today's Medication Assistance Schedule</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Record verified physical consumption of medications when assisting Margaret.
          </p>
        </div>

        <div className="space-y-4">
          {todayDoses.map((dose) => {
            const isTaken = dose.status === 'taken';
            return (
              <div
                key={dose.id}
                className="p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-ivory-50/50"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-navy-800 dark:text-white">
                      {dose.medication_name} ({dose.dosage_strength})
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      isTaken ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {dose.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    ⏰ {dose.dose_label} • {dose.instructions}
                  </div>
                </div>

                {!isTaken ? (
                  <button
                    onClick={() => handleVerifyDose(dose.id)}
                    className="px-5 py-2.5 rounded-xl bg-careteal-600 hover:bg-careteal-700 text-white font-bold text-xs flex items-center gap-2 shadow"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify Physical Intake</span>
                  </button>
                ) : (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl">
                    ✓ Verified Consumption
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Shift Handover Logs History */}
      <div className="bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-navy-700 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-navy-800 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-careteal-600" />
            <span>Shift Handover Logs ({handoverLogs.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Communication bridge between visiting caregivers and family members.
          </p>
        </div>

        <div className="space-y-4">
          {handoverLogs.map((log) => (
            <div key={log.id} className="p-6 rounded-2xl bg-ivory-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <span className="text-xs font-bold uppercase text-careteal-700">
                    {log.shift_type} Shift • {log.date}
                  </span>
                  <div className="text-xs text-slate-400">Recorded by: {log.author_name}</div>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span>BP: <strong>{log.blood_pressure || 'N/A'}</strong></span>
                  <span>Pulse: <strong>{log.heart_rate || 'N/A'} bpm</strong></span>
                  <span>Sugar: <strong>{log.blood_sugar || 'N/A'} mg/dL</strong></span>
                </div>
              </div>

              <div className="text-xs text-slate-700 space-y-1">
                <div><strong>Assisted Activities:</strong> {log.activities_assisted?.join(', ')}</div>
                <div><strong>Caregiver Observations:</strong> {log.observations}</div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-careteal-900 font-medium">
                  <strong>Handover Notes for Next Shift:</strong> {log.handover_notes}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Handover Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-navy-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-navy-800 dark:text-white mb-4">
              Record Caregiver Handover Log
            </h3>
            <form onSubmit={handleCreateHandover} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Shift Type</label>
                  <select
                    value={logForm.shift_type}
                    onChange={e => setLogForm({ ...logForm, shift_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="morning">Morning Shift</option>
                    <option value="afternoon">Afternoon Shift</option>
                    <option value="evening">Evening Shift</option>
                    <option value="night">Night Shift</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    value={logForm.date}
                    onChange={e => setLogForm({ ...logForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Blood Pressure</label>
                  <input
                    type="text"
                    value={logForm.blood_pressure}
                    onChange={e => setLogForm({ ...logForm, blood_pressure: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Pulse (bpm)</label>
                  <input
                    type="number"
                    value={logForm.heart_rate}
                    onChange={e => setLogForm({ ...logForm, heart_rate: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Blood Sugar</label>
                  <input
                    type="number"
                    value={logForm.blood_sugar}
                    onChange={e => setLogForm({ ...logForm, blood_sugar: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Care Observations</label>
                <textarea
                  rows={2}
                  value={logForm.observations}
                  onChange={e => setLogForm({ ...logForm, observations: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase mb-1">Handover Notes for Next Shift</label>
                <textarea
                  rows={2}
                  value={logForm.handover_notes}
                  onChange={e => setLogForm({ ...logForm, handover_notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-careteal-600 text-white font-bold"
                >
                  Save Handover
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
