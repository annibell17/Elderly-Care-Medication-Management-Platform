import React, { useState, useEffect } from 'react';
import {
  Calendar, Plus, Clock, MapPin, User, FileText, CheckCircle2,
  XCircle, Printer, Share2, Shield, AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const AppointmentsPage: React.FC = () => {
  const { t } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [networkMembers, setNetworkMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookModal, setShowBookModal] = useState(false);
  const [activeBriefing, setActiveBriefing] = useState<any | null>(null);

  // New Appointment Form
  const [formData, setFormData] = useState({
    doctor_id: '',
    appointment_date: '',
    duration_minutes: 30,
    location_type: 'in_person',
    location_details: 'Main Clinic, Suite 400',
    reason_for_visit: '',
    notes: '',
    accompanying_caregiver_id: ''
  });

  const fetchData = async () => {
    try {
      const [appts, docs, members] = await Promise.all([
        api.appointments.list(),
        api.appointments.doctors(),
        api.careNetwork.members()
      ]);
      setAppointments(appts);
      setDoctors(docs);
      setNetworkMembers(members);
      if (docs.length > 0 && !formData.doctor_id) {
        setFormData(prev => ({ ...prev, doctor_id: docs[0].id }));
      }
    } catch (err) {
      console.error("Error fetching appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.appointments.create({
        doctor_id: formData.doctor_id,
        appointment_date: new Date(formData.appointment_date).toISOString(),
        duration_minutes: formData.duration_minutes,
        location_type: formData.location_type,
        location_details: formData.location_details,
        reason_for_visit: formData.reason_for_visit,
        notes: formData.notes,
        accompanying_caregiver_id: formData.accompanying_caregiver_id || null
      });
      setShowBookModal(false);
      fetchData();
    } catch (err) {
      console.error("Error booking appointment:", err);
    }
  };

  const handleGenerateBriefing = async (appointmentId: string) => {
    try {
      const briefing = await api.appointments.preBriefing(appointmentId);
      setActiveBriefing(briefing);
    } catch (err) {
      console.error("Error generating briefing:", err);
    }
  };

  const handleToggleShare = async (appointmentId: string, currentShare: boolean) => {
    try {
      await api.appointments.toggleShareBriefing(appointmentId, !currentShare);
      if (activeBriefing && activeBriefing.appointment_id === appointmentId) {
        setActiveBriefing({ ...activeBriefing, share_with_doctor_authorized: !currentShare });
      }
      fetchData();
    } catch (err) {
      console.error("Error toggling share:", err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 border border-ivory-200 dark:border-navy-800 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 text-careteal-700 dark:text-careteal-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" />
            <span>Clinical Continuity & Caregiver Coordination</span>
          </div>
          <h1 className="text-3xl font-extrabold text-navy-800 dark:text-white">
            Doctor Appointments
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Pre-Appointment Briefings, caregiver attendance coordination, and consent-driven clinical sharing.
          </p>
        </div>

        <button
          onClick={() => setShowBookModal(true)}
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-careteal-600 hover:bg-careteal-700 text-white font-bold text-sm shadow-md"
        >
          <Plus className="w-5 h-5" />
          <span>Book Appointment</span>
        </button>
      </div>

      {/* Appointments List */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-navy-800 dark:text-white">
          Scheduled Clinical Visits ({appointments.length})
        </h2>

        {appointments.length === 0 ? (
          <div className="bg-white dark:bg-navy-900 rounded-3xl p-8 text-center text-slate-500 border border-slate-200">
            No upcoming appointments. Book your next visit using the button above.
          </div>
        ) : (
          appointments.map((appt) => {
            const dt = new Date(appt.appointment_date);
            const isCompleted = appt.status === 'completed';
            return (
              <div
                key={appt.id}
                className="bg-white dark:bg-navy-900 rounded-3xl p-6 border border-slate-200 dark:border-navy-700 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-careteal-50 dark:bg-navy-800 text-careteal-700 dark:text-careteal-400 flex flex-col items-center justify-center font-bold border border-careteal-200 dark:border-navy-700 flex-shrink-0">
                    <span className="text-xs uppercase">{dt.toLocaleDateString(undefined, { month: 'short' })}</span>
                    <span className="text-2xl font-black">{dt.getDate()}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-navy-800 dark:text-white">
                        {appt.reason_for_visit}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isCompleted ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {appt.status}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                      👨‍⚕️ <strong>{appt.doctor?.name || 'Physician'}</strong> ({appt.doctor?.specialization || 'General Specialist'})
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <span>⏰ {dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} ({appt.duration_minutes} mins)</span>
                      <span>📍 {appt.location_details || appt.location_type}</span>
                      {appt.accompanying_caregiver_id && (
                        <span className="text-careteal-700 font-semibold bg-careteal-50 px-2 py-0.5 rounded-md">
                          🤝 Accompanied by Caregiver
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pre-Appointment Briefing CTA */}
                <div className="flex items-center gap-3 w-full lg:w-auto">
                  <button
                    onClick={() => handleGenerateBriefing(appt.id)}
                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-ivory-200 dark:bg-navy-800 hover:bg-careteal-50 text-careteal-800 dark:text-careteal-300 font-bold text-sm border border-slate-300 dark:border-navy-600 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Pre-Appointment Briefing</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pre-Appointment Briefing Drawer/Modal */}
      {activeBriefing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-navy-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-navy-700 relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-navy-700 pb-4 mb-6">
              <div>
                <div className="text-xs font-bold text-careteal-700 uppercase tracking-wider">
                  CareCircle Clinical Briefing
                </div>
                <h3 className="text-2xl font-black text-navy-800 dark:text-white">
                  Briefing for {activeBriefing.doctor_name}
                </h3>
                <p className="text-xs text-slate-500">
                  {activeBriefing.doctor_specialization} • Visit on {new Date(activeBriefing.appointment_date).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setActiveBriefing(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-2"
              >
                ✕
              </button>
            </div>

            {/* Content Blocks */}
            <div className="space-y-6 text-sm text-slate-700 dark:text-slate-200">
              {/* Adherence Highlight */}
              <div className="bg-careteal-50 dark:bg-navy-900 p-4 rounded-2xl border border-careteal-200 dark:border-navy-700 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-careteal-800 dark:text-careteal-300 uppercase">
                    14-Day Medication Adherence
                  </div>
                  <div className="text-2xl font-black text-careteal-900 dark:text-white mt-0.5">
                    {activeBriefing.recent_adherence_rate}%
                  </div>
                </div>
                <div className="text-xs text-right text-slate-500">
                  {activeBriefing.recent_missed_or_unconfirmed_doses.length} unconfirmed doses noted
                </div>
              </div>

              {/* Active Medications List */}
              <div>
                <h4 className="font-bold text-navy-800 dark:text-white uppercase text-xs tracking-wider mb-2">
                  Active Medications ({activeBriefing.active_medications.length})
                </h4>
                <div className="space-y-2">
                  {activeBriefing.active_medications.map((m: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-ivory-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-navy-800 dark:text-white">{m.name} ({m.dosage})</div>
                        <div className="text-xs text-slate-500">{m.instructions}</div>
                      </div>
                      <span className="text-xs font-semibold text-careteal-700">{m.purpose}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Patient Prepared Questions */}
              <div>
                <h4 className="font-bold text-navy-800 dark:text-white uppercase text-xs tracking-wider mb-2">
                  Questions Prepared by Margaret:
                </h4>
                <ul className="space-y-1 list-disc list-inside text-sm text-slate-600 dark:text-slate-300 bg-amber-50/50 p-4 rounded-2xl border border-amber-200">
                  {activeBriefing.patient_prepared_questions.map((q: string, idx: number) => (
                    <li key={idx} className="py-0.5">{q}</li>
                  ))}
                </ul>
              </div>

              {/* Consent-driven Doctor Sharing Toggle */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-navy-800 dark:text-white flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span>Authorize Doctor Pre-Briefing Sharing</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Only shared with clinic when authorized by the elderly individual.
                  </div>
                </div>

                <button
                  onClick={() => handleToggleShare(activeBriefing.appointment_id, activeBriefing.share_with_doctor_authorized)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    activeBriefing.share_with_doctor_authorized
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {activeBriefing.share_with_doctor_authorized ? 'Authorized ✓' : 'Keep Private'}
                </button>
              </div>

              {/* Print Action */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Briefing</span>
                </button>
                <button
                  onClick={() => setActiveBriefing(null)}
                  className="px-6 py-2.5 rounded-xl bg-careteal-600 text-white font-bold text-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Book Appointment Modal */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-navy-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-navy-700 relative">
            <h3 className="text-2xl font-bold text-navy-800 dark:text-white mb-4">
              Schedule Doctor Visit
            </h3>
            <form onSubmit={handleCreateAppointment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Select Physician</label>
                <select
                  value={formData.doctor_id}
                  onChange={e => setFormData({ ...formData, doctor_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                >
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Reason for Visit</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Routine 3-month diabetes follow-up"
                  value={formData.reason_for_visit}
                  onChange={e => setFormData({ ...formData, reason_for_visit: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.appointment_date}
                    onChange={e => setFormData({ ...formData, appointment_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Accompanying Caregiver</label>
                  <select
                    value={formData.accompanying_caregiver_id}
                    onChange={e => setFormData({ ...formData, accompanying_caregiver_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                  >
                    <option value="">None (Independent)</option>
                    {networkMembers.map(m => (
                      <option key={m.id} value={m.user_id}>{m.full_name} ({m.relationship_label})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Clinic Address / Room</label>
                <input
                  type="text"
                  value={formData.location_details}
                  onChange={e => setFormData({ ...formData, location_details: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-careteal-600 hover:bg-careteal-700 text-white font-bold text-sm shadow-md"
                >
                  Confirm Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
