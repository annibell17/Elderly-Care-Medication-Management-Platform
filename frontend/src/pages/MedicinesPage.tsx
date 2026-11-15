import React, { useState, useEffect } from 'react';
import {
  Pill, Plus, AlertCircle, Clock, CheckCircle2, XCircle,
  Archive, RefreshCw, Sparkles, Filter, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const MedicinesPage: React.FC = () => {
  const { t, currentRole } = useAuth();
  const [medications, setMedications] = useState<any[]>([]);
  const [todayDoses, setTodayDoses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'today' | 'history'>('today');
  const [showAddModal, setShowAddModal] = useState(false);
  const [discontinueTarget, setDiscontinueTarget] = useState<any | null>(null);
  const [discontinueReason, setDiscontinueReason] = useState('');

  // Add Medication Form State
  const [formData, setFormData] = useState({
    name: '',
    generic_name: '',
    dosage_strength: '500mg',
    form: 'tablet',
    color_code: '#0D9488',
    purpose: '',
    instructions: 'Take after meals with water',
    quantity_remaining: 30,
    refill_threshold: 7,
    frequency_type: 'daily',
    scheduled_times: ['08:00']
  });

  const fetchData = async () => {
    try {
      const [allMeds, doses] = await Promise.all([
        api.medications.list(true),
        api.medications.today()
      ]);
      setMedications(allMeds);
      setTodayDoses(doses);
    } catch (err) {
      console.error("Error fetching medications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfirmDose = async (doseId: string, status: string = 'taken') => {
    try {
      await api.medications.confirmDose(doseId, {
        status,
        confirmation_method: currentRole === 'caretaker' ? 'caretaker_verified_physical' : 'self_reported_web',
        notes: `Recorded in Medicines view as ${status}`
      });
      fetchData();
    } catch (err) {
      console.error("Error confirming dose:", err);
    }
  };

  const handleCreateMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.medications.create({
        name: formData.name,
        generic_name: formData.generic_name,
        dosage_strength: formData.dosage_strength,
        form: formData.form,
        color_code: formData.color_code,
        purpose: formData.purpose,
        instructions: formData.instructions,
        quantity_remaining: formData.quantity_remaining,
        refill_threshold: formData.refill_threshold,
        initial_schedule: {
          frequency_type: formData.frequency_type,
          scheduled_times: formData.scheduled_times,
          start_date: new Date().toISOString().split('T')[0],
          days_of_week: [0, 1, 2, 3, 4, 5, 6],
          reminder_minutes_before: 15
        }
      });
      setShowAddModal(false);
      setFormData({
        name: '',
        generic_name: '',
        dosage_strength: '500mg',
        form: 'tablet',
        color_code: '#0D9488',
        purpose: '',
        instructions: 'Take after meals with water',
        quantity_remaining: 30,
        refill_threshold: 7,
        frequency_type: 'daily',
        scheduled_times: ['08:00']
      });
      fetchData();
    } catch (err) {
      console.error("Error creating medication:", err);
    }
  };

  const handleDiscontinue = async () => {
    if (!discontinueTarget || !discontinueReason) return;
    try {
      await api.medications.discontinue(discontinueTarget.id, discontinueReason);
      setDiscontinueTarget(null);
      setDiscontinueReason('');
      fetchData();
    } catch (err) {
      console.error("Error discontinuing medication:", err);
    }
  };

  const activeMeds = medications.filter(m => !m.is_discontinued);
  const discontinuedMeds = medications.filter(m => m.is_discontinued);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-navy-900 rounded-3xl p-6 sm:p-8 border border-ivory-200 dark:border-navy-800 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 text-careteal-700 dark:text-careteal-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Pill className="w-4 h-4" />
            <span>Medication Intelligence System</span>
          </div>
          <h1 className="text-3xl font-extrabold text-navy-800 dark:text-white">
            My Medications & Schedules
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Comprehensive dosage tracking, refill alerts, and preserved historical records.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-careteal-600 hover:bg-careteal-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Medication</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-navy-800 pb-2">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'today'
              ? 'bg-careteal-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-navy-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Today's Doses ({todayDoses.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'active'
              ? 'bg-careteal-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-navy-800'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Active Medications ({activeMeds.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'history'
              ? 'bg-careteal-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-navy-800'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Discontinued History ({discontinuedMeds.length})</span>
        </button>
      </div>

      {/* TAB 1: Today's Doses */}
      {activeTab === 'today' && (
        <div className="space-y-4">
          {todayDoses.map((dose) => {
            const isTaken = dose.status === 'taken';
            return (
              <div
                key={dose.id}
                className="bg-white dark:bg-navy-900 rounded-3xl p-6 border border-slate-200 dark:border-navy-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-4 h-20 rounded-full flex-shrink-0"
                    style={{ backgroundColor: dose.color_code || '#0D9488' }}
                  />
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-navy-800 dark:text-white">
                        {dose.medication_name}
                      </h3>
                      <span className="text-sm font-semibold text-slate-500">
                        {dose.dosage_strength}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">
                      ⏰ {dose.dose_label} • {dose.instructions}
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        isTaken
                          ? 'bg-emerald-100 text-emerald-800'
                          : dose.status === 'unconfirmed'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {dose.status}
                      </span>
                      {dose.confirmation_method && (
                        <span className="text-xs text-slate-400">
                          Confirmed via: <strong>{dose.confirmation_method.replace('_', ' ')}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                  {!isTaken ? (
                    <>
                      <button
                        onClick={() => handleConfirmDose(dose.id, 'taken')}
                        className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-careteal-600 hover:bg-careteal-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>I Took This</span>
                      </button>
                      <button
                        onClick={() => handleConfirmDose(dose.id, 'skipped')}
                        className="px-4 py-3 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-semibold text-sm"
                      >
                        Skip
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-700 font-bold bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Taken & Recorded</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: Active Medications Grid */}
      {activeTab === 'active' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeMeds.map((med) => {
            const isLow = med.quantity_remaining <= med.refill_threshold;
            return (
              <div
                key={med.id}
                className="bg-white dark:bg-navy-900 rounded-3xl p-6 border border-slate-200 dark:border-navy-700 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-navy-800 dark:text-white">
                        {med.name}
                      </h3>
                      <div className="text-xs font-semibold text-slate-400">
                        {med.generic_name || med.form}
                      </div>
                    </div>
                    <span
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: med.color_code }}
                      title="Visual color tag"
                    />
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <div><strong>Dosage:</strong> {med.dosage_strength} ({med.form})</div>
                    <div><strong>Purpose:</strong> {med.purpose || 'Prescription regimen'}</div>
                    <div><strong>Instructions:</strong> {med.instructions}</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-navy-800 space-y-3">
                  {/* Inventory Pill Counter */}
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Remaining Supply:</span>
                    <span className={`font-bold ${isLow ? 'text-rose-600 font-extrabold' : 'text-slate-700 dark:text-slate-300'}`}>
                      {med.quantity_remaining} doses left
                    </span>
                  </div>

                  {isLow && (
                    <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl text-xs font-bold">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>Refill required soon (Threshold: {med.refill_threshold})</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setDiscontinueTarget(med)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline"
                    >
                      Discontinue Regimen...
                    </button>
                    <span className="text-[11px] text-slate-400">
                      Preserved History
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: Discontinued Medications History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {discontinuedMeds.length === 0 ? (
            <div className="bg-white dark:bg-navy-900 rounded-3xl p-8 text-center text-slate-500 border border-slate-200">
              No discontinued medications on record.
            </div>
          ) : (
            discontinuedMeds.map((med) => (
              <div
                key={med.id}
                className="bg-slate-50 dark:bg-navy-900 rounded-3xl p-6 border border-slate-200 dark:border-navy-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 line-through">
                      {med.name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
                      Discontinued
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    <strong>Dosage:</strong> {med.dosage_strength} • <strong>Discontinued Date:</strong> {new Date(med.discontinued_at || med.updated_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-rose-700 dark:text-rose-400 mt-2 font-medium bg-rose-50 dark:bg-navy-800 p-3 rounded-xl border border-rose-200 dark:border-rose-900/40">
                    <strong>Reason on record:</strong> {med.discontinued_reason || 'Doctor recommendation'}
                  </p>
                </div>
                <div className="text-xs text-slate-400">
                  Preserved for Doctor Review
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Medication Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-navy-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-navy-700 relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-navy-800 dark:text-white mb-4">
              Add New Medication
            </h3>
            <form onSubmit={handleCreateMedication} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Medication Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Metformin"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-sm focus:ring-2 focus:ring-careteal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Dosage Strength</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500mg"
                    value={formData.dosage_strength}
                    onChange={e => setFormData({ ...formData, dosage_strength: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Form</label>
                  <select
                    value={formData.form}
                    onChange={e => setFormData({ ...formData, form: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-sm"
                  >
                    <option value="tablet">Tablet</option>
                    <option value="capsule">Capsule</option>
                    <option value="liquid">Liquid Syrup</option>
                    <option value="drops">Drops</option>
                    <option value="inhaler">Inhaler</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Purpose / Condition</label>
                <input
                  type="text"
                  placeholder="e.g. Blood Sugar / Diabetes"
                  value={formData.purpose}
                  onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Special Instructions</label>
                <textarea
                  rows={2}
                  value={formData.instructions}
                  onChange={e => setFormData({ ...formData, instructions: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Quantity (Pills)</label>
                  <input
                    type="number"
                    value={formData.quantity_remaining}
                    onChange={e => setFormData({ ...formData, quantity_remaining: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Refill Alert At</label>
                  <input
                    type="number"
                    value={formData.refill_threshold}
                    onChange={e => setFormData({ ...formData, refill_threshold: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-careteal-600 hover:bg-careteal-700 text-white font-bold text-sm shadow-md"
                >
                  Save Medication
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discontinue Modal */}
      {discontinueTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-navy-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative">
            <h3 className="text-xl font-bold text-navy-800 dark:text-white mb-2">
              Discontinue {discontinueTarget.name}?
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              All historical adherence events will remain permanently preserved in your health continuity record.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Reason for Discontinuation</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Switched to alternative by doctor due to side effects..."
                  value={discontinueReason}
                  onChange={e => setDiscontinueReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-careteal-500"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDiscontinueTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDiscontinue}
                  disabled={!discontinueReason.trim()}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow disabled:opacity-50"
                >
                  Confirm Discontinuation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
